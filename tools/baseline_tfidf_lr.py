import sys
import json
import os
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_predict, StratifiedKFold
from sklearn.metrics import classification_report, confusion_matrix
from scipy.sparse import hstack
import re


def load_dataset(path):
    with open(path, 'r', encoding='utf8') as f:
        raw = f.read().strip()
    if raw.startswith('['):
        data = json.loads(raw)
    else:
        data = [json.loads(l) for l in raw.splitlines() if l.strip()]
    df = pd.DataFrame(data)
    df = df.dropna(subset=['text','label'])
    # Collapse extended labels into core set
    collapse_map = {
        'grateful':'happy', 'hopeful':'happy', 'proud':'happy', 'relieved':'happy', 'motivated':'happy', 'content':'happy', 'curious':'happy', 'natural':'happy',
        'frustrated':'sad', 'anxious':'sad', 'overwhelmed':'sad', 'lonely':'sad', 'worried':'sad', 'disappointed':'sad', 'bored':'sad'
    }
    df['label'] = df['label'].astype(str).str.lower().map(lambda x: collapse_map.get(x, x))
    return df


def main():
    if len(sys.argv) < 2:
        print('Usage: python tools/baseline_tfidf_lr.py path/to/dataset.json')
        sys.exit(2)

    path = sys.argv[1]
    if not os.path.exists(path):
        print('File not found:', path)
        sys.exit(2)

    df = load_dataset(path)
    texts = df['text'].astype(str).values
    labels = df['label'].astype(str).values

    print(f'Loaded {len(df)} examples, {len(set(labels))} classes')

    vectorizer = TfidfVectorizer(max_features=5000, ngram_range=(1,2))
    X_tfidf = vectorizer.fit_transform(texts)

    # Load rule-based keyword hints and build binary flag features per mood
    kw_path = os.path.join(os.path.dirname(path), 'keywords_per_mood.json')
    rule_flags = None
    mood_names = []
    if os.path.exists(kw_path):
        with open(kw_path, 'r', encoding='utf8') as f:
            kw_map = json.load(f)
        mood_names = list(kw_map.keys())
        flags = []
        for t in texts:
            t_low = t.lower()
            row = []
            for mood in mood_names:
                kws = kw_map.get(mood) or []
                found = 0
                for kw in kws:
                    # simple substring check; normalize spacing
                    if kw and kw.strip() and kw.lower() in t_low:
                        found = 1
                        break
                row.append(found)
            flags.append(row)
        import numpy as np
        flags_arr = np.array(flags, dtype=int)
        # convert to sparse matrix with same n_rows
        from scipy.sparse import csr_matrix
        rule_flags = csr_matrix(flags_arr)
        # Stack TF-IDF and rule flags
        X = hstack([X_tfidf, rule_flags], format='csr')
    else:
        X = X_tfidf

    # Use class_weight='balanced' to mitigate class imbalance
    clf = LogisticRegression(max_iter=2000, class_weight='balanced')

    # Determine suitable number of CV splits based on smallest class size
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
    main()
