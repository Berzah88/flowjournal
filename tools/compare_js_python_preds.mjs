import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const predsPath = path.join(__dirname, 'python_preds.jsonl');
async function main() {
  try {
    // Load predictor and weights directly in Node
    const { createRequire } = await import('module');
    const req = createRequire(import.meta.url);
    const predictor = req('../native_ml/predictor');
    const weights = req('../models/weights.json');

    function readJsonl(p) {
      return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
    }

    const examples = readJsonl(predsPath);
    let agree = 0;
    let total = examples.length;
    let probDiffSum = 0;

    for (const ex of examples) {
      let js = null;
      try {
        js = predictor.predict(ex.text, weights);
      } catch (e) {
        console.error('Predictor error for text:', ex.text, e && e.message);
        js = { mood: null, probs: null };
      }
      const pyTop = ex.py_pred;
      const jsTop = js.mood;
      if (pyTop === jsTop) agree++;
      // compare top-class probabilities if available
      const pyTopProb = ex.py_probs ? Math.max(...ex.py_probs) : 0;
      const jsTopProb = js.probs ? Math.max(...js.probs) : 0;
      probDiffSum += Math.abs(pyTopProb - jsTopProb);
    }

    console.log('Samples:', total);
    console.log('Top-label agreement:', ((agree/total)*100).toFixed(2) + '%');
    console.log('Avg |top-prob diff|:', (probDiffSum/total).toFixed(4));
  } catch (e) {
    console.error('Fatal error in compare script:', e && e.stack ? e.stack : e);
    process.exit(2);
  }
}

main();
