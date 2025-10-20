#!/usr/bin/env node
// tools/eval_mood_detector.mjs
// Simple evaluation harness for AIMoodPredictor.smartMoodDetector
// Usage: node tools/eval_mood_detector.mjs path/to/dataset.json

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lazy import of the module under test
import('../utils/AIMoodPredictor.js').then(async mod => {
  const detector = mod.smartMoodDetector;

  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node tools/eval_mood_detector.mjs path/to/dataset.json');
    process.exit(2);
  }

  const datasetPath = path.resolve(args[0]);
  if (!fs.existsSync(datasetPath)) {
    console.error('Dataset file not found:', datasetPath);
    process.exit(2);
  }

  const raw = fs.readFileSync(datasetPath, 'utf8');
  let examples = [];
  try {
    // Accept either JSON array or JSONL (one JSON per line)
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      examples = JSON.parse(trimmed);
    } else {
      examples = trimmed.split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
    }
  } catch (e) {
    console.error('Failed to parse dataset file:', e.message);
    process.exit(2);
  }

  if (!Array.isArray(examples) || examples.length === 0) {
    console.error('No examples found in dataset');
    process.exit(2);
  }

  const labels = Array.from(new Set(examples.map(e => e.label).filter(Boolean))).sort();
  const labelToIndex = new Map(labels.map((l, i) => [l, i]));

  // Initialize confusion matrix
  const cm = Array.from({ length: labels.length }, () => Array(labels.length).fill(0));
  let correct = 0;

  console.log(`Running evaluation on ${examples.length} samples with labels: ${labels.join(', ')}`);

  // Collapse extended labels to core set for more reliable evaluation
  const collapseMap = new Map([
    ['grateful','happy'], ['hopeful','happy'], ['proud','happy'], ['relieved','happy'], ['motivated','happy'], ['content','happy'], ['curious','happy'], ['natural','happy'],
    ['frustrated','sad'], ['anxious','sad'], ['overwhelmed','sad'], ['lonely','sad'], ['worried','sad'], ['disappointed','sad'], ['bored','sad'],
    // keep core
    ['happy','happy'], ['excited','excited'], ['tired','tired'], ['sad','sad'], ['angry','angry'], ['neutral','neutral']
  ]);

  function collapse(label) {
    if (!label) return 'neutral';
    const l = String(label).toLowerCase();
    return collapseMap.get(l) || (labels.includes(l) ? l : 'neutral');
  }

  for (const ex of examples) {
  const text = ex.text || ex.input || '';
  const gold = collapse(ex.label);
    if (!gold || !labelToIndex.has(gold)) {
      console.warn('Skipping example with missing/unknown label:', ex);
      continue;
    }

    // Run detector (sync style: await detectMood)
    try {
      const result = await detector.detectMood(String(text || ''));
      const pred = collapse(result?.mood || 'neutral');
      // Ensure labels set includes collapsed labels
      // Lazy add to labels/labelToIndex if necessary
      if (!labelToIndex.has(gold)) {
        labelToIndex.set(gold, labelToIndex.size);
        labels.push(gold);
        // expand confusion matrix rows
        cm.push(Array(labels.length - 1).fill(0));
        cm.forEach(r => { while (r.length < labels.length) r.push(0); });
      }
      if (!labelToIndex.has(pred)) {
        labelToIndex.set(pred, labelToIndex.size);
        labels.push(pred);
        cm.push(Array(labels.length - 1).fill(0));
        cm.forEach(r => { while (r.length < labels.length) r.push(0); });
      }

      const gi = labelToIndex.get(gold);
      const pi = labelToIndex.get(pred);
      if (pi === -1) {
        // unknown prediction, map to last index if neutral exists otherwise skip
        const fallbackIdx = labelToIndex.has('neutral') ? labelToIndex.get('neutral') : null;
        if (fallbackIdx != null) {
          cm[gi][fallbackIdx] += 1;
        }
      } else {
        cm[gi][pi] += 1;
      }

      if (pred === gold) correct += 1;
    } catch (err) {
      console.error('Error detecting mood for example:', err.message);
    }
  }

  const accuracy = correct / examples.length;

  // Compute per-class precision/recall/F1
  const perClass = labels.map((label, idx) => {
    const tp = cm[idx][idx];
    const fn = cm[idx].reduce((s, v, j) => j === idx ? s : s + v, 0);
    let fp = 0;
    for (let i = 0; i < labels.length; i++) {
      if (i === idx) continue;
      fp += cm[i][idx];
    }
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : 2 * (precision * recall) / (precision + recall);
    return { label, precision, recall, f1, support: cm[idx].reduce((a, b) => a + b, 0) };
  });

  console.log('\n=== Evaluation Report ===');
  console.log('Accuracy:', (accuracy * 100).toFixed(2) + '%');
  console.log('\nPer-class metrics:');
  perClass.forEach(c => {
    console.log(`- ${c.label}: precision=${(c.precision * 100).toFixed(1)}% recall=${(c.recall * 100).toFixed(1)}% f1=${(c.f1 * 100).toFixed(1)}% support=${c.support}`);
  });

  console.log('\nConfusion Matrix (rows=gold, cols=predicted)');
  const header = ['gold\\pred', ...labels];
  console.log(header.join('\t'));
  cm.forEach((row, i) => {
    console.log([labels[i], ...row].join('\t'));
  });

  process.exit(0);

}).catch(err => {
  console.error('Failed to load AIMoodPredictor:', err.message);
  process.exit(2);
});
