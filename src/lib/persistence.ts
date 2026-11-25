import type {Store} from '../types';
import {initialStore} from './learning';
import {validateStore} from '../../shared/schema.mjs';
const KEY='lexicon-progress-v1';
export async function loadStore():Promise<Store>{const raw=window.lexicon?await window.lexicon.load():JSON.parse(localStorage.getItem(KEY)||'null');return raw===null?initialStore():validateStore(raw);}
export async function saveStore(store:Store){validateStore(store);if(window.lexicon)await window.lexicon.save(store);else localStorage.setItem(KEY,JSON.stringify(store));}
export async function exportStore(store:Store){if(window.lexicon)return window.lexicon.exportData(store);const blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`lexicon-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;}
export async function importStore():Promise<Store|null>{
  if(window.lexicon){const data=await window.lexicon.importData();return data===null?null:validateStore(data);}
  return new Promise((resolve,reject)=>{const input=document.createElement('input');input.type='file';input.accept='.json';input.oncancel=()=>resolve(null);input.onchange=async()=>{try{const file=input.files?.[0];if(!file)return resolve(null);if(file.size>16*1024*1024)throw new Error('Please choose a backup smaller than 16 MB.');resolve(validateStore(JSON.parse(await file.text())));}catch(e){reject(e);}};input.click();});
}
