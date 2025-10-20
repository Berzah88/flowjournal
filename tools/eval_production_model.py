import json
from pathlib import Path
import joblib
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix

ROOT = Path(__file__).resolve().parent
MODELDIR = ROOT.parent / 'models'
DATA = ROOT / 'synthetic_full_moods_1000_with_keywords.jsonl'


def load_jsonl(path):
    with open(path, 'r', encoding='utf8') as f:
        txt = f.read().strip()
        if not txt:
            return []
        if txt.startswith('['):
            return json.loads(txt)
        return [json.loads(l) for l in txt.splitlines() if l.strip()]


def collapse_label(l):
    if not l:
        return 'neutral'
    m = l.lower()
    collapse_map = {
        'grateful':'happy', 'hopeful':'happy', 'proud':'happy', 'relieved':'happy', 'motivated':'happy', 'content':'happy', 'curious':'happy', 'natural':'happy',
        'frustrated':'sad', 'anxious':'sad', 'overwhelmed':'sad', 'lonely':'sad', 'worried':'sad', 'disappointed':'sad', 'bored':'sad'
    }
    return collapse_map.get(m, m)


def main():
    if not (MODELDIR / 'vectorizer.pkl').exists() or not (MODELDIR / 'classifier_calibrated.pkl').exists():
        print('Model artifacts missing in', MODELDIR)
        return

    examples = load_jsonl(DATA)
    texts = [str(e.get('text') or e.get('input') or '') for e in examples]
    gold = [collapse_label(e.get('label')) for e in examples]

    vectorizer = joblib.load(MODELDIR / 'vectorizer.pkl')
    clf = joblib.load(MODELDIR / 'classifier_calibrated.pkl')

    X = vectorizer.transform(texts)
    preds = clf.predict(X)

    print('Examples:', len(texts))
    print('\nClassification report:')
    print(classification_report(gold, preds, digits=4))

    print('\nConfusion matrix:')
    print(confusion_matrix(gold, preds))


if __name__ == '__main__':
    main()
