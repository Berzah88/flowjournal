Labeling guidelines for mood detection dataset

Purpose
-------
This document explains how to label journal text with a single mood label for evaluation and training. Use these guidelines when creating the labeled dataset for the mood detector.

Core labels (start with these):
- happy
- sad
- excited
- tired
- angry
- neutral

Instructions
------------
1. Read the whole text. Choose the single label that best represents the writer's dominant feeling in that entry.
2. If text contains clear contrast (e.g. "Başta üzgündüm ama şimdi mutluyum"), prefer the latter part when it is explicit (after "ama", "fakat", "but").
3. For negation ("değilim", "mutlu değilim"), take the negated meaning (mutlu değilim -> not happy -> usually 'sad' or 'neutral' depending on context). If unsure, choose 'neutral'.
4. If text expresses physical tiredness ("çok yorgunum", "uyumak istiyorum") choose 'tired'.
5. Short texts: single-word entries like "mutlu" => 'happy', "yorgunum" => 'tired'.
6. Mixed/ambiguous: choose 'neutral'. Don't invent labels outside core set for the pilot. Later we can expand.

Edge cases
----------
- Irony/sarcasm: If you suspect sarcasm but the literal meaning dominates and you cannot be sure, label 'neutral'. Mark such examples in notes for future review.
- Multiple moods: choose the most recent or dominant (recency rule).

Format
------
Use JSONL. Each line is a JSON object with fields: id, text, label, language (optional), notes (optional).
Example:
{"id":"001","text":"Bugün çok mutluyum, herkese teşekkürler","label":"happy","language":"tr"}

Quality
-------
- Aim for at least 300 examples overall (50+ per core class). For pilot start with 150 (25 per class).
- Keep labels consistent. If multiple labelers are used, sample overlap to measure inter-annotator agreement.
