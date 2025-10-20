import fs from 'fs';
import readline from 'readline';

const IN = './tools/synthetic_full_moods_1000.jsonl';
const OUT = './tools/synthetic_full_moods_1000_with_keywords.jsonl';

const moodKeywords = {
  'motivated': ['motivated','ilham','hevesli'],
  'grateful': ['teşekkür','minnettar','grateful'],
  'nostalgic': ['özlem','nostalji','remember'],
  'lonely': ['yalnız','lonely','kimse yok'],
  'frustrated': ['frustrated','sıkıldım','bıktım'],
  'anxious': ['endişeli','anxious','kaygı'],
  'hopeful': ['umutlu','hopeful','umarım'],
  'proud': ['gururluyum','proud','başardım'],
  'relieved': ['rahatladım','relieved','kurtuldum'],
  'overwhelmed': ['bunaldım','overwhelmed','çok fazla'],
  'curious': ['meraklı','curious','merak ediyorum'],
  'content': ['memnunum','content','tatmin'],
  'peaceful': ['huzurlu','peaceful','sakin'],
  'confused': ['kafam karıştı','confused','anlamıyorum'],
  'disappointed': ['hayal kırıklığı','disappointed','üzgün'],
  'bored': ['sıkıldım','bored','sıkıcı'],
  'surprised': ['şaşkınım','surprised','beklenmedik'],
  'content': ['memnunum','content','tatmin'],
  'worried': ['endişeliyim','worried','kaygılı']
};

async function run(){
  if(!fs.existsSync(IN)){ console.error('Input not found', IN); process.exit(1); }
  const rl = readline.createInterface({ input: fs.createReadStream(IN), crlfDelay: Infinity });
  const out = fs.createWriteStream(OUT,{flags:'w'});
  for await (const line of rl){
    if(!line.trim()) continue;
    try{
      const obj = JSON.parse(line);
      const kwList = moodKeywords[obj.label] || [];
      const kw = kwList[Math.floor(Math.random()*Math.max(1,kwList.length))] || '';
      obj.text = (obj.text + ' ' + kw).trim();
      out.write(JSON.stringify(obj)+'\n');
    }catch(e){ }
  }
  out.end(); console.log('Wrote', OUT);
}

run().catch(e=>{ console.error(e); process.exit(2); });
