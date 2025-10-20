import sys
import os
import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_predict, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix
from scipy.sparse import hstack


def load_jsonl(path):
    with open(path, 'r', encoding='utf8') as f:
        return [json.loads(l) for l in f.read().splitlines() if l.strip()]


def main(dataset_path):
    ds = Path(dataset_path)
    data = load_jsonl(ds)
    aug_preview = ds.parent / 'augmented_low_conf_preview.jsonl'
    if aug_preview.exists():
        aug = load_jsonl(aug_preview)
        print('Appending', len(aug), 'augmented samples')
        data += aug

    df = pd.DataFrame(data)
    df = df.dropna(subset=['text','label'])

    # collapse labels same as baseline
    collapse_map = {
        'grateful':'happy', 'hopeful':'happy', 'proud':'happy', 'relieved':'happy', 'motivated':'happy', 'content':'happy', 'curious':'happy', 'natural':'happy',
        'frustrated':'sad', 'anxious':'sad', 'overwhelmed':'sad', 'lonely':'sad', 'worried':'sad', 'disappointed':'sad', 'bored':'sad'
    }
    df['label'] = df['label'].astype(str).str.lower().map(lambda x: collapse_map.get(x, x))

    texts = df['text'].astype(str).values
    labels = df['label'].astype(str).values

    print('Total samples after augmentation:', len(texts))

    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1,2))
    X = vectorizer.fit_transform(texts)

    clf = LogisticRegression(max_iter=2000, class_weight='balanced')

    class_counts = pd.Series(labels).value_counts()
    min_class_count = int(class_counts.min())
    n_splits = min(5, max(2, min_class_count))
    print(f'Using StratifiedKFold with n_splits={n_splits} (min class count={min_class_count})')
    cv = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)

    preds = cross_val_predict(clf, X, labels, cv=cv)

    print('\nClassification report:')
    print(classification_report(labels, preds, digits=4))

    print('\nConfusion matrix:')
    print(confusion_matrix(labels, preds))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: retrain_with_augmented.py path/to/dataset.jsonl')
    else:
        main(sys.argv[1])
