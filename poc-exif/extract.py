#!/usr/bin/env python3
"""
遊び・旅行シェアアプリ（仮）PoC ステップ1
写真フォルダ → EXIF(撮影時刻/GPS) → 滞在クラスタリング → 旅程ドラフト(JSON)

検証したい問い：
  「写真を放り込むだけで旅程の骨格が自動で立ち上がるか」
  = 投稿負荷（本事業の最大リスク）を機械が肩代わりできるかの技術検証。

使い方:
  python extract.py <写真フォルダ> [--gap 45] [--dist 300] [--out itinerary.json]
"""
import argparse
import json
import math
import sys
from datetime import datetime
from pathlib import Path

from PIL import Image, ExifTags

try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIC_OK = True
except ImportError:
    HEIC_OK = False

EXT = {".jpg", ".jpeg", ".heic", ".png", ".tif", ".tiff"}
TAG = {v: k for k, v in ExifTags.TAGS.items()}
GPSTAG = {v: k for k, v in ExifTags.GPSTAGS.items()}


def _to_deg(dms, ref):
    """EXIFの度分秒 → 10進度。南緯・西経は負値。"""
    d, m, s = (float(x) for x in dms)
    val = d + m / 60 + s / 3600
    return -val if ref in ("S", "W") else val


def read_photo(path: Path):
    try:
        with Image.open(path) as im:
            exif = im.getexif()
            if not exif:
                return None
            shot = exif.get(TAG.get("DateTimeOriginal")) or exif.get(TAG.get("DateTime"))
            gps = exif.get_ifd(TAG.get("GPSInfo")) or {}
            lat = lng = None
            if gps:
                la, lar = gps.get(GPSTAG["GPSLatitude"]), gps.get(GPSTAG["GPSLatitudeRef"])
                lo, lor = gps.get(GPSTAG["GPSLongitude"]), gps.get(GPSTAG["GPSLongitudeRef"])
                if la and lo:
                    lat, lng = _to_deg(la, lar), _to_deg(lo, lor)
            when = None
            if shot:
                try:
                    when = datetime.strptime(str(shot), "%Y:%m:%d %H:%M:%S")
                except ValueError:
                    pass
            if when is None:
                return None
            return {"file": path.name, "when": when, "lat": lat, "lng": lng}
    except Exception:
        return None


def haversine(a, b):
    """2点間距離(m)。片方でもGPS無しなら None。"""
    if None in (a["lat"], a["lng"], b["lat"], b["lng"]):
        return None
    R = 6371000
    p1, p2 = math.radians(a["lat"]), math.radians(b["lat"])
    dp = p2 - p1
    dl = math.radians(b["lng"] - a["lng"])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def cluster(photos, gap_min, dist_m):
    """時間ギャップまたは移動距離で「滞在」に切る。1滞在＝旅程の1行になる想定。"""
    out = []
    cur = []
    for p in photos:
        if not cur:
            cur = [p]
            continue
        prev = cur[-1]
        gap = (p["when"] - prev["when"]).total_seconds() / 60
        d = haversine(prev, p)
        moved = d is not None and d > dist_m
        if gap > gap_min or moved:
            out.append(cur)
            cur = [p]
        else:
            cur.append(p)
    if cur:
        out.append(cur)
    return out


def summarize(groups):
    items = []
    for i, g in enumerate(groups, 1):
        pts = [p for p in g if p["lat"] is not None]
        lat = sum(p["lat"] for p in pts) / len(pts) if pts else None
        lng = sum(p["lng"] for p in pts) / len(pts) if pts else None
        start, end = g[0]["when"], g[-1]["when"]
        items.append({
            "seq": i,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "stay_min": round((end - start).total_seconds() / 60),
            "lat": round(lat, 6) if lat else None,
            "lng": round(lng, 6) if lng else None,
            "photo_count": len(g),
            "photos": [p["file"] for p in g[:5]],
        })
    return items


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir")
    ap.add_argument("--gap", type=int, default=45, help="滞在を切る時間ギャップ(分)")
    ap.add_argument("--dist", type=int, default=300, help="滞在を切る移動距離(m)")
    ap.add_argument("--out", default="itinerary.json")
    ap.add_argument("--cache", default="exif_cache.json", help="EXIF抽出結果のキャッシュ（パラメータ調整を高速化）")
    a = ap.parse_args()

    root = Path(a.dir)
    cache = Path(a.cache)
    if cache.exists():
        raw = json.loads(cache.read_text(encoding="utf-8"))
        files = [None] * raw["file_count"]
        photos = [
            {**r, "when": datetime.fromisoformat(r["when"])} for r in raw["photos"]
        ]
        print(f"キャッシュ利用: {cache}", file=sys.stderr)
    else:
        files = [p for p in root.rglob("*") if p.suffix.lower() in EXT]
        if not HEIC_OK and any(p.suffix.lower() == ".heic" for p in files):
            print("※ HEICは pillow-heif 未導入のためスキップされます", file=sys.stderr)
        photos = []
        for i, f in enumerate(files, 1):
            if i % 10 == 0 or i == len(files):
                print(f"  読み込み {i}/{len(files)}", file=sys.stderr, flush=True)
            r = read_photo(f)
            if r:
                photos.append(r)
        cache.write_text(
            json.dumps(
                {"file_count": len(files),
                 "photos": [{**p, "when": p["when"].isoformat()} for p in photos]},
                ensure_ascii=False),
            encoding="utf-8")
    photos.sort(key=lambda x: x["when"])

    gps_n = sum(1 for p in photos if p["lat"] is not None)
    print(f"対象ファイル {len(files)} / 撮影時刻あり {len(photos)} / GPSあり {gps_n}")
    if not photos:
        print("EXIFを持つ写真がありません。")
        return

    # 日ごとに分けてからクラスタリング（旅程は日単位で読むため）
    by_day = {}
    for p in photos:
        by_day.setdefault(p["when"].date(), []).append(p)

    days = []
    for day in sorted(by_day):
        groups = cluster(by_day[day], a.gap, a.dist)
        days.append({"date": day.isoformat(), "items": summarize(groups)})

    Path(a.out).write_text(
        json.dumps({"days": days}, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # 人間が「魔法に感じるか」を判定するための表示
    for d in days:
        print(f"\n=== {d['date']} ===")
        for it in d["items"]:
            t = it["start"][11:16]
            loc = f"{it['lat']},{it['lng']}" if it["lat"] else "GPSなし"
            print(f"  {t}  滞在{it['stay_min']:>3}分  写真{it['photo_count']:>2}枚  {loc}")
    print(f"\n→ {a.out} に保存")


if __name__ == "__main__":
    main()
