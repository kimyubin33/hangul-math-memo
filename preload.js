// 화면 쪽에서 쓸 수 있는 기능만 골라서 열어 줍니다
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('memo', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (patch) => ipcRenderer.send('settings:set', patch),
  copy: (text) => ipcRenderer.send('clipboard:write', text),
  minimize: () => ipcRenderer.send('win:minimize'),
  close: () => ipcRenderer.send('win:close'),
  togglePin: () => ipcRenderer.invoke('win:pin'),
  setOpacity: (v) => ipcRenderer.send('win:opacity', v),
  onFocusInput: (fn) => ipcRenderer.on('focus-input', () => fn()),
  platform: process.platform,
});
