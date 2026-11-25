const {app,BrowserWindow,ipcMain,dialog,session}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const {DatabaseSync}=require('node:sqlite');
const {pathToFileURL}=require('node:url');
if(process.env.LEXICON_USER_DATA)app.setPath('userData',path.resolve(process.env.LEXICON_USER_DATA));
let win,db;
const gotLock=app.requestSingleInstanceLock();
if(!gotLock)app.quit();
else {
  app.on('second-instance',()=>{if(win){if(win.isMinimized())win.restore();win.focus();}});
  app.whenReady().then(async()=>{
    const {validateStore}=await import(pathToFileURL(path.join(__dirname,'../shared/schema.mjs')).href);
    await fs.mkdir(app.getPath('userData'),{recursive:true});
    db=new DatabaseSync(path.join(app.getPath('userData'),'lexicon.sqlite'));
    db.exec('PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK (id = 1), value TEXT NOT NULL)');
    function trusted(event){if(!win||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw new Error('Untrusted request.');}
    function checked(data){const text=JSON.stringify(data);if(Buffer.byteLength(text)>16*1024*1024)throw new Error('Progress is larger than 16 MB.');return validateStore(data);}
    ipcMain.handle('progress:load',event=>{trusted(event);const row=db.prepare('SELECT value FROM app_state WHERE id=1').get();return row?checked(JSON.parse(row.value)):null;});
    ipcMain.handle('progress:save',(event,data)=>{trusted(event);db.prepare('INSERT INTO app_state(id,value) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value').run(JSON.stringify(checked(data)));});
    ipcMain.handle('progress:export',async(event,data)=>{trusted(event);const valid=checked(data);const result=await dialog.showSaveDialog(win,{title:'Export your Lexicon progress',defaultPath:`lexicon-backup-${new Date().toISOString().slice(0,10)}.json`,filters:[{name:'Lexicon backup',extensions:['json']}]});if(result.canceled)return false;await fs.writeFile(result.filePath,JSON.stringify(valid,null,2),'utf8');return true;});
    ipcMain.handle('progress:import',async event=>{trusted(event);const result=await dialog.showOpenDialog(win,{title:'Import a Lexicon backup',properties:['openFile'],filters:[{name:'Lexicon backup',extensions:['json']}]});if(result.canceled)return null;const file=result.filePaths[0];if((await fs.stat(file)).size>16*1024*1024)throw new Error('Backup must be smaller than 16 MB.');return checked(JSON.parse(await fs.readFile(file,'utf8')));});
    ipcMain.handle('app:version',event=>{trusted(event);return app.getVersion();});
    session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
    win=new BrowserWindow({width:1440,height:1000,minWidth:960,minHeight:720,backgroundColor:'#f8f7f4',title:'Lexicon',icon:path.join(__dirname,'../dist/icon.png'),autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
    win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    win.webContents.on('will-navigate',event=>event.preventDefault());
    await win.loadFile(path.join(__dirname,'../dist/index.html'));
    app.on('activate',()=>{if(win)win.show();});
  }).catch(error=>{console.error('Lexicon startup failed:',error);if(!process.env.LEXICON_TEST)dialog.showErrorBox('Lexicon could not start',error.message);app.exit(1);});
  app.on('window-all-closed',()=>app.quit());
  app.on('will-quit',()=>db?.close());
}
