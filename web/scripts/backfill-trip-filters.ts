// nights/international/partySizeMin/partySizeMax等のカラムを後から追加した際、
// 既存のtripsレコードがデフォルト値のまま（国内・1人〜等）になってしまう問題の
// 一度きりのバックフィル。seed.tsのFEEDと同じ内容をtitleでマッチさせて更新する。
// savesCount/likesCount/priceYen等の実運用中に変わりうる値は触らない。
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";
import { DAYS_LABEL_TO_NIGHTS } from "../src/lib/trip-filters";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const FEED_META: {
  title: string;
  genre: string;
  daysLabel: string;
  international: boolean;
  partySizeMin: number;
  partySizeMax: number | null;
}[] = [
  { title: "京都 弾丸1泊2日／初めてでも外さないルート", genre: "観光", daysLabel: "1泊2日", international: false, partySizeMin: 1, partySizeMax: 4 },
  { title: "台北3泊4日 卒業旅行、朝から夜市まで詰めた", genre: "観光", daysLabel: "3泊4日", international: true, partySizeMin: 2, partySizeMax: 6 },
  { title: "鎌倉ゆるめのデート、歩く距離ぜんぶ計算した", genre: "デート", daysLabel: "日帰り", international: false, partySizeMin: 2, partySizeMax: 2 },
  { title: "テニスサークル夏合宿 3日ぶんのタイムテーブル", genre: "合宿", daysLabel: "2泊3日", international: false, partySizeMin: 5, partySizeMax: null },
  { title: "親を連れて行く箱根、歩かせすぎない一日", genre: "家族旅行", daysLabel: "日帰り", international: false, partySizeMin: 2, partySizeMax: 4 },
  { title: "高尾山から陣馬山まで縦走した休日", genre: "山登り", daysLabel: "日帰り", international: false, partySizeMin: 1, partySizeMax: null },
  { title: "はじめてのゴルフ、友達4人でラウンド", genre: "ゴルフ", daysLabel: "日帰り", international: false, partySizeMin: 4, partySizeMax: 4 },
  { title: "早朝から始める渓流釣りの一日", genre: "釣り", daysLabel: "日帰り", international: false, partySizeMin: 1, partySizeMax: 2 },
  { title: "焚き火だけしに行くソロキャンプ", genre: "キャンプ", daysLabel: "1泊2日", international: false, partySizeMin: 1, partySizeMax: 1 },
  { title: "サーフィン初心者が湘南で一日過ごすルート", genre: "海", daysLabel: "日帰り", international: false, partySizeMin: 1, partySizeMax: 3 },
  { title: "川下りラフティングとBBQを一日で両方やる", genre: "川", daysLabel: "日帰り", international: false, partySizeMin: 4, partySizeMax: null },
  { title: "湖畔でSUPしてから昼寝するだけの日", genre: "湖", daysLabel: "日帰り", international: false, partySizeMin: 1, partySizeMax: 2 },
  { title: "河原でBBQ、買い出しから片付けまでの動線", genre: "BBQ", daysLabel: "日帰り", international: false, partySizeMin: 4, partySizeMax: null },
  { title: "苗場日帰りスノボ、始発で行って終電で帰る", genre: "スノボ", daysLabel: "日帰り", international: false, partySizeMin: 2, partySizeMax: 6 },
  { title: "初心者3人のゲレンデデビュー", genre: "スキー", daysLabel: "1泊2日", international: false, partySizeMin: 3, partySizeMax: 3 },
  { title: "話題のピックルボールを都内コートで体験", genre: "ピックルボール", daysLabel: "日帰り", international: false, partySizeMin: 2, partySizeMax: 4 },
];

async function main() {
  let updated = 0;
  const missing: string[] = [];

  for (const f of FEED_META) {
    const result = await db
      .update(schema.trips)
      .set({
        genre: f.genre,
        daysLabel: f.daysLabel,
        nights: DAYS_LABEL_TO_NIGHTS[f.daysLabel] ?? 0,
        international: f.international,
        partySizeMin: f.partySizeMin,
        partySizeMax: f.partySizeMax,
      })
      .where(eq(schema.trips.title, f.title))
      .returning({ id: schema.trips.id });

    if (result.length === 0) missing.push(f.title);
    else updated += result.length;
  }

  console.log(`updated: ${updated} rows`);
  if (missing.length > 0) {
    console.log(`title not found in DB (skipped): ${missing.length}`);
    for (const t of missing) console.log(`  - ${t}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
