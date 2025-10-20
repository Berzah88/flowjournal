#!/usr/bin/env node
// tools/merge_eval_dataset.mjs
// Merge JSON sample files in tools/eval_samples/ into tools/eval_dataset_full.json
// Basic anonymization: removes emails, phone numbers, URLs, and personal names heuristically

import fs from 'fs/promises';
import path from 'path';

const samplesDir = path.join(process.cwd(), 'tools', 'eval_samples');
const outFile = path.join(process.cwd(), 'tools', 'eval_dataset_full.json');

const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const urlRe = /https?:\/\/[\w\-\.\/?#=&%+~]+/gi;
const phoneRe = /(?:\+?\d{1,3}[\s-]?)?(?:\(\d{2,4}\)[\s-]?)?\d{3,4}[\s-]?\d{2,4}/g;

function redactPII(text) {
  if (!text) return text;
  let s = text;
  s = s.replace(emailRe, '[EMAIL]');
  s = s.replace(urlRe, '[URL]');
  s = s.replace(phoneRe, '[PHONE]');
  // Basic name redaction heuristic: capitalized words longer than 2 letters in English/Turkish
  s = s.replace(/\b([A-ZÇĞİÖŞÜ][a-zçğıöşü]{2,})\b/g, '[NAME]');
  return s;
}

async function main() {
  try {
    const exists = await fs.stat(samplesDir).then(() => true).catch(() => false);
    if (!exists) {
      console.log('No samples directory found at', samplesDir);
      console.log('Create the directory and add JSON sample files as described in tools/collect_eval_template.md');
      return;
    }

    const files = await fs.readdir(samplesDir);
    const merged = [];

    for (const f of files) {
      if (!f.toLowerCase().endsWith('.json')) continue;
      const full = path.join(samplesDir, f);
      try {
        const raw = await fs.readFile(full, 'utf8');
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          for (const item of arr) {
            const copy = { ...item };
            copy.text = redactPII(copy.text);
            // Ensure required fields
            if (!copy.id) copy.id = `${path.basename(f, '.json')}_${merged.length + 1}`;
            if (!copy.lang) copy.lang = 'en';
            merged.push(copy);
          }
        }
      } catch (e) {
        console.warn('Failed to process', f, e && e.message);
      }
    }

    await fs.writeFile(outFile, JSON.stringify(merged, null, 2), 'utf8');
    console.log('Merged', merged.length, 'examples into', outFile);
  } catch (err) {
    console.error('merge failed:', err && err.message);
    process.exit(1);
  }
}

main();
