import json
from pathlib import Path
import joblib
import random

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'synthetic_full_moods_1000_with_keywords.jsonl'
MODELDIR = ROOT.parent / 'models'
OUT = ROOT / 'python_preds.jsonl'


def load_jsonl(path):
    with open(path, 'r', encoding='utf8') as f:
        txt = f.read().strip()
        if not txt:
            return []
        if txt.startswith('['):
            return json.loads(txt)
        return [json.loads(l) for l in txt.splitlines() if l.strip()]


def main(n=200):
    examples = load_jsonl(DATA)
    random.seed(42)
    sample = random.sample(examples, min(n, len(examples)))

    vec = joblib.load(MODELDIR / 'vectorizer.pkl')
    clf = joblib.load(MODELDIR / 'classifier_base.pkl')

    texts = [str(e.get('text') or e.get('input') or '') for e in sample]
    X = vec.transform(texts)
    probs = clf.predict_proba(X)
    preds = clf.classes_[probs.argmax(axis=1)]

    with open(OUT, 'w', encoding='utf8') as f:
        for t, p, pr in zip(texts, preds, probs):
            rec = {'text': t, 'py_pred': str(p), 'py_probs': pr.tolist()}
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')

    print('Wrote', OUT)


if __name__ == '__main__':
    main()
