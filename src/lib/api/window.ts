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

export interface WindowApi {
  minimize(): Promise<void>;
  toggleMaximize(): Promise<void>;
  close(): Promise<void>;
}

class TauriWindow implements WindowApi {
  private win: any;

  constructor() {
    // @ts-ignore
    const { getCurrentWindow } = require("@tauri-apps/api/window");
    this.win = getCurrentWindow();
  }

  async minimize(): Promise<void> {
    await this.win.minimize();
  }

  async toggleMaximize(): Promise<void> {
    await this.win.toggleMaximize();
  }

  async close(): Promise<void> {
    await this.win.close();
  }
}

class ElectronWindow implements WindowApi {
  async minimize(): Promise<void> {
    await (window as any).electronAPI.minimize();
  }

  async toggleMaximize(): Promise<void> {
    await (window as any).electronAPI.maximize();
  }

  async close(): Promise<void> {
    await (window as any).electronAPI.close();
  }
}

class DummyWindow implements WindowApi {
  async minimize(): Promise<void> {}
  async toggleMaximize(): Promise<void> {}
  async close(): Promise<void> {}
}

let windowApi: WindowApi | null = null;

export function getWindowApi(): WindowApi {
  if (windowApi) return windowApi;
  
  if (hasTauri) {
    windowApi = new TauriWindow();
  } else if (hasElectron) {
    windowApi = new ElectronWindow();
  } else {
    windowApi = new DummyWindow();
  }
  
  return windowApi;
}
