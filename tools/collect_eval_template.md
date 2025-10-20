# Evaluation Dataset Collection Template

Purpose: collect labeled, anonymized examples for evaluating the mood predictor. The emphasis is English-first (EN) with a Turkish subset.

Folder layout (create `tools/eval_samples/` and put small JSON files inside):

- tools/eval_samples/
  - sample_01.json
  - sample_02.json

Each sample file should be a JSON array of objects with this schema:

[
  {
    "id": "unique-id-001",
    "lang": "en",          // 'en' or 'tr'
    "text": "I feel very happy today...",
    "label": "happy",      // gold label (use keys from AIMoodPredictor EXTENDED_MOODS or CORE_MOODS)
    "notes": "optional notes about context"
  }
]

Label guidance:
- Use canonical mood keys (e.g. happy, sad, excited, anxious, tired, frustrated, proud, grateful, neutral or natural, etc.)
- Prefer single-label per example. If mixed mood, choose the dominant mood.

Anonymization rules (must follow):
- Remove or replace personal names, emails, phone numbers, URLs. Replace with placeholders: [NAME], [EMAIL], [URL], [PHONE]
- Remove precise location names if they identify a person.
- Keep content semantics but remove PII.

Target dataset size:
- Minimum English: 200 examples
- Target Turkish: 100 examples
- Balanced across moods where possible

How to contribute:
1. Create a file under `tools/eval_samples/` named `yourname_x.json`.
2. Add 10-50 examples in the schema above.
3. Run `node tools/merge_eval_dataset.mjs` to merge and anonymize into `tools/eval_dataset_full.json`.
4. Run `node tools/eval_mood_detector.mjs tools/eval_dataset_full.json` to evaluate.

Quality tips:
- Include short and long texts.
- Include contrast sentences ("I was sad but now I'm better.") and ironic phrases.
- Mix formal and informal language.
