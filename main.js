// 한글 수식 메모 — Electron 메인 프로세스
const { app, BrowserWindow, ipcMain, clipboard, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const SETTINGS_FILE = () => path.join(app.getPath('userData'), 'settings.json');
const DEFAULTS = { bounds: { width: 380, height: 460 }, pinned: true, opacity: 1, lastInput: '', copyFormat: 'inline' };

function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE(), 'utf8')) };
  } catch {
    return { ...DEFAULTS };
  }
}
let settings;
let saveTimer;
function saveSettings() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(settings, null, 2)); } catch { /* 저장 실패는 무시 */ }
  }, 300);
}

// 저장된 위치가 지금 연결된 모니터 밖이면 버림 (모니터를 뺀 경우 대비)
function visibleBounds(b) {
  if (b.x === undefined || b.y === undefined) return { width: b.width, height: b.height };
  const onScreen = screen.getAllDisplays().some(({ workArea: w }) =>
    b.x + 40 > w.x && b.x < w.x + w.width - 40 && b.y >= w.y - 10 && b.y < w.y + w.height - 40);
  return onScreen ? b : { width: b.width, height: b.height };
}

let win;
function createWindow() {
  win = new BrowserWindow({
    ...visibleBounds(settings.bounds),
    minWidth: 300,
    minHeight: 320,
    frame: false,
    alwaysOnTop: settings.pinned,
    skipTaskbar: false,
    backgroundColor: '#fff6c9',
    title: '한글 수식 메모',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setOpacity(settings.opacity);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));

  const remember = () => { if (!win.isMinimized()) { settings.bounds = win.getBounds(); saveSettings(); } };
  win.on('moved', remember);
  win.on('resized', remember);
  // 외부 링크는 앱 안에서 열지 않음
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
}

// 프로그램을 두 번 실행하면 기존 창을 앞으로
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

  app.whenReady().then(() => {
    settings = loadSettings();
    createWindow();

    // Ctrl+Shift+M (맥은 Cmd+Shift+M): 메모 숨기기/보이기
    globalShortcut.register('CommandOrControl+Shift+M', () => {
      if (!win) return;
      if (win.isVisible() && win.isFocused()) win.hide();
      else { win.show(); win.focus(); win.webContents.send('focus-input'); }
    });
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => app.quit());
}

// ── 화면(렌더러)과 주고받는 요청 ──────────────────────────────
ipcMain.handle('settings:get', () => settings);
ipcMain.on('settings:set', (_e, patch) => { Object.assign(settings, patch); saveSettings(); });
ipcMain.on('clipboard:write', (_e, text) => clipboard.writeText(String(text)));
ipcMain.on('win:minimize', () => win && win.minimize());
ipcMain.on('win:close', () => win && win.close());
ipcMain.handle('win:pin', () => {
  settings.pinned = !settings.pinned;
  win.setAlwaysOnTop(settings.pinned);
  saveSettings();
  return settings.pinned;
});
ipcMain.on('win:opacity', (_e, v) => {
  const value = Math.min(1, Math.max(0.3, Number(v) || 1));
  settings.opacity = value;
  win.setOpacity(value);
  saveSettings();
});
