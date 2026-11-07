"""Build site/data/plants.json (compact, front-end friendly) from data/plants.json.

Run after parse_plants.py:  python -I scripts/build_site_data.py
"""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "plants.json"
OUT = ROOT / "site" / "data" / "plants.json"
IMG = ROOT / "data" / "images"


def split(v):
    if v is None:
        return []
    if isinstance(v, list):
        return [x.strip() for x in v if x.strip()]
    return [x.strip() for x in re.split(r"\s*,\s*", v) if x.strip()]


def text(v):
    if isinstance(v, list):
        return "\n".join(v)
    return (v or "").strip()


def local(url):
    """Site-relative path if downloaded, else the original remote URL."""
    if not url:
        return None
    rel = url.split("indiaplants.com/", 1)[1]
    return ("../data/images/" + rel) if (IMG / rel).exists() else url


def main():
    plants = json.loads(SRC.read_text(encoding="utf-8"))

    # Canonical capitalisation for categories (site mixes "lawns" / "Lawns").
    cat_forms = Counter(c for p in plants for c in p["categories"])
    canon = {}
    for c, n in cat_forms.most_common():
        canon.setdefault(c.lower(), c[0].upper() + c[1:])

    out = []
    for p in plants:
        f = p["fields"]
        main = next((ph for ph in p["photos"] if ph.get("main")), None)
        gallery = [ph for ph in p["photos"] if not ph.get("main")]
        family = (p.get("family") or "").strip()
        out.append({
            "id": p["id"],
            "n": p["botanical_name"],
            "c": split(f.get("common_name")),
            "r": text(f.get("regional_name")),
            "cat": sorted({canon[c.lower()] for c in p["categories"]}),
            "fam": family,
            "light": split(f.get("light")),
            "water": split(f.get("water")),
            "for": split(f.get("primarily_grown_for")),
            "season": text(f.get("flowering_season")),
            "flower": split(f.get("flower_or_inflorescence_color")),
            "foliage": split(f.get("foliage_color")),
            "h": text(f.get("plant_height_or_length")),
            "w": text(f.get("plant_spread_or_width")),
            "form": text(f.get("plant_form")),
            "life": text(f.get("estimated_life_span")),
            "sp": split(f.get("special_character")) if isinstance(f.get("special_character"), list) else [text(f.get("special_character"))] if f.get("special_character") else [],
            "avail": text(f.get("generally_available_in_india_in_quantities_of")),
            "desc": text(f.get("plant_description")),
            "tips": text(f.get("growing_tips")),
            "pests": text(f.get("insect_pests")),
            "dis": text(f.get("bacterial_diseases")),
            "img": local(main["image"]) if main else None,
            "cap": p.get("main_caption"),
            # thumbnails are downloaded locally; full-size gallery stays remote for now
            "g": [{"t": local(g["thumb"]), "f": g["image"]} for g in gallery],
            "src": p["source_url"],
        })
    out.sort(key=lambda x: (x["n"] or "").lower())
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    cats = Counter(c for p in out for c in p["cat"])
    print(f"{len(out)} plants -> {OUT.relative_to(ROOT)} ({OUT.stat().st_size/1e6:.1f} MB)")
    print(f"{len(cats)} categories, {len({p['fam'] for p in out})} families, "
          f"{sum(len(p['g']) + 1 for p in out)} photos")


if __name__ == "__main__":
    main()
