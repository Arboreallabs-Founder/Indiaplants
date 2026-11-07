"""Parse crawled indiaplants.com plant detail pages into data/plants.json.

Usage: python -I scripts/parse_plants.py
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
BASE = "https://indiaplants.com/"


def clean(s: str) -> str:
    s = re.sub(r"(?i)<br\s*/?>", "\n", s)
    s = re.sub(r"(?i)</li>", "\n", s)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    s = re.sub(r"[ \t\r\f\v]+", " ", s)
    s = re.sub(r" *\n *", "\n", s)
    return re.sub(r"\n{2,}", "\n", s).strip()


def key(label: str) -> str:
    label = clean(label).rstrip(":").strip().lower()
    return re.sub(r"[^a-z0-9]+", "_", label).strip("_")


def parse(page: str) -> dict:
    page = re.sub(r"(?is)<(script|style)\b.*?</\1>", "", page)
    page = re.sub(r"(?s)<!--.*?-->", "", page)
    m = re.search(r'(?is)<div id="rightbox">(.*)', page)
    body = m.group(1) if m else page
    out = {}
    h1 = re.search(r"(?is)<h1[^>]*>(.*?)</h1>", body)
    out["botanical_name"] = clean(h1.group(1)) if h1 else None

    fields = {}
    links = {}
    # dt/dd pairs (unclosed tags): split on <dt>
    for dl in re.findall(r"(?is)<dl[^>]*>(.*?)</dl>", body):
        for chunk in re.split(r"(?i)<dt>", dl)[1:]:
            parts = re.split(r"(?i)<dd>", chunk, maxsplit=1)
            if len(parts) != 2:
                continue
            k = key(parts[0])
            raw_v = parts[1]
            lis = re.findall(r"(?is)<li>(.*?)(?=<li>|</li>|</ul>)", raw_v)
            v = [clean(x) for x in lis if clean(x)] if lis else clean(raw_v)
            if k in ("category", "family"):
                links[k] = [clean(a) for a in re.findall(r"(?is)<a [^>]*>(.*?)</a>", raw_v)]
            fields[k] = v
    out["fields"] = fields
    out["categories"] = links.get("category", [])
    out["family"] = (links.get("family") or [fields.get("family")])[0]

    photos = []
    main = re.findall(r'(?is)<img src="\./(photos/Plants/[^"]+?)"[^>]*?title="([^"]*)"', body)
    for src, _ in main:
        if "/thumb/" in src:
            full = re.sub(r"/thumb/", "/", src)
            full = re.sub(r"(?i)_tn(\.\w+)$", r"\1", full)
            photos.append({"thumb": BASE + src, "image": BASE + full})
        else:
            photos.append({"thumb": None, "image": BASE + src, "main": True})
    cap = re.search(r'(?is)border:5px solid #ccc;".*?</div>\s*<div[^>]*>(.*?)</div>', body)
    out["main_caption"] = clean(cap.group(1)) if cap else None
    out["photos"] = photos
    return out


def main():
    urls = {u["i"]: u for u in json.loads((RAW / "plant-urls.json").read_text(encoding="utf-8"))}
    plants, walls = [], 0
    for f in sorted((RAW / "plants").glob("*.html")):
        page = f.read_text(encoding="utf-8", errors="replace")
        if "Please log in to access" in page:
            walls += 1
            continue
        i = int(f.stem)
        p = {"id": i, "source_url": BASE + urls[i]["href"], "index_names": urls[i]["names"]}
        p.update(parse(page))
        plants.append(p)
    (ROOT / "data" / "plants.json").write_text(json.dumps(plants, ensure_ascii=False, indent=1), encoding="utf-8")
    keys = {}
    for p in plants:
        for k in p["fields"]:
            keys[k] = keys.get(k, 0) + 1
    print(f"parsed {len(plants)} plants, {walls} login-walled")
    for k, n in sorted(keys.items(), key=lambda x: -x[1]):
        print(f"  {n:5d}  {k}")


if __name__ == "__main__":
    main()
