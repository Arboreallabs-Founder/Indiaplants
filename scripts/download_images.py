"""Download all plant photos (full size + thumbnails) referenced by crawled pages.

Mirrors the site's path layout under data/images/ (e.g. data/images/photos/Plants/A/...).
Skips files already downloaded. With --follow, keeps re-scanning until the crawl
writes data/raw/crawl-status.json, so it can run alongside the page crawl.

Default downloads the main photo (full size) + all thumbnails; --full also fetches
every full-size gallery photo (~2.4 GB).

Usage: python -I scripts/download_images.py [--follow] [--full]
"""
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from parse_plants import RAW, ROOT, parse  # noqa: E402

OUT = ROOT / "data" / "images"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/130.0 Safari/537.36",
    "Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
    "Referer": "https://indiaplants.com/",
}
FULL = "--full" in sys.argv
seen_files: set[str] = set()
stats = {"ok": 0, "skip": 0, "fail": 0}
failed: list[str] = []


def urls_from_pages():
    for f in sorted((RAW / "plants").glob("*.html")):
        if f.name in seen_files:
            continue
        seen_files.add(f.name)
        for ph in parse(f.read_text(encoding="utf-8", errors="replace"))["photos"]:
            # Default: main photo full size + all thumbnails. --full adds every full-size photo.
            wanted = [ph.get("thumb")]
            if ph.get("main") or FULL:
                wanted.append(ph.get("image"))
            for u in wanted:
                if u:
                    yield u


def fetch(url: str):
    dest = OUT / url.split("indiaplants.com/", 1)[1]
    if dest.exists() and dest.stat().st_size > 0:
        stats["skip"] += 1
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(4):
        try:
            req = urllib.request.Request(url.replace(" ", "%20"), headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
                if not r.headers.get("Content-Type", "").startswith("image"):
                    raise ValueError("not an image")
            dest.write_bytes(data)
            stats["ok"] += 1
            time.sleep(0.1)
            return
        except Exception:
            time.sleep(2 * (attempt + 1))
    stats["fail"] += 1
    failed.append(url)


def run_pass():
    urls = list(dict.fromkeys(urls_from_pages()))
    with ThreadPoolExecutor(max_workers=4) as ex:
        list(ex.map(fetch, urls))
    print(f"pass: {len(urls)} urls | total ok={stats['ok']} skip={stats['skip']} fail={stats['fail']}", flush=True)


def main():
    follow = "--follow" in sys.argv
    while True:
        done = (RAW / "crawl-status.json").exists()
        run_pass()
        if not follow or done:
            break
        time.sleep(30)
    (ROOT / "data" / "images-failed.txt").write_text("\n".join(failed), encoding="utf-8")
    print("finished", stats, flush=True)


if __name__ == "__main__":
    main()
