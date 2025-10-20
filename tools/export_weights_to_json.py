import joblib
import json
import numpy as np
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODELDIR = ROOT.parent / 'models'
OUT = MODELDIR / 'weights.json'


def _to_native(o):
    """Recursively convert numpy types to native Python types for JSON serialization."""
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return float(o)
    if isinstance(o, (np.ndarray,)):
        return o.tolist()
    if isinstance(o, dict):
        return {k: _to_native(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_to_native(x) for x in o]
    return o


def main():
    vec_path = MODELDIR / 'vectorizer.pkl'
    clf_path = MODELDIR / 'classifier_calibrated.pkl'
    if not vec_path.exists() or not clf_path.exists():
        print('Model artifacts not found in', MODELDIR)
        return

    vec = joblib.load(vec_path)
    cal = joblib.load(clf_path)

    # Prefer an explicitly-saved base classifier if available
    base_path = MODELDIR / 'classifier_base.pkl'
    clf = None
    if base_path.exists():
        try:
            clf = joblib.load(base_path)
        except Exception:
            clf = None

    # fallback: try to extract base estimator from the calibrated object
    if clf is None:
        if hasattr(cal, 'base_estimator_'):
            clf = cal.base_estimator_
        elif hasattr(cal, 'calibrated_classifiers_') and len(cal.calibrated_classifiers_) > 0:
            try:
                clf = cal.calibrated_classifiers_[0].base_estimator
            except Exception:
                clf = None

    if clf is None:
        print('Could not extract base classifier weights; exporting calibrated flag instead')

    vocab = getattr(vec, 'vocabulary_', {})
    # ensure vocab indices are plain ints
    safe_vocab = {k: int(v) for k, v in vocab.items()} if isinstance(vocab, dict) else {}
    idf = getattr(vec, 'idf_', [])

    out = {
        'vocab': safe_vocab,
        'idf': _to_native(idf),
        'classes': _to_native(getattr(cal, 'classes_', [])),
    }

    if clf is not None:
        out['coef'] = _to_native(getattr(clf, 'coef_', None))
        out['intercept'] = _to_native(getattr(clf, 'intercept_', None))
    else:
        # fallback: save calibrated classifier marker (not usable in JS for calibration)
        out['calibrated'] = True

    # write with explicit UTF-8 to avoid Windows cp1252 errors
    OUT.write_text(json.dumps(_to_native(out), ensure_ascii=False, indent=2), encoding='utf-8')
    print('Wrote', OUT)


if __name__ == '__main__':
    main()
