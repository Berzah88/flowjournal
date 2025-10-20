import json
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
from collections import defaultdict

DATA_PATH = Path(r"c:\Users\Berzah\Documents\Code\Flow Journal\tools\synthetic_full_moods_1000_with_keywords.jsonl")
OUT_PATH = Path(r"c:\Users\Berzah\Documents\Code\Flow Journal\tools\keywords_per_mood.json")

print('Loading', DATA_PATH)
raw_lines = [l for l in DATA_PATH.read_text(encoding='utf8').splitlines() if l.strip()]
lines = []
for l in raw_lines:
    try:
        obj = json.loads(l)
        lines.append(obj)
    except Exception:
        # skip malformed lines
        continue
texts = [l.get('text') or l.get('txt') or '' for l in lines]
# dataset uses 'label' for mood field in this synthetic generation
labels = [l.get('label') or l.get('mood') or 'neutral' for l in lines]

print('Building TF-IDF')
vec = TfidfVectorizer(ngram_range=(1,2), max_features=20000, min_df=2)
X = vec.fit_transform(texts)
feature_names = vec.get_feature_names_out()

label_to_indices = defaultdict(list)
for i,l in enumerate(labels):
    label_to_indices[l].append(i)

keywords = {}
for label, idxs in label_to_indices.items():
    if not idxs:
        keywords[label] = []
        continue
    sub = X[idxs].mean(axis=0).A1
    topn = np.argsort(sub)[::-1][:15]
    kws = [feature_names[i] for i in topn if sub[i] > 0]
    keywords[label] = kws

OUT_PATH.write_text(json.dumps(keywords, ensure_ascii=False, indent=2), encoding='utf8')
print('Wrote', OUT_PATH)
