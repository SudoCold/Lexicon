import fs from 'node:fs';
import path from 'node:path';
import { curated } from './curated.mjs';

const dict = path.resolve('node_modules/wordnet-db/dict');
const senseInfo = new Map();
for (const line of fs.readFileSync(path.join(dict,'index.sense'),'utf8').split('\n')) {
  const [sense,offset,rank,count] = line.trim().split(/\s+/);
  if (rank === '1') senseInfo.set(`${sense.split('%')[0]}:${offset}`,Number(count));
}
const names = { n:'noun', v:'verb', a:'adjective', s:'adjective', r:'adverb' };
const categories = {0:'Qualities & character',2:'Expression & manner',4:'Actions & decisions',7:'Qualities & character',9:'Thought & understanding',10:'Communication & ideas',11:'Events & change',12:'Emotions & people',14:'People & society',16:'Purpose & motivation',21:'Ownership & exchange',22:'Processes & change',23:'Quantities & measures',24:'Relations & connections',26:'States & conditions',28:'Time & duration',30:'Change & development',31:'Thought & understanding',32:'Communication & ideas',33:'Competition & action',36:'Creation & expression',37:'Emotions & people',38:'Movement & behavior',39:'Perception & attention',40:'Ownership & exchange',41:'People & society',42:'Being & becoming',44:'Qualities & character'};
const blocked = /\b(vulgar|offensive|derogatory|slur|obscene|genus|genera|species|subfamily|taxonomy|taxonomic|botany|zoology|anatomy|pathology|biochemistry|archaic|obsolete|sexual|genitals|penis|vagina|intercourse|fuck\w*|shit\w*|nigger\w*|cunt\w*)\b/i;
const entries = [];
const allSenses = new Map();
for (const type of ['adj','adv','noun','verb']) {
  for (const line of fs.readFileSync(path.join(dict,`data.${type}`),'utf8').split('\n')) {
    if (!/^\d{8} /.test(line)) continue;
    const [meta,rawGloss] = line.split(' | ');
    const t = meta.split(/\s+/); const count = parseInt(t[3],16); const lemmas=[];
    for(let i=0;i<count;i++) lemmas.push(t[4+i*2].replace(/\([a-z]+\)$/,''));
    const pos=names[t[2]]; const synset=`${pos}:${t[0]}`;
    let cursor=4+count*2; const pointerCount=Number(t[cursor++]); const related=[];
    for(let i=0;i<pointerCount;i++){const rel=t[cursor];if(['!','&','@','~','=','^'].includes(rel))related.push(`${names[t[cursor+2]]}:${t[cursor+1]}`);cursor+=4;}
    const gloss=(rawGloss||'').trim();
    const examples=[...gloss.matchAll(/"([^"]+)"/g)].map(x=>x[1]);
    let definition=gloss.split('; "')[0].replace(/;\s*$/,'').trim();
    if(!definition || definition.length<22 || definition.length>190)continue;
    for(const word of lemmas){
      const key=`${pos}-${word}`;
      if(!allSenses.has(key))allSenses.set(key,new Set());
      allSenses.get(key).add(synset);
    }
    const lex=Number(t[1]);
    if(!(lex in categories)||blocked.test(gloss)||/^\(/.test(definition)||/^(of or relating|relating to|a genus|any of various|a unit of|a member of|a native of)/i.test(definition))continue;
    for(const word of lemmas){
      if(!/^[a-z]{5,17}$/.test(word)||blocked.test(word))continue;
      const tag=senseInfo.get(`${word}:${t[0]}`);
      if(tag===undefined)continue;
      if(new RegExp(`\\b${word}\\b`,'i').test(definition))continue;
      definition=definition[0].toUpperCase()+definition.slice(1);
      if(!/[.!?]$/.test(definition))definition+='.';
      entries.push({id:`${pos}-${word}`,word,pos,definition,example:examples.find(e=>e.toLowerCase().includes(word))||examples[0]||'',tag,lex,synset,related,lemmas,source:'wordnet',category:categories[lex]});
    }
  }
}
const curatedWords=new Set(curated.map(w=>w.word));
const byWord=new Map();
for(const w of entries.filter(w=>!curatedWords.has(w.word)).sort((a,b)=>b.tag-a.tag||a.word.localeCompare(b.word)))if(!byWord.has(w.word))byWord.set(w.word,w);
const unique = [...byWord.values()];
// Keep the more frequently attested first senses, then cap the distribution.
unique.sort((a,b)=>b.tag-a.tag || a.word.length-b.word.length || a.word.localeCompare(b.word));
const selected=unique.slice(0,14000);
selected.forEach((w,i)=>w.level=i<3000?'core':i<8500?'stretch':'deep');
const stop=new Set('a an the to of or and in for by with that is as at on from having being very one someone something not'.split(' '));
const tokens=s=>new Set(s.toLowerCase().match(/[a-z]{3,}/g)?.filter(t=>!stop.has(t))||[]);
selected.forEach(w=>w.tokens=tokens(w.definition));
const grouped=Object.fromEntries(['noun','verb','adjective','adverb'].map(pos=>[pos,selected.filter(w=>w.pos===pos)]));
let seed=1789;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const result=[];
for(const w of selected){
  const pool=grouped[w.pos];
  // Seeded sampling keeps content regeneration reproducible without comparing every pair.
  const sampled=[];const sampledIds=new Set();
  for(let i=0;i<350;i++){
    const o=pool[Math.floor(rand()*pool.length)];
    if(sampledIds.has(o.id)||o.id===w.id||o.synset===w.synset||allSenses.get(w.id)?.has(o.synset)||allSenses.get(o.id)?.has(w.synset)||w.related.includes(o.synset)||o.related.includes(w.synset)||o.lemmas.some(l=>w.lemmas.includes(l)))continue;
    sampledIds.add(o.id);sampled.push(o);
    if(sampled.length===180)break;
  }
  const scored=sampled.map(o=>{const overlap=[...w.tokens].filter(t=>o.tokens.has(t)).length;const similarity=overlap/Math.max(w.tokens.size,o.tokens.size);return {o,similarity,score:(o.lex===w.lex?2:0)+overlap*.45-Math.abs(w.definition.length-o.definition.length)/100};}).filter(x=>x.similarity<.4).sort((a,b)=>b.score-a.score);
  const choices=[];
  for(const {o} of scored){if(!choices.some(c=>c.definition===o.definition||c.synset===o.synset||c.related.includes(o.synset))){choices.push(o);if(choices.length===3)break;}}
  if(choices.length!==3)continue;
  const {tag,lex,synset,related,lemmas,tokens:unused,...entry}=w;
  result.push({...entry,alternatives:choices.map(c=>c.definition)});
}
const words=[...curated,...result].sort((a,b)=>a.word.localeCompare(b.word));
fs.mkdirSync('public/data',{recursive:true});
fs.writeFileSync('public/data/words.json',JSON.stringify(words));
fs.writeFileSync('public/data/manifest.json',JSON.stringify({version:1,total:words.length,curated:curated.length,wordnet:result.length,levels:Object.fromEntries(['core','stretch','deep'].map(l=>[l,words.filter(w=>w.level===l).length])),source:'Princeton WordNet 3.1',built:new Date().toISOString().slice(0,10)},null,2));
const header=fs.readFileSync(path.join(dict,'data.adj'),'utf8').split('\n').filter(l=>/^  \d+ /.test(l)).map(l=>l.replace(/^  \d+ /,'')).join('\n');
fs.writeFileSync('public/data/WORDNET-LICENSE.txt',header+'\n\nSource: https://wordnet.princeton.edu/\nDownloaded via wordnet-db 3.1.14. Lexicon filters entries and prepares multiple-choice alternatives.\n');
console.log(JSON.stringify({total:words.length,curated:curated.length,levels:Object.fromEntries(['core','stretch','deep'].map(l=>[l,words.filter(w=>w.level===l).length]))},null,2));
