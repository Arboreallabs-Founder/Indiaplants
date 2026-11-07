"""Parse scraped accessory + sale pages into site/data/shop.json and download their photos.

Usage: python -I scripts/parse_shop.py
"""
import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from download_images import fetch  # noqa: E402  (same headers / retry logic)

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "shop"
IMG = ROOT / "data" / "images"
OUT = ROOT / "site" / "data" / "shop.json"
BASE = "https://indiaplants.com/"


def body(path):
    s = path.read_text(encoding="utf-8", errors="replace")
    s = re.sub(r"(?is)<(script|style)\b.*?</\1>", "", s)
    s = re.sub(r"(?s)<!--.*?-->", "", s)
    m = re.search(r'(?is)id="rightbox">(.*?)(?:Bamboos, Grasses|$)', s)
    return m.group(1) if m else s


def clean(s):
    s = re.sub(r"(?i)<br\s*/?>", "\n", s)
    s = html.unescape(re.sub(r"<[^>]+>", " ", s))
    s = re.sub(r"[ \t]+", " ", s)
    return re.sub(r"\s*\n\s*", "\n", s).strip()


def full(src):
    return re.sub(r"(?i)_tn(\.\w+)$", r"\1", src.replace("/thumb/", "/"))


def local(src):
    rel = src.lstrip("./")
    return ("../data/images/" + rel) if (IMG / rel).exists() else BASE + rel


def listing_index():
    """acc id -> (listing name, category) from the category listing pages."""
    idx = {}
    for f in RAW.glob("cat-*.html"):
        b = body(f)
        h1 = re.search(r"(?is)<h1[^>]*>(.*?)</h1>", b)
        cat = clean(h1.group(1)) if h1 else ""
        for acc, name in re.findall(r'(?is)accessory-details\.php\?acc=(\d+)[^"]*"\s*class="accessory"[^>]*>(.*?)</a>', b):
            idx[acc] = (clean(name), cat)
    return idx


def main():
    items = []
    idx = listing_index()
    for f in sorted(RAW.glob("acc-*.html"), key=lambda p: int(p.stem.split("-")[1])):
        b = body(f)
        h1 = re.search(r"(?is)<h1[^>]*>(.*?)</h1>", b)
        name = clean(h1.group(1)) if h1 else ""
        fields = {}
        for chunk in re.split(r"(?i)<dt>", b)[1:]:
            k, _, v = chunk.partition("<dd>")
            if v:
                fields[clean(k).rstrip(":").strip().lower()] = clean(v)
        srcs = re.findall(r'src="\./(photos/Accessory/[^"]+)"', b)
        photos = list(dict.fromkeys(full(s) for s in srcs))
        acc = f.stem.split("-")[1]
        lname, lcat = idx.get(acc, ("", ""))
        cap = re.search(r"showFullImg\([^,]+,\d+,\d+,'([^']+)'", b)
        name = name or lname or fields.get("common name", "") or (cap.group(1) if cap else "")
        cat = fields.get("category") or lcat
        if not name or (not srcs and not fields) or "Membership" in cat:
            continue  # empty item, or the membership accessory (priced versions are added below)
        fields["category"] = cat
        items.append({
            "id": "a" + f.stem.split("-")[1],
            "name": name[0].upper() + name[1:],
            "kind": "accessory",
            "cat": fields.get("category", ""),
            "desc": fields.get("accessory description", ""),
            "photos": photos,
            "price": None,
        })

    # Priced sale items (all three sale pages show the same membership set).
    sale = next(iter(sorted(RAW.glob("sale-*.html"))), None)
    if sale:
        b = body(sale)
        blocks = re.split(r"(?i)(?=<[^>]*>\s*(?:One|Two|Three) year Professional Membership)", b)
        imgs = re.findall(r'src="\./(photos/Accessory-items/[^"]+)"', b)
        txt = clean(b)
        for i, m in enumerate(re.finditer(r"((?:One|Two|Three) year Professional Membership)\s*Price:\s*Rs\.\s*([\d,.]+)\s*About this item:\s*(.*?)(?=(?:One|Two|Three) year Professional Membership|$)", txt, re.S)):
            items.append({
                "id": f"m{i + 1}",
                "name": m.group(1),
                "kind": "membership",
                "cat": "Memberships",
                "desc": re.sub(r"\s+", " ", m.group(3)).strip(),
                "photos": [imgs[i]] if i < len(imgs) else [],
                "price": float(m.group(2).replace(",", "")),
            })

    for it in items:
        for p in it["photos"]:
            fetch(BASE + p)
        it["photos"] = [local(p) for p in it["photos"]]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(items, ensure_ascii=False, indent=1), encoding="utf-8")
    cats = {}
    for it in items:
        cats[it["cat"]] = cats.get(it["cat"], 0) + 1
    print(f"{len(items)} shop items -> {OUT.relative_to(ROOT)}")
    for c, n in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {n:3d}  {c}")


if __name__ == "__main__":
    main()
