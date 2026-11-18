const {contextBridge,ipcRenderer}=require('electron');
ipcRenderer.on('bookwiz:native-error',(_event,message)=>window.dispatchEvent(new CustomEvent('bookwiz-native-error',{detail:message})));
ipcRenderer.on('bookwiz:opened-backup',(_event,payload)=>window.dispatchEvent(new CustomEvent('bookwiz-open-backup',{detail:payload})));
ipcRenderer.on('bookwiz:device-command',(_event,payload)=>window.dispatchEvent(new CustomEvent('bookwiz-device-command',{detail:payload})));

contextBridge.exposeInMainWorld('BookWizHost',Object.freeze({platform:process.platform,ready:()=>ipcRenderer.send('bookwiz:ready'),openBackup:()=>ipcRenderer.invoke('bookwiz:open-backup'),setTheme:payload=>ipcRenderer.invoke('bookwiz:theme',payload).catch(()=>false),saveFile:payload=>ipcRenderer.invoke('bookwiz:save-file',payload),printHTML:html=>ipcRenderer.invoke('bookwiz:print',html),latexStatus:()=>ipcRenderer.invoke('bookwiz:latex-status'),compileLaTeX:source=>ipcRenderer.invoke('bookwiz:compile-latex',source),cancelLaTeX:()=>ipcRenderer.invoke('bookwiz:cancel-latex'),localModels:()=>ipcRenderer.invoke('bookwiz:local-models'),localChat:payload=>ipcRenderer.invoke('bookwiz:local-chat',payload)}));
