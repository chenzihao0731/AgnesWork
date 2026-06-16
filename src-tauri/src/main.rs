// Agnes Agent - Tauri 2 Rust 后端
// 提供：API Key 本地混淆存储 + 文件系统工具 + 目录/文件选择对话框
#![windows_subsystem = "windows"]

use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize)]
struct StoredKey {
    obfuscated: String,
}

#[derive(Serialize, Deserialize)]
pub struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
    size: u64,
}

fn app_dir() -> PathBuf {
    if let Some(d) = dirs::data_local_dir() {
        d.join("AgnesAgent")
    } else {
        PathBuf::from("./.agnes")
    }
}

fn key_file() -> PathBuf {
    app_dir().join("api_key.json")
}

fn workspace_file() -> PathBuf {
    app_dir().join("workspace_path.txt")
}

fn xor_rotate(data: &[u8], key: &[u8]) -> Vec<u8> {
    data.iter()
        .enumerate()
        .map(|(i, b)| b ^ key[i % key.len()])
        .collect()
}

#[tauri::command]
fn save_api_key(key: String) -> Result<(), String> {
    let dir = app_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let mut rng = rand::thread_rng();
    let mut nonce = [0u8; 16];
    rng.fill_bytes(&mut nonce);

    let cipher = xor_rotate(key.as_bytes(), &nonce);
    let mut payload = Vec::with_capacity(16 + cipher.len());
    payload.extend_from_slice(&nonce);
    payload.extend(cipher);

    let encoded = base64::Engine::encode(&base64::prelude::BASE64_STANDARD, &payload);
    let stored = StoredKey { obfuscated: encoded };
    let json = serde_json::to_string_pretty(&stored).map_err(|e| e.to_string())?;
    fs::write(key_file(), json).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_api_key() -> Result<String, String> {
    let path = key_file();
    if !path.exists() {
        return Ok(String::new());
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let stored: StoredKey = serde_json::from_str(&raw).map_err(|e| e.to_string())?;
    let bytes = base64::Engine::decode(&base64::prelude::BASE64_STANDARD, stored.obfuscated.as_bytes())
        .map_err(|e| e.to_string())?;
    if bytes.len() < 17 {
        return Err("corrupt file".into());
    }
    let (nonce, cipher) = bytes.split_at(16);
    let plain = xor_rotate(cipher, nonce);
    String::from_utf8(plain).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_api_key() -> Result<(), String> {
    let path = key_file();
    if path.exists() {
        fs::remove_file(&path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn app_data_dir() -> Result<String, String> {
    let dir = app_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

// ============ Workspace ============
// 用户选定的工作目录。Agent 只能在这个目录内操作文件。

#[tauri::command]
fn get_workspace() -> Result<String, String> {
    let path = workspace_file();
    if path.exists() {
        let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        Ok(raw.trim().to_string())
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
fn set_workspace(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        fs::create_dir_all(p).map_err(|e| e.to_string())?;
    }
    let dir = app_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(workspace_file(), p.to_string_lossy().as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

/// 检查路径是否在 workspace 以内，避免越权
fn ensure_inside_workspace(requested: &str) -> Result<PathBuf, String> {
    let ws_raw = get_workspace()?;
    if ws_raw.is_empty() {
        return Err("workspace not set".into());
    }
    let ws = Path::new(&ws_raw).canonicalize().map_err(|e| e.to_string())?;
    let requested_path = if Path::new(requested).is_absolute() {
        PathBuf::from(requested)
    } else {
        ws.join(requested)
    };
    let canon = requested_path.canonicalize().unwrap_or(requested_path.clone());
    if !canon.starts_with(&ws) {
        return Err(format!("path is outside workspace: {}", requested));
    }
    Ok(canon)
}

// ============ 文件对话框 ============

#[tauri::command]
fn pick_file_dialog() -> Result<String, String> {
    // 用原生 dialog 让用户选择文件
    let file = rfd::FileDialog::new()
        .set_title("选择文件")
        .pick_file()
        .ok_or("no file selected".to_string())?;
    Ok(file.to_string_lossy().to_string())
}

#[tauri::command]
fn pick_directory_dialog() -> Result<String, String> {
    let dir = rfd::FileDialog::new()
        .set_title("选择工作目录")
        .pick_folder()
        .ok_or("no directory selected".to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

// ============ 文件操作 ============

#[tauri::command]
fn list_directory(path: Option<String>) -> Result<Vec<DirEntry>, String> {
    let requested = path.unwrap_or_else(|| ".".to_string());
    let target = if requested.trim() == "." || requested.is_empty() {
        // 使用 workspace
        let ws = get_workspace()?;
        if ws.is_empty() { return Err("workspace not set".into()); }
        PathBuf::from(&ws)
    } else {
        ensure_inside_workspace(&requested)?
    };

    let mut entries: Vec<DirEntry> = Vec::new();
    let read = fs::read_dir(&target).map_err(|e| e.to_string())?;
    for item in read {
        let item = item.map_err(|e| e.to_string())?;
        let metadata = item.metadata().map_err(|e| e.to_string())?;
        entries.push(DirEntry {
            name: item.file_name().to_string_lossy().to_string(),
            path: item.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: metadata.len(),
        });
    }
    entries.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then_with(|| a.name.cmp(&b.name))
    });
    Ok(entries)
}

#[tauri::command]
fn read_text_file(path: String, max_bytes: Option<u64>) -> Result<String, String> {
    let target = ensure_inside_workspace(&path)?;
    let content = if let Some(limit) = max_bytes {
        let data = fs::read(&target).map_err(|e| e.to_string())?;
        let take = std::cmp::min(data.len(), limit as usize);
        String::from_utf8_lossy(&data[..take]).to_string()
    } else {
        fs::read_to_string(&target).map_err(|e| e.to_string())?
    };
    Ok(content)
}

#[tauri::command]
fn write_text_file(path: String, content: String) -> Result<String, String> {
    let target = ensure_inside_workspace(&path)?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&target, content).map_err(|e| e.to_string())?;
    Ok(target.to_string_lossy().to_string())
}

#[tauri::command]
fn read_image_as_data_url(path: String) -> Result<String, String> {
    let target = ensure_inside_workspace(&path)?;
    let bytes = fs::read(&target).map_err(|e| e.to_string())?;
    let encoded = base64::Engine::encode(&base64::prelude::BASE64_STANDARD, &bytes);
    // 简单通过后缀判断 MIME
    let extension = target
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("png")
        .to_ascii_lowercase();
    let mime = match extension.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        _ => "image/png",
    };
    Ok(format!("data:{};base64,{}", mime, encoded))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            save_api_key,
            load_api_key,
            clear_api_key,
            app_data_dir,
            get_workspace,
            set_workspace,
            pick_file_dialog,
            pick_directory_dialog,
            list_directory,
            read_text_file,
            write_text_file,
            read_image_as_data_url,
        ])
        .setup(|_app| {
            let dir = app_dir();
            let _ = fs::create_dir_all(&dir);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Agnes Agent");
}
