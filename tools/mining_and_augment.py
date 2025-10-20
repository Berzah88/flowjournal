import sys
import os
import json
from pathlib import Path
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.calibration import CalibratedClassifierCV

# Simple augmentation utilities (heuristic)
def add_noise(text):
    # simple typos and punctuation noise
    import random
    out = text
    if random.random() < 0.3:
        out = out.replace('i', 'ı')
    if random.random() < 0.2:
        out = out + ' ...'
    if random.random() < 0.2:
        out = out.replace(' ', '  ')
    return out


def paraphrase_simple(text):
    # naive paraphrase: swap clauses around conjunctions or add filler
    if ',' in text:
        parts = text.split(',', 1)
        return parts[1].strip() + ' ' + parts[0].strip()
    return text + ' bugün böyle hissettim'


def main(dataset_path):
    dataset_path = Path(dataset_path)
    out_low = dataset_path.parent / 'low_confidence_samples.jsonl'
    if not dataset_path.exists():
        print('Dataset not found:', dataset_path)
        return

    with open(dataset_path, 'r', encoding='utf8') as f:
        data = [json.loads(l) for l in f.read().splitlines() if l.strip()]

    texts = [d.get('text','') for d in data]
    labels = [d.get('label','neutral').lower() for d in data]

    # Train TF-IDF + LR quickly (balanced)
    vec = TfidfVectorizer(max_features=5000, ngram_range=(1,2))
    X = vec.fit_transform(texts)
    clf = LogisticRegression(max_iter=2000, class_weight='balanced')
    clf.fit(X, labels)

    # Calibrate with sigmoid
    calibrator = CalibratedClassifierCV(clf, cv='prefit', method='sigmoid')
    try:
        calibrator.fit(X, labels)
    except Exception:
        # fallback: skip calibrator
        calibrator = None

    # Compute probabilities and pick low-confidence samples
    probs = None
    if calibrator:
        probs = calibrator.predict_proba(X)
    else:
        probs = clf.predict_proba(X)

    max_probs = probs.max(axis=1)
    threshold = 0.6
    low_idx = [i for i,p in enumerate(max_probs) if p < threshold]

    low_samples = [data[i] for i in low_idx]
    print(f'Found {len(low_samples)} low-confidence samples (threshold {threshold})')

    # write low confidence samples
    with open(out_low, 'w', encoding='utf8') as f:
        for s in low_samples:
            f.write(json.dumps(s, ensure_ascii=False) + '\n')

    # Augment low-confidence samples
    augmented = []
    for s in low_samples:
        t = s.get('text','')
        for _ in range(5):
            aug = paraphrase_simple(t)
            aug = add_noise(aug)
            augmented.append({'id': s.get('id') + '_aug', 'text': aug, 'label': s.get('label')})

    out_aug = dataset_path.parent / 'augmented_low_conf_preview.jsonl'
    with open(out_aug, 'w', encoding='utf8') as f:
        for a in augmented:
            f.write(json.dumps(a, ensure_ascii=False) + '\n')

    print('Wrote', out_low, 'and', out_aug)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: mining_and_augment.py path/to/dataset.jsonl')
    else:
        main(sys.argv[1])
