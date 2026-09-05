#!/usr/bin/env python3
"""
遊び・旅行シェアアプリ（仮）PoC ステップ2
extract.py が出した滞在クラスタ(JSON) → 人が読める「旅程ドラフト」を生成

検証したい問い：
  座標と滞在時間だけの機械的な塊が、
  「10:00 渋谷でモーニング / 13:00 鎌倉着」レベルの"読める旅程"になるか。
  ここが成立して初めて投稿負荷ゼロが実現する。

※ Claude API（課金）を呼びます。実行前にCEO確認必須。
使い方:
  python draft.py itinerary.json [--out draft.md]
"""
import argparse
import json
import os
from pathlib import Path

import anthropic

PROMPT = """あなたは旅程エディタです。写真のEXIFから機械的に抽出した「滞在クラスタ」を、
人が読んで追体験できる旅程ドラフトに変換してください。

## 入力データの意味
- start/end: その場所での最初と最後の撮影時刻
- stay_min: 滞在時間（分）
- lat/lng: 撮影地点の重心座標
- photo_count: 撮影枚数（多いほど盛り上がった＝メインの体験の可能性が高い）

## 出力ルール
1. 座標から日本国内の地名を推定し、「10:00 渋谷」のように時刻＋地名で書く
2. 滞在時間と写真枚数から、その場所が「メインの体験」か「移動途中・立ち寄り」かを推定して書き分ける
3. 推定である箇所は必ず「(推定)」と明記する。断定しない
4. 最後に「この旅程の要約」を1〜2文で書く
5. **事実を創作しないこと。** 座標と時刻から言えること以外は書かない。
   店名・食べたもの・感想などは絶対に捏造せず、ユーザーが埋める欄として空欄で示す

## 出力フォーマット
### YYYY-MM-DD
| 時刻 | 場所(推定) | 滞在 | 種別 | ユーザーが埋める欄 |
|---|---|---|---|---|
| 10:00 | 渋谷(推定) | 40分 | 立ち寄り | 何をした？ |

**要約**: ...

## 入力
{data}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("json_path")
    ap.add_argument("--out", default="draft.md")
    a = ap.parse_args()

    for c in [Path.home() / ".env", Path(__file__).resolve().parents[3] / ".env"]:
        if c.exists():
            for line in c.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip())

    data = Path(a.json_path).read_text(encoding="utf-8")
    client = anthropic.Anthropic()
    msg = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=4000,
        messages=[{"role": "user", "content": PROMPT.format(data=data)}],
    )
    text = msg.content[0].text
    Path(a.out).write_text(text, encoding="utf-8")
    print(text)
    print(f"\n→ {a.out} に保存 / 使用トークン in={msg.usage.input_tokens} out={msg.usage.output_tokens}")


if __name__ == "__main__":
    main()
