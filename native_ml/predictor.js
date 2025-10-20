// native_ml/predictor.js
// Lightweight TF-IDF + Linear classifier inference for React Native.
// Uses models/weights.json exported from training pipeline.

// Note: avoid Node stdlib (fs/path) here because React Native/Hermes
// does not include the Node standard library. We prefer
// require('../models/weights.json') which Metro can bundle.

let model = null;

function loadModel() {
  if (model) return model;
  // Metro / React Native: require JSON asset (bundled)
  try {
    if (typeof require === 'function') {
      // eslint-disable-next-line global-require
      model = require('../models/weights.json');
      return model;
    }
  } catch (e) {
    // ignore
  }
  console.warn('native_ml/predictor: could not load weights.json');
  return null;
}

const normalizeText = (text = '') => {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

function tokenize(text) {
  return normalizeText(text).split(' ').filter(Boolean);
}

function makeTfIdfVector(text, model) {
  const vocab = model.vocab || {};
  const idf = model.idf || [];
  const tokens = tokenize(text);
  const tf = Object.create(null);
  tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });

  // Build sparse vector as dense Float64Array of length = idf.length (may be large)
  const vec = new Float64Array(idf.length || 0);
  Object.keys(tf).forEach(tok => {
    const idx = vocab[tok];
    if (typeof idx === 'number' && idx >= 0 && idx < vec.length) {
      const termFreq = tf[tok];
      vec[idx] = (termFreq) * (idf[idx] || 0);
    }
  });
  return vec;
}

function softmax(arr) {
  const max = Math.max(...arr);
  const exps = arr.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0) || 1;
  return exps.map(e => e / sum);
}

export function predict(text, modelOverride) {
  const m = modelOverride || loadModel();
  if (!m) return { mood: null, probs: null };

  // If model has coef/intercept, do linear logit computation
  if (!m.coef || !m.intercept) {
    // fallback: no weights available
    return { mood: null, probs: null };
  }

  const vec = makeTfIdfVector(text, m);
  const coef = m.coef; // array [n_classes][n_features]
  const intercept = m.intercept || [];

  // compute logits for each class
  const logits = coef.map((row, ci) => {
    // dot product row · vec
    let s = 0.0;
    for (let i = 0; i < row.length && i < vec.length; i++) {
      s += row[i] * vec[i];
    }
    s += (intercept[ci] || 0);
    return s;
  });

  const probs = softmax(logits);
  const classes = m.classes || [];

  // find top class
  let bestIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[bestIdx]) bestIdx = i;
  }

  return { mood: classes[bestIdx] || null, probs, topIndex: bestIdx };
}

export default { predict, loadModel };

// CommonJS export fallback for environments that use require()
try {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { predict, loadModel };
  }
} catch (e) {}
