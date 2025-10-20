import fs from 'fs';
import readline from 'readline';

const AIM_PATH = './utils/AIMoodPredictor.js';
const PILOT = './tools/pilot_labeled_dataset.jsonl';
const OUT = './tools/synthetic_full_moods_1000.jsonl';
const TARGET = 1000;

function randInt(n){ return Math.floor(Math.random()*n); }

// Simple robust augmentations (mix of earlier strategies)
function randomSwapWords(s){
  const words = s.split(/(\s+)/).filter(Boolean);
  if(words.length<3) return s;
  const i = randInt(words.length-1);
  const j = Math.min(words.length-1, i+1);
  const tmp = words[i]; words[i]=words[j]; words[j]=tmp;
  return words.join(' ');
}

function injectTypos(s){
  if(s.length<4) return s;
  const i = randInt(s.length-1);
  if(Math.random()<0.5){ return s.slice(0,i)+s.slice(i+1); }
  const j = Math.min(s.length-1, i+1);
  const arr = s.split(''); const tmp = arr[i]; arr[i]=arr[j]; arr[j]=tmp; return arr.join('');
}

function paraphrase(s){
  const patterns = [
    t=> t.replace(/çok/g,'fazla'),
    t=> t.replace(/biraz/g,'az biraz'),
    t=> t.replace(/süper|harika/g,'mükemmel'),
    t=> t
  ];
  return patterns[randInt(patterns.length)](s);
}

function augmentText(text){
  const variants = new Set();
  if(!text || !text.trim()) text = 'bugün kendimi farklı hissediyorum';
  variants.add(text);
  variants.add(text.replace(/\./g,'...'));
  variants.add(randomSwapWords(text));
  variants.add(injectTypos(text));
  if(Math.random()<0.3) variants.add(text + ' değil');
  variants.add(paraphrase(text));
  const eng = ['so tired','not great','very happy','kinda sad','super excited'];
  variants.add(text + ' ' + eng[randInt(eng.length)]);
  variants.add(text + (Math.random()<0.5 ? '!!!' : '?!!') + ' 😅');
  if(text.length>40) variants.add(text.slice(0,20));
  variants.add(text + ' ' + text.split(' ').slice(0,2).join(' '));
  return Array.from(variants).map(s=>s.trim()).filter(Boolean);
}

function extractMoods(fileContent){
  const start = fileContent.indexOf('export const EXTENDED_MOODS');
  if(start<0) return [];
  const arrStart = fileContent.indexOf('[', start);
  const arrEnd = fileContent.indexOf('];', arrStart);
  if(arrStart<0 || arrEnd<0) return [];
  const block = fileContent.slice(arrStart, arrEnd);
  const keyRegex = /key:\s*"([a-zA-Z0-9_\-]+)"/g;
  const keys = [];
  let m;
  while((m = keyRegex.exec(block)) !== null){ keys.push(m[1]); }
  return keys;
}

async function run(){
  if(!fs.existsSync(AIM_PATH)){ console.error('AIMoodPredictor not found:', AIM_PATH); process.exit(1); }
  const aim = fs.readFileSync(AIM_PATH,'utf8');
  const moods = extractMoods(aim);
  if(moods.length===0){ console.error('No moods found'); process.exit(1); }
  console.log('Found moods:', moods.join(', '));

  if(!fs.existsSync(PILOT)){ console.error('Pilot dataset not found:', PILOT); process.exit(1); }
  const rl = readline.createInterface({ input: fs.createReadStream(PILOT), crlfDelay: Infinity });
  const templates = [];
  for await (const line of rl){ if(!line.trim()) continue; try{ const j=JSON.parse(line); templates.push(j.text||j.content||j.entry||''); } catch(e){} }
  if(templates.length===0) templates.push('Bugün kendimi farklı hissediyorum');

  const per = Math.floor(TARGET / moods.length);
  const remainder = TARGET - per * moods.length;
  const out = fs.createWriteStream(OUT,{flags:'w'});
  let produced = 0;
  for(let i=0;i<moods.length;i++){
    const mood = moods[i];
    const want = per + (i<remainder?1:0);
    for(let k=0;k<want;k++){
      const base = templates[randInt(templates.length)];
      const augVariants = augmentText(base);
      const t = augVariants[randInt(augVariants.length)];
      const id = `full_${String(produced+1).padStart(4,'0')}`;
      out.write(JSON.stringify({id,text:t,label:mood})+'\n');
      produced++;
    }
  }
  out.end();
  console.log('Wrote', produced, 'samples to', OUT);
}

run().catch(e=>{ console.error(e); process.exit(2); });
