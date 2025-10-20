import os
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix

ROOT = Path(__file__).resolve().parent
BASE = ROOT / 'synthetic_full_moods_1000_with_keywords.jsonl'
SIM = ROOT / 'synthetic_simulated_50000.jsonl'
MODELDIR = ROOT.parent / 'models'
MODELDIR.mkdir(exist_ok=True)


def load_jsonl(path):
    with open(path, 'r', encoding='utf8') as f:
        return [json.loads(l) for l in f.read().splitlines() if l.strip()]


def main():
    base = load_jsonl(BASE)
    sim = load_jsonl(SIM)
    data = base + sim
    df = pd.DataFrame(data)
    df = df.dropna(subset=['text','label'])

    # collapse labels to same scheme as before
    collapse_map = {
        'grateful':'happy', 'hopeful':'happy', 'proud':'happy', 'relieved':'happy', 'motivated':'happy', 'content':'happy', 'curious':'happy', 'natural':'happy',
        'frustrated':'sad', 'anxious':'sad', 'overwhelmed':'sad', 'lonely':'sad', 'worried':'sad', 'disappointed':'sad', 'bored':'sad'
    }
    df['label'] = df['label'].astype(str).str.lower().map(lambda x: collapse_map.get(x, x))

    X = df['text'].astype(str).values
    y = df['label'].astype(str).values

    # hold-out validation
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.1, stratify=y, random_state=42)

    vectorizer = TfidfVectorizer(max_features=8000, ngram_range=(1,2))
    X_train_vec = vectorizer.fit_transform(X_train)
    X_val_vec = vectorizer.transform(X_val)

    clf = LogisticRegression(max_iter=2000, class_weight='balanced')
    clf.fit(X_train_vec, y_train)

    # Calibrate
    calibrator = CalibratedClassifierCV(clf, cv='prefit', method='sigmoid')
    calibrator.fit(X_val_vec, y_val)

    # Evaluate
    preds = calibrator.predict(X_val_vec)
    probs = calibrator.predict_proba(X_val_vec)

    print('Validation set size:', len(X_val))
    print('\nClassification report:')
    print(classification_report(y_val, preds, digits=4))

    print('\nConfusion matrix:')
    print(confusion_matrix(y_val, preds))

    # Save artifacts
    joblib.dump(vectorizer, MODELDIR / 'vectorizer.pkl')
    joblib.dump(clf, MODELDIR / 'classifier_base.pkl')
    joblib.dump(calibrator, MODELDIR / 'classifier_calibrated.pkl')

    # export keywords per mood (top TF-IDF terms) for rule suggestions
    feature_names = vectorizer.get_feature_names_out()
    kw_map = {}
    for label in sorted(set(y)):
        # average tfidf for label
        idxs = [i for i,l in enumerate(y_train) if l==label]
        if not idxs:
            kw_map[label] = []
            continue
        sub = X_train_vec[idxs].mean(axis=0).A1
        topn = np.argsort(sub)[::-1][:25]
        kws = [feature_names[i] for i in topn if sub[i]>0]
        kw_map[label] = kws

    with open(MODELDIR / 'keywords.json', 'w', encoding='utf8') as f:
        json.dump(kw_map, f, ensure_ascii=False, indent=2)

    print('Saved model artifacts to', MODELDIR)

if __name__ == '__main__':
    main()
