import random
import json
from pathlib import Path

OUT = Path(r"c:\Users\Berzah\Documents\Code\Flow Journal\tools\synthetic_simulated_50000.jsonl")
BASE = Path(r"c:\Users\Berzah\Documents\Code\Flow Journal\tools\synthetic_full_moods_1000_with_keywords.jsonl")

random.seed(1234)

# small synonym map for Turkish/English mixes
syn = {
    'mutluyum': ['mutluyum', 'sevinçliyim', 'memnunum'],
    'üzgünüm': ['üzgünüm', 'mutsuzum', 'hüzünlüyüm'],
    'endişeli': ['endişeli', 'kaygılı', 'tedirginim'],
    'sıkıldım': ['sıkıldım', 'canım sıkılıyor', 'bezdim'],
    'minnettar': ['minnettarım', 'teşekkür ederim', 'şükürler olsun']
}

emoji_choices = ['😊','😔','😅','😡','😴','😢','😃','😕']

# templates (mix of short, long, compound, ironic)
templates = [
    '{prefix} {core} {suffix}',
    '{core} {suffix}',
    '{prefix} {core}',
    '{core}',
    '{core}, ama {contrast}',
    'Bugün {core} çünkü {reason}',
    '{core} — {detail}',
    '{core} {emoji}',
    '{core} ama aslında {contrast} {emoji}'
]

mood_keys = []
with open(BASE, 'r', encoding='utf8') as f:
    base = [json.loads(l) for l in f.read().splitlines() if l.strip()]
    mood_keys = list({b['label'] for b in base})

# helper functions

def pick_core_for_label(label):
    # choose base phrases from base dataset that match label
    candidates = [b['text'] for b in base if b['label']==label]
    if candidates:
        return random.choice(candidates)
    # fallback
    return label


def synonymize(text):
    for k,v in syn.items():
        for s in v:
            text = text.replace(k, random.choice(v))
    return text


def inject_mixed_language(text):
    # randomly add an English phrase
    if random.random() < 0.2:
        text = text + ' ' + random.choice(['feeling good', 'not sure', 'so tired', 'so happy'])
    return text


def generate_one(label):
    core = pick_core_for_label(label)
    core = synonymize(core)
    prefix = random.choice(['', 'Dün', 'Bugün', 'Şu an', 'Maalesef', 'Nihayet'])
    suffix = random.choice(['', 'biraz', 'çok', 'aslında', 'sanırım'])
    contrast = random.choice(['mutluyum', 'üzgünüm', 'endişeliyim', 'sakinim'])
    reason = random.choice(['iş yoğunluğu', 'iyi bir haber', 'kötü bir haber', 'hiçbir şey'])
    detail = random.choice(['yorgun hissettim', 'her şey yolunda', 'düşünceliyim'])
    emoji = random.choice(emoji_choices)
    tmpl = random.choice(templates)
    text = tmpl.format(prefix=prefix, core=core, suffix=suffix, contrast=contrast, reason=reason, detail=detail, emoji=emoji)
    text = inject_mixed_language(text)
    text = text.replace('  ', ' ').strip()
    return text


def main():
    OUT.unlink(missing_ok=True)
    target = 50000
    out = []
    for i in range(target):
        label = random.choice(mood_keys)
        text = generate_one(label)
        out.append({'id': f'sim_{i+1:05d}', 'text': text, 'label': label})
    with open(OUT, 'w', encoding='utf8') as f:
        for o in out:
            f.write(json.dumps(o, ensure_ascii=False) + '\n')
    print('Wrote', OUT, 'with', len(out), 'samples')

if __name__ == '__main__':
    main()
