const levels=['all','core','stretch','deep'];
const outcomes=['correct','incorrect','unknown'];
const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&Object.getPrototypeOf(o)===Object.prototype;
const number=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const integer=n=>number(n)&&Number.isSafeInteger(n);
const id=s=>typeof s==='string'&&/^(noun|verb|adjective|adverb)-[a-z-]{2,40}$/.test(s);
const day=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s));
const list=(xs,max,test)=>Array.isArray(xs)&&xs.length<=max&&xs.every(test);
const answer=a=>plain(a)&&id(a.wordId)&&outcomes.includes(a.outcome)&&number(a.at)&&(a.selected===null||typeof a.selected==='string'&&a.selected.length<=500)&&(a.outcome==='unknown'?a.selected===null:a.selected!==null);
function session(s,completed=false){return plain(s)&&typeof s.id==='string'&&s.id.length<=100&&list(s.wordIds,50,id)&&s.wordIds.length>0&&new Set(s.wordIds).size===s.wordIds.length&&integer(s.cursor)&&s.cursor<s.wordIds.length&&list(s.answers,50,answer)&&s.answers.length>=s.cursor&&s.answers.length<=s.cursor+1&&s.answers.every((a,i)=>a.wordId===s.wordIds[i])&&number(s.startedAt)&&['mixed','review'].includes(s.mode)&&levels.includes(s.level)&&(!completed||number(s.finishedAt)&&s.answers.length===s.wordIds.length&&s.cursor===s.wordIds.length-1);}
export function validateStore(s){
  if(!plain(s)||s.version!==1)throw new Error('This is not a supported Lexicon backup (version 1).');
  if(!plain(s.settings)||![10,15,20].includes(s.settings.length)||![5,10,15,20,30].includes(s.settings.goal)||!levels.includes(s.settings.level)||!['light','dark'].includes(s.settings.theme))throw new Error('The backup contains invalid settings.');
  if(!plain(s.progress)||Object.keys(s.progress).length>50000||!Object.entries(s.progress).every(([k,p])=>id(k)&&plain(p)&&integer(p.seen)&&integer(p.correct)&&p.correct<=p.seen&&integer(p.streak)&&p.streak<=p.correct&&number(p.lastSeen)&&number(p.nextReview)&&outcomes.includes(p.lastOutcome)&&(p.lastCorrectDay===''||day(p.lastCorrectDay))))throw new Error('The backup contains invalid word progress.');
  if(!plain(s.activity)||Object.keys(s.activity).length>10000||!Object.entries(s.activity).every(([k,a])=>day(k)&&plain(a)&&integer(a.answered)&&integer(a.correct)&&integer(a.unknown)&&a.correct+a.unknown<=a.answered))throw new Error('The backup contains invalid activity.');
  if(!list(s.bookmarks,50000,id)||!list(s.excluded,50000,id)||!list(s.history,365,h=>session(h,true))||!(s.active===null||session(s.active)))throw new Error('The backup contains invalid session data.');
  // Construct an allowlisted object so imported keys never become application settings.
  return {version:1,settings:{length:s.settings.length,level:s.settings.level,goal:s.settings.goal,theme:s.settings.theme},progress:s.progress,activity:s.activity,bookmarks:[...new Set(s.bookmarks)],excluded:[...new Set(s.excluded)],history:s.history,active:s.active};
}
