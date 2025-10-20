import json
import random
from pathlib import Path

DATA_IN = Path(r"c:\Users\Berzah\Documents\Code\Flow Journal\tools\synthetic_full_moods_1000_with_keywords.jsonl")
OUT = Path(r"c:\Users\Berzah\Documents\Code\Flow Journal\tools\synthetic_augmented_10000.jsonl")

random.seed(42)

# Basic augmentation routines
def noise_typos(text):
    # introduce simple character swaps/typos
    s = list(text)
    for _ in range(random.randint(0,2)):
        i = random.randint(0, len(s)-1) if len(s)>0 else 0
        s[i] = random.choice('aeıioöuü') if s[i].isalpha() else s[i]
    return ''.join(s)


def inject_negation(text):
    # if short, prepend 'hiç' or 'değil' to create negation
    if len(text.split()) < 6:
        return 'Hiç ' + text
    # otherwise insert 'ama' clauses
    parts = text.split(',')
    if len(parts) > 1 and random.random() < 0.5:
        parts.insert(1, 'ama ' + parts.pop(0))
        return ','.join(parts)
    return text + ' ama yine de...'


def paraphrase(text):
    # naive paraphrase: move clauses, add filler phrases
    t = text
    if ',' in t and random.random() < 0.5:
        parts = [p.strip() for p in t.split(',')]
        random.shuffle(parts)
        t = ', '.join(parts)
    if random.random() < 0.3:
        t = t + ' bugün böyle hissettim.'
    return t


def augment_one(text):
    t = text
    # chain a random set of augmentations
    if random.random() < 0.6:
        t = paraphrase(t)
    if random.random() < 0.5:
        t = noise_typos(t)
    if random.random() < 0.3:
        t = inject_negation(t)
    # occasional emoji addition
    if random.random() < 0.2:
        t = t + ' 😊'
    return t


def main():
    data = [json.loads(l) for l in DATA_IN.read_text(encoding='utf8').splitlines() if l.strip()]
    base_n = len(data)
    target = 10000
    out = []

    # We'll oversample original entries with diverse augmentations
    i = 0
    while len(out) < target:
        src = random.choice(data)
        new_text = augment_one(src.get('text',''))
        out.append({'id': f"aug_{len(out)+1:05d}", 'text': new_text, 'label': src.get('label')})
        i += 1
    # write
    with open(OUT, 'w', encoding='utf8') as f:
        for o in out:
            f.write(json.dumps(o, ensure_ascii=False) + '\n')
    print('Wrote', OUT, 'with', len(out), 'samples')

if __name__ == '__main__':
    main()
