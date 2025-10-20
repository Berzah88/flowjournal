import fs from 'fs';
import readline from 'readline';

const PILOT = './tools/pilot_labeled_dataset.jsonl';
const OUT = './tools/synthetic_augmented_dataset.jsonl';
const TARGET = 1000; // desired approx size

const synonymMap = {
  // small bilingual map for common mood words
  'mutlu': ['sevinçli','memnun','happy'],
  'üzgün': ['mutsuz','sad','kederli'],
  'yorgun': ['bitkin','tired','halsiz'],
  'sinirli': ['kızgın','angry','öfkeli'],
  'heyecanlı': ['coşkulu','excited'],
  'rahat': ['calm','huzurlu','sakin'],
  'iyi': ['fine','iyi ki','güzel'],
  'kötü': ['bad','berbat']
};

function randInt(n){ return Math.floor(Math.random()*n); }

function pickSynonym(token){
  const k = Object.keys(synonymMap).find(k=> token.includes(k));
  if(!k) return token;
  const arr = synonymMap[k];
  return token.replace(k, arr[randInt(arr.length)]);
}

function augmentText(text){
  const variants = [];
  // original lightly normalized
  variants.push(text);

  // prefix/suffix templates
  const prefixes = ['Bugün','Şimdi','Dün','Sabah','Akşam','Not:'];
  const suffixes = [', ama idare eder.',' - gerçekten böyle hissettim.',' :( ',' :) ',' sanırım.',' bir süredir böyle.'];
  variants.push(prefixes[randInt(prefixes.length)] + ' ' + text);
  variants.push(text + suffixes[randInt(suffixes.length)]);

  // synonym replacement
  const tokens = text.split(/(\s+)/);
  const replaced = tokens.map(t=> { try { return pickSynonym(t) } catch(e){ return t } }).join('');
  variants.push(replaced);

  // emoticon/emphasis
  variants.push(text + ' 😊');
  variants.push(text + ' 😞');

  // truncation/expansion: cut or repeat
  if(text.length>40) variants.push(text.slice(0, Math.max(20, Math.floor(text.length*0.6))));
  variants.push(text + ' ' + text.split(' ').slice(0,3).join(' '));

  // random insertion of filler
  const fillers = ['aslında','bunu söylemek istedim','bilinçli olarak','sanki'];
  variants.push(text + ' ' + fillers[randInt(fillers.length)]);

  // mixed-language: append short English phrase
  const eng = ['feeling good','so tired','very happy','a bit sad','excited'];
  variants.push(text + ' ' + eng[randInt(eng.length)]);

  // deduplicate and return
  const uniq = Array.from(new Set(variants.map(s=>s.trim())));
  return uniq;
}

async function run(){
  if(!fs.existsSync(PILOT)){
    console.error('Pilot dataset not found:', PILOT);
    process.exit(1);
  }
  const rl = readline.createInterface({ input: fs.createReadStream(PILOT), crlfDelay: Infinity });
  const items = [];
  for await (const line of rl){
    if(!line.trim()) continue;
    try{ items.push(JSON.parse(line)); } catch(e){ /* skip */ }
  }

  const out = fs.createWriteStream(OUT, { flags: 'w' });
  let produced = 0;

  // shuffle input for more variety
  for(let i=items.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [items[i],items[j]] = [items[j],items[i]]; }

  let idx = 0;
  while(produced < TARGET){
    const base = items[idx % items.length];
    const aug = augmentText(base.text || base.content || base.entry || '');
    for(const t of aug){
      if(produced >= TARGET) break;
      const id = `synth_${String(produced+1).padStart(4,'0')}`;
      const outObj = { id, text: t, label: base.label };
      out.write(JSON.stringify(outObj, Object.keys(outObj)) + '\n');
      produced++;
    }
    idx++;
  }
  out.end();
  console.log('Wrote', produced, 'samples to', OUT);
}

run().catch(err=>{ console.error(err); process.exit(2); });
