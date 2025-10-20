import fs from 'fs';
import readline from 'readline';

const PILOT = './tools/pilot_labeled_dataset.jsonl';
const OUT = './tools/synthetic_augmented_hard.jsonl';
const TARGET = 1000;

function randInt(n){ return Math.floor(Math.random()*n); }

function randomSwapWords(s){
  const words = s.split(/(\s+)/).filter(Boolean);
  if(words.length<3) return s;
  const i = randInt(words.length-1);
  const j = Math.min(words.length-1, i+1);
  const tmp = words[i]; words[i]=words[j]; words[j]=tmp;
  return words.join(' ');
}

function injectTypos(s){
  // simple char drop or swap
  if(s.length<4) return s;
  const i = randInt(s.length-1);
  if(Math.random()<0.5){ // drop
    return s.slice(0,i)+s.slice(i+1);
  } else { // swap
    const j = Math.min(s.length-1, i+1);
    const arr = s.split(''); const tmp = arr[i]; arr[i]=arr[j]; arr[j]=tmp; return arr.join('');
  }
}

function negateSentence(s){
  // insert 'değil' after verb-like tokens heuristically
  if(s.toLowerCase().includes('değil')) return s;
  const parts = s.split(/[,.?!]/);
  const first = parts[0] || s;
  return first.trim() + ' değil';
}

function paraphrase(s){
  const patterns = [
    t=> t.replace(/çok/g,'fazla'),
    t=> t.replace(/biraz/g,'az biraz'),
    t=> t.replace(/süper|harika/g,'mükemmel'),
    t=> t.replace(/yoksa/g,'mı'),
    t=> t
  ];
  return patterns[randInt(patterns.length)](s);
}

function augmentText(text){
  const variants = new Set();
  variants.add(text);
  // noisy punctuation
  variants.add(text.replace(/\./g,'...'));
  // swap words
  variants.add(randomSwapWords(text));
  // typos
  variants.add(injectTypos(text));
  // negation
  if(Math.random()<0.3) variants.add(negateSentence(text));
  // paraphrase
  variants.add(paraphrase(text));
  // mixed-language noisy insert
  const eng = ['so tired','not great','very happy','kinda sad','super excited'];
  variants.add(text + ' ' + eng[randInt(eng.length)]);
  // punctuation noise and emoji
  variants.add(text + (Math.random()<0.5 ? '!!!' : '?!!') + ' 😅');
  // combined minor edits
  variants.add(paraphrase(randomSwapWords(text)));
  // short/long extremes
  if(text.length>40) variants.add(text.slice(0,20));
  variants.add(text + ' ' + text.split(' ').slice(0,2).join(' '));

  return Array.from(variants).map(s=>s.trim()).filter(Boolean);
}

async function run(){
  if(!fs.existsSync(PILOT)){
    console.error('Pilot dataset not found:', PILOT); process.exit(1);
  }
  const rl = readline.createInterface({ input: fs.createReadStream(PILOT), crlfDelay: Infinity });
  const items = [];
  for await (const line of rl){ if(!line.trim()) continue; try{ items.push(JSON.parse(line)); }catch(e){} }

  const out = fs.createWriteStream(OUT, { flags: 'w' });
  let produced = 0; let idx=0;
  while(produced < TARGET){
    const base = items[idx % items.length];
    const aug = augmentText(base.text || base.content || base.entry || '');
    for(const t of aug){ if(produced>=TARGET) break; const id=`hard_${String(produced+1).padStart(4,'0')}`; out.write(JSON.stringify({id,text:t,label:base.label})+'\n'); produced++; }
    idx++;
  }
  out.end(); console.log('Wrote', produced, 'samples to', OUT);
}

run().catch(e=>{ console.error(e); process.exit(2) });
