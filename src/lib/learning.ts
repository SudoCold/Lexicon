import type { Word, Store, Outcome, Session, Level, Answer } from '../types';

export const DAY = 86400000;
export function dateKey(time=Date.now()):string {const d=new Date(time);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function initialStore():Store {return {version:1,progress:{},activity:{},history:[],bookmarks:[],excluded:[],settings:{length:10,level:'stretch',goal:10,theme:'light'},active:null};}
export function status(p?:Store['progress'][string]) {return !p?'new':p.streak>=3?'recognized':'learning';}
export function dueWords(words:Word[],store:Store,now=Date.now(),level:Level='all') {return words.filter(w=>!store.excluded.includes(w.id)&&(level==='all'||w.level===level)&&store.progress[w.id]&&store.progress[w.id].nextReview<=now);}
export function shuffle<T>(list:T[],random= Math.random):T[]{const copy=[...list];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
export function createSession(words:Word[],store:Store,mode:'mixed'|'review'='mixed',now=Date.now(),random=Math.random):Session|null {
  const pool=words.filter(w=>!store.excluded.includes(w.id)&&(store.settings.level==='all'||w.level===store.settings.level));
  const due=shuffle(dueWords(pool,store,now),random).sort((a,b)=>store.progress[a.id].nextReview-store.progress[b.id].nextReview);
  const newWords=shuffle(pool.filter(w=>!store.progress[w.id]),random);
  // Editorial entries introduce the experience; the rest of the bank follows naturally.
  const fresh=[...newWords.filter(w=>w.source==='curated'),...newWords.filter(w=>w.source!=='curated')];
  const count=store.settings.length;
  let chosen:Word[];
  if(mode==='review')chosen=due.slice(0,count);
  else {
    const reviews=due.slice(0,Math.ceil(count*.4));
    chosen=[...reviews,...fresh.slice(0,count-reviews.length)];
    if(chosen.length<count)chosen.push(...due.slice(reviews.length,count-chosen.length+reviews.length));
    if(chosen.length<count)chosen.push(...shuffle(pool.filter(w=>!chosen.some(c=>c.id===w.id)),random).slice(0,count-chosen.length));
    chosen=shuffle(chosen,random);
  }
  if(!chosen.length)return null;
  return {id:crypto.randomUUID(),wordIds:chosen.map(w=>w.id),answers:[],cursor:0,startedAt:now,mode,level:store.settings.level};
}
export function recordAnswer(store:Store,word:Word,selected:string|null,now=Date.now()):Store {
  const session=store.active;
  if(!session||session.wordIds[session.cursor]!==word.id||session.answers.some(a=>a.wordId===word.id))return store;
  const outcome:Outcome=selected===null?'unknown':selected===word.definition?'correct':'incorrect';
  if(selected!==null&&![word.definition,...word.alternatives].includes(selected))return store;
  const old=store.progress[word.id];const day=dateKey(now);
  const streak=outcome==='correct'?(old?.lastCorrectDay===day?Math.max(1,old.streak):(old?.streak||0)+1):0;
  const interval=outcome==='correct'?[1,3,7,14,30,60,120][Math.min(streak-1,6)]*DAY:outcome==='unknown'?5*60000:10*60000;
  const previous=store.activity[day]||{answered:0,correct:0,unknown:0};
  const answer:Answer={wordId:word.id,outcome,selected,at:now};
  return {...store,progress:{...store.progress,[word.id]:{seen:(old?.seen||0)+1,correct:(old?.correct||0)+(outcome==='correct'?1:0),streak,lastSeen:now,nextReview:now+interval,lastOutcome:outcome,lastCorrectDay:outcome==='correct'?day:old?.lastCorrectDay||''}},activity:{...store.activity,[day]:{answered:previous.answered+1,correct:previous.correct+(outcome==='correct'?1:0),unknown:previous.unknown+(outcome==='unknown'?1:0)}},active:{...session,answers:[...session.answers,answer]}};
}
export function advanceSession(store:Store,now=Date.now()):Store {
  const s=store.active;if(!s||!s.answers.some(a=>a.wordId===s.wordIds[s.cursor]))return store;
  if(s.cursor+1<s.wordIds.length)return {...store,active:{...s,cursor:s.cursor+1}};
  return {...store,active:null,history:[{...s,finishedAt:now},...store.history].slice(0,365)};
}
export function streakDays(store:Store,now=Date.now()):number {
  const d=new Date(now);let total=0;
  if(!store.activity[dateKey(d.getTime())]?.answered)d.setDate(d.getDate()-1);
  for(let i=0;i<366;i++){if(!store.activity[dateKey(d.getTime())]?.answered)break;total++;d.setDate(d.getDate()-1);}
  return total;
}
export function dailyWord(words:Word[],now=Date.now()):Word {const list=words.filter(w=>w.source==='curated');let n=0;for(const c of dateKey(now))n=(n*31+c.charCodeAt(0))>>>0;return list[n%list.length]||words[0];}
export function optionsFor(word:Word,sessionId:string):string[]{let seed=0;for(const c of word.id+sessionId)seed=(seed*31+c.charCodeAt(0))>>>0;return shuffle([word.definition,...word.alternatives],()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;});}
