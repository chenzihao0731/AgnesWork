const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let appRoot;

function findAppRoot() {
  const exePath = process.execPath;
  const exeDir = path.dirname(exePath);
  
  if (fs.existsSync(path.join(exeDir, 'resources', 'app', 'package.json'))) {
    return exeDir;
  }
  
  if (fs.existsSync(path.join(exeDir, '..', 'resources', 'app', 'package.json'))) {
    return path.join(exeDir, '..');
  }
  
  if (fs.existsSync(path.join(__dirname, '..', 'dist', 'index.html'))) {
    return path.join(__dirname, '..');
  }
  
  return path.join(__dirname, '..');
}

function getResourcePath(relativePath) {
  return path.join(appRoot, 'resources', 'app', relativePath);
}

function createWindow() {
  appRoot = findAppRoot();
  
  const iconPath = getResourcePath('icons/icon.png');
  
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 720,
    minHeight: 520,
    frame: false,
    transparent: true,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: getResourcePath('preload.cjs'),
    },
  });

  mainWindow.loadFile(getResourcePath('index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.handle('win:minimize', () => mainWindow?.minimize());
ipcMain.handle('win:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('win:close', () => mainWindow?.close());

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:openDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('fs:readFile', async (_, filePath) => {
  return fs.readFileSync(filePath, 'utf-8');
});

ipcMain.handle('fs:writeFile', async (_, filePath, content) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
});

ipcMain.handle('fs:listDir', async (_, dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.map(e => ({
    name: e.name,
    path: path.join(dirPath, e.name),
    is_dir: e.isDirectory(),
    size: e.isFile() ? fs.statSync(path.join(dirPath, e.name)).size : 0,
  }));
});
