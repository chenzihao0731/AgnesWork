// 文件系统 API：封装对 Tauri Rust 后端的 invoke 调用。
// 同时做了 browser fallback（当不在 Tauri 环境时用内存虚拟文件系统），
// 方便在 `npm run dev` 的纯浏览器模式里调试界面。

let hasTauri = false;
let hasElectron = false;
try {
  hasTauri =
    typeof window !== "undefined" &&
    !!(window as any).__TAURI_INTERNALS__;
} catch {
  // ignore
}
try {
  hasElectron =
    typeof window !== "undefined" &&
    !!(window as any).electronAPI;
} catch {
  // ignore
}

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

// --------- in-memory fallback (pure browser mode) ---------
type InMem =
  | { kind: "dir" }
  | { kind: "file"; content: string };

let inMem: Record<string, InMem> = {};
let inMemWorkspace = "/virtual-workspace";

function inMemInit() {
  if (Object.keys(inMem).length > 0) return;
  inMem[inMemWorkspace] = { kind: "dir" };
  inMem[inMemWorkspace + "/notes.txt"] = {
    kind: "file",
    content: "Hello from virtual workspace!\n你可以在这里测试 read_text_file 工具。",
  };
  inMem[inMemWorkspace + "/todo.md"] = {
    kind: "file",
    content: "# TODO\n- [x] 测试多会话\n- [ ] 测试文件工具",
  };
}

function inMemResolve(path: string): string {
  if (path.startsWith("/")) return path;
  return inMemWorkspace + "/" + path;
}

function inMemList(path: string): DirEntry[] {
  inMemInit();
  const prefix =
    !path || path === "."
      ? inMemWorkspace
      : inMemResolve(path);
  const entries: DirEntry[] = [];
  const prefixWithSep = prefix + "/";
  for (const key of Object.keys(inMem)) {
    if (key === prefix) continue;
    if (!key.startsWith(prefixWithSep)) continue;
    const rest = key.slice(prefixWithSep.length);
    if (rest.includes("/")) continue; // 不是直接子项
    const v = inMem[key];
    entries.push({
      name: rest,
      path: key,
      is_dir: v.kind === "dir",
      size: v.kind === "file" ? v.content.length : 0,
    });
  }
  entries.sort((a, b) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return entries;
}

// --------- invoke wrapper ---------
// 延迟加载 invoke——这样在纯浏览器环境不会因为加载 tauri 而报错
async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  // @ts-ignore dynamic import
  const mod = await import("@tauri-apps/api/core");
  return (mod.invoke as (c: string, a?: Record<string, unknown>) => Promise<T>)(cmd, args);
}

export async function getWorkspace(): Promise<string> {
  if (!hasTauri && !hasElectron) {
    inMemInit();
    return inMemWorkspace;
  }
  if (hasElectron) {
    return "";
  }
  return tauriInvoke<string>("get_workspace");
}

export async function setWorkspace(path: string): Promise<void> {
  if (!hasTauri && !hasElectron) {
    inMemWorkspace = path;
    inMem[path] = { kind: "dir" };
    return;
  }
  if (hasElectron) {
    return;
  }
  return tauriInvoke("set_workspace", { path });
}

export async function pickFileDialog(): Promise<string> {
  if (!hasTauri && !hasElectron) throw new Error("浏览器模式中无法打开系统文件对话框");
  if (hasElectron) {
    const result = await (window as any).electronAPI.openFile();
    if (!result) throw new Error("未选择文件");
    return result;
  }
  return tauriInvoke<string>("pick_file_dialog");
}

export async function pickDirectoryDialog(): Promise<string> {
  if (!hasTauri && !hasElectron) throw new Error("浏览器模式中无法打开系统目录对话框");
  if (hasElectron) {
    const result = await (window as any).electronAPI.openDirectory();
    if (!result) throw new Error("未选择目录");
    return result;
  }
  return tauriInvoke<string>("pick_directory_dialog");
}

export async function listDirectory(path?: string): Promise<DirEntry[]> {
  if (!hasTauri && !hasElectron) return inMemList(path || "");
  if (hasElectron) {
    const result = await (window as any).electronAPI.listDir(path || "");
    return result;
  }
  return tauriInvoke<DirEntry[]>("list_directory", { path });
}

export async function readTextFile(path: string, maxBytes?: number): Promise<string> {
  if (!hasTauri && !hasElectron) {
    inMemInit();
    const full = inMemResolve(path);
    const v = inMem[full];
    if (!v || v.kind !== "file") throw new Error("文件不存在: " + path);
    const text = v.content;
    return maxBytes != null ? text.slice(0, maxBytes) : text;
  }
  if (hasElectron) {
    const text = await (window as any).electronAPI.readFile(path);
    return maxBytes != null ? text.slice(0, maxBytes) : text;
  }
  return tauriInvoke<string>("read_text_file", { path, maxBytes });
}

export async function writeTextFile(path: string, content: string): Promise<string> {
  if (!hasTauri && !hasElectron) {
    inMemInit();
    const full = inMemResolve(path);
    inMem[full] = { kind: "file", content };
    return full;
  }
  if (hasElectron) {
    const result = await (window as any).electronAPI.writeFile(path, content);
    return result;
  }
  return tauriInvoke<string>("write_text_file", { path, content });
}

export async function readImageAsDataUrl(path: string): Promise<string> {
  if (!hasTauri && !hasElectron) throw new Error("浏览器模式中无法读取本地图片");
  if (hasElectron) {
    throw new Error("Electron 模式中暂不支持读取图片");
  }
  return tauriInvoke<string>("read_image_as_data_url", { path });
}

export function isDesktopEnv(): boolean {
  return hasTauri || hasElectron;
}
