import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd();
if(!fs.existsSync(path.join(root,'node_modules/electron/dist/electron.exe'))){
  const result=spawnSync(process.execPath,['node_modules/electron/install.js'],{stdio:'inherit',env:{...process.env,electron_config_cache:path.join(root,'.electron-cache')}});
  if(result.status!==0)process.exit(result.status||1);
}
