"""Render docs/04-prompt-packs.md into content/prompts/{crew,couple}.json.

Run with: python3 -I scripts/build_prompts.py
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = ROOT / "docs" / "04-prompt-packs.md"
OUT = ROOT / "content" / "prompts"
MAX_LEN = 90

mode = pack = None
rows = {"crew": [], "couple": []}
errors = []
for ln, line in enumerate(SRC.read_text().splitlines(), 1):
    if line.startswith("## "):
        mode = line[3:].strip().lower()
        pack = None
    elif line.startswith("### "):
        pack = line[4:].strip()
    elif line.startswith("- ") and mode in rows and pack:
        text = line[2:].strip()
        if len(text) > MAX_LEN:
            errors.append(f"{ln}: over {MAX_LEN} chars ({len(text)}): {text}")
        rows[mode].append({"mode": mode, "pack": pack, "text": text, "active": True})

for m, items in rows.items():
    texts = [r["text"] for r in items]
    dupes = {t for t in texts if texts.count(t) > 1}
    if dupes:
        errors.append(f"{m}: duplicate prompts: {sorted(dupes)}")
    if len(items) != 120:
        errors.append(f"{m}: expected 120 prompts, found {len(items)}")
    packs = {}
    for r in items:
        packs[r["pack"]] = packs.get(r["pack"], 0) + 1
    for p, n in packs.items():
        if n != 20:
            errors.append(f"{m}/{p}: expected 20, found {n}")

if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)

OUT.mkdir(parents=True, exist_ok=True)
for m, items in rows.items():
    (OUT / f"{m}.json").write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n")
    print(f"{m}: {len(items)} prompts in {len({r['pack'] for r in items})} packs")
