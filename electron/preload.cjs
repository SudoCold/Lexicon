const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('lexicon',Object.freeze({
  load:()=>ipcRenderer.invoke('progress:load'),
  save:data=>ipcRenderer.invoke('progress:save',data),
  exportData:data=>ipcRenderer.invoke('progress:export',data),
  importData:()=>ipcRenderer.invoke('progress:import'),
  version:()=>ipcRenderer.invoke('app:version')
}));
