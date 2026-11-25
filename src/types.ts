export type Level = 'all' | 'core' | 'stretch' | 'deep';
export type Outcome = 'correct' | 'incorrect' | 'unknown';
export interface Word { id:string; word:string; pos:string; definition:string; example:string; level:Exclude<Level,'all'>; alternatives:string[]; source:'curated'|'wordnet'; category:string }
export interface WordProgress { seen:number; correct:number; streak:number; lastSeen:number; nextReview:number; lastOutcome:Outcome; lastCorrectDay:string }
export interface Answer {wordId:string; outcome:Outcome; selected:string|null; at:number}
export interface Session {id:string; wordIds:string[]; answers:Answer[]; cursor:number; startedAt:number; mode:'mixed'|'review'; level:Level}
export interface CompletedSession extends Session {finishedAt:number}
export interface Store {version:1; progress:Record<string,WordProgress>; activity:Record<string,{answered:number; correct:number; unknown:number}>; history:CompletedSession[]; bookmarks:string[]; excluded:string[]; settings:{length:number; level:Level; goal:number; theme:'light'|'dark'}; active:Session|null}
export interface DesktopAPI {load:()=>Promise<unknown>; save:(data:Store)=>Promise<void>; exportData:(data:Store)=>Promise<boolean>; importData:()=>Promise<unknown|null>; version:()=>Promise<string>}
declare global {interface Window {lexicon?:DesktopAPI}}
