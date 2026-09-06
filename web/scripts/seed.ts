import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { DAYS_LABEL_TO_NIGHTS } from "../src/lib/trip-filters";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

// Wikimedia Commonsのファイル名からモック用の写真URLを組み立てる。
// 本番では投稿者アップロード写真（Vercel Blob等）に置き換える想定。
const PHOTO_FILES: Record<string, string> = {
  torii: "Fushimi Inari Taisha tunnel droit.jpg",
  torii2: "20181110 Fushimi Inari Torii 12.jpg",
  bamboo:
    "JP 日本 Japan tourism 京都 Kyoto 嵐山竹林 Arashiyama Bamboo Grove n Sagano Bamboo PathSagaogurayama Tabuchiyamacho Ukyo Ward Kyoto City June 2026 R12S 02.jpg",
  kinkaku: "Kinkaku-ji in November 2016 -02.jpg",
  kiyomizu:
    "2019-04-17 Chinese (or Korean) tourists take selfies on the balcony of the Kiyomizu-dera temple.jpg",
  ponto: "Woman in Pontocho Alley, Kyoto (52351323389).jpg",
  togetsu:
    "View of the Katsura River and the Arashiyama mountains from Togetsukyo Bridge, Kyoto, 2016.jpg",
  shinkansen: "Shinkansen (Bullet Train) (52278211990).jpg",
  beach: "Little Bali Island Coral Reef Beach（WEI, WAN-CHEN）－小巴里島珊瑚礁岩灘 4.jpg",
  camp: "2017-05-21-FS-Dark Canyon Stars and Tent-Manti La Sal NF-02ET5A9556ET5A9545 (34224831573).jpg",
  hanabi:
    "Tokyo Skytree during Sumida River Fireworks Festival in Asakusa, Taito-ku, Tokyo, Japan; July 2014.jpg",
  family: "LakeAshi and MtFuji Hakone.JPG",
  golf: "Fairway on South Bradford Golf Course - geograph.org.uk - 5432059.jpg",
  fishing: "Ashiya-machi, Onga-gun, Fukuoka Prefecture - Boys Fishing.jpg",
  bbq: "Brochettes de poulet mariné en fin de cuisson au barbecue (avril 2020).jpg",
  ski: "Hunter Mountain Shiobara Ski resort, in summer 2006.jpg",
  lake: "Lake Bondhus Norway 2862.jpg",
  sea: "Ocean Jump (4821270308).jpg",
  nishiki: "Nishiki ichiba kyoto.jpg",
  yudofu: "KOCIS dubu-jeongol, Tofu Hot Pot (4556778564).jpg",
  cafe: "Espresso coffee and Caffee latte and wooden table in a cafe.jpg",
  mountain: "Hiking trail at Námafjall Mountain, Iceland, 20240716 1137 1368.jpg",
  snowboard: "Big air Québec 2011.jpg",
  river: "Peace River Valley.jpg",
  pickleball: "Milwaukee November 2022 34 (Plankinton Arcade pickleball court).jpg",
};

function photoUrl(key: string, width = 500): string {
  const file = PHOTO_FILES[key];
  if (!file) throw new Error(`unknown photo key: ${key}`);
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    file
  )}?width=${width}`;
}

const DEMO_USER_ID = "seed-user-airi";

const FEED = [
  {
    title: "京都 弾丸1泊2日／初めてでも外さないルート",
    genre: "観光",
    daysLabel: "1泊2日",
    international: false,
    partySizeMin: 1,
    partySizeMax: 4,
    saves: 312,
    likes: 540,
    trend: 88,
    priceYen: 0,
    shots: ["torii", "nishiki", "kiyomizu", "torii2", "ponto", "togetsu"],
  },
  {
    title: "台北3泊4日 卒業旅行、朝から夜市まで詰めた",
    genre: "観光",
    daysLabel: "3泊4日",
    international: true,
    partySizeMin: 2,
    partySizeMax: 6,
    saves: 486,
    likes: 820,
    trend: 95,
    priceYen: 480,
    priceCoin: 240,
    shots: ["beach", "hanabi", "cafe", "sea", "bbq"],
  },
  {
    title: "鎌倉ゆるめのデート、歩く距離ぜんぶ計算した",
    genre: "デート",
    daysLabel: "日帰り",
    international: false,
    partySizeMin: 2,
    partySizeMax: 2,
    saves: 214,
    likes: 301,
    trend: 40,
    priceYen: 0,
    shots: ["cafe", "togetsu", "yudofu", "ponto", "nishiki"],
  },
  {
    title: "テニスサークル夏合宿 3日ぶんのタイムテーブル",
    genre: "合宿",
    daysLabel: "2泊3日",
    international: false,
    partySizeMin: 5,
    partySizeMax: null,
    saves: 192,
    likes: 150,
    trend: 22,
    priceYen: 0,
    shots: ["camp", "hanabi", "beach", "river", "sea"],
  },
  {
    title: "親を連れて行く箱根、歩かせすぎない一日",
    genre: "家族旅行",
    daysLabel: "日帰り",
    international: false,
    partySizeMin: 2,
    partySizeMax: 4,
    saves: 158,
    likes: 210,
    trend: 35,
    priceYen: 280,
    priceCoin: 140,
    shots: ["family", "yudofu", "togetsu", "lake", "cafe"],
  },
  {
    title: "高尾山から陣馬山まで縦走した休日",
    genre: "山登り",
    daysLabel: "日帰り",
    international: false,
    partySizeMin: 1,
    partySizeMax: null,
    saves: 120,
    likes: 98,
    trend: 60,
    priceYen: 0,
    shots: ["mountain", "river", "camp", "lake", "bbq"],
  },
  {
    title: "はじめてのゴルフ、友達4人でラウンド",
    genre: "ゴルフ",
    daysLabel: "日帰り",
    international: false,
    partySizeMin: 4,
    partySizeMax: 4,
    saves: 88,
    likes: 64,
    trend: 18,
    priceYen: 0,
    shots: ["golf", "cafe", "family", "lake"],
  },
  {
    title: "早朝から始める渓流釣りの一日",
    genre: "釣り",
    daysLabel: "日帰り",
    international: false,
    partySizeMin: 1,
    partySizeMax: 2,
    saves: 75,
    likes: 112,
    trend: 70,
    priceYen: 0,
    shots: ["fishing", "river", "camp", "lake", "mountain"],
  },
  {
    title: "焚き火だけしに行くソロキャンプ",
    genre: "キャンプ",
    daysLabel: "1泊2日",
    international: false,
    partySizeMin: 1,
    partySizeMax: 1,
    saves: 203,
    likes: 340,
    trend: 82,
    priceYen: 380,
    priceCoin: 190,
    shots: ["camp", "hanabi", "mountain", "river", "lake"],
  },
  {
    title: "サーフィン初心者が湘南で一日過ごすルート",
    genre: "海",
    daysLabel: "日帰り",
    international: false,
    partySizeMin: 1,
    partySizeMax: 3,
    saves: 167,
    likes: 290,
    trend: 77,
    priceYen: 0,
    shots: ["sea", "beach", "cafe", "bbq"],
  },
  {
    title: "川下りラフティングとBBQを一日で両方やる",
    genre: "川",
    daysLabel: "日帰り",
    international: false,
    partySizeMin: 4,
    partySizeMax: null,
    saves: 94,
    likes: 130,
    trend: 55,
    priceYen: 0,
    shots: ["river", "bbq", "camp", "lake", "family"],
  },
  {
    title: "湖畔でSUPしてから昼寝するだけの日",
    genre: "湖",
    daysLabel: "日帰り",
    international: false,
    partySizeMin: 1,
    partySizeMax: 2,
    saves: 110,
    likes: 95,
    trend: 28,
    priceYen: 0,
    shots: ["lake", "family", "cafe", "river"],
  },
  {
    title: "河原でBBQ、買い出しから片付けまでの動線",
    genre: "BBQ",
    daysLabel: "日帰り",
    international: false,
    partySizeMin: 4,
    partySizeMax: null,
    saves: 145,
    likes: 410,
    trend: 91,
    priceYen: 0,
    shots: ["bbq", "river", "family", "camp", "lake"],
  },
  {
    title: "苗場日帰りスノボ、始発で行って終電で帰る",
    genre: "スノボ",
    daysLabel: "日帰り",
    international: false,
    partySizeMin: 2,
    partySizeMax: 6,
    saves: 198,
    likes: 255,
    trend: 66,
    priceYen: 320,
    priceCoin: 160,
    shots: ["snowboard", "ski", "cafe", "mountain"],
  },
  {
    title: "初心者3人のゲレンデデビュー",
    genre: "スキー",
    daysLabel: "1泊2日",
    international: false,
    partySizeMin: 3,
    partySizeMax: 3,
    saves: 83,
    likes: 70,
    trend: 15,
    priceYen: 0,
    shots: ["ski", "snowboard", "family", "mountain", "cafe"],
  },
  {
    title: "話題のピックルボールを都内コートで体験",
    genre: "ピックルボール",
    daysLabel: "日帰り",
    international: false,
    partySizeMin: 2,
    partySizeMax: 4,
    saves: 56,
    likes: 410,
    trend: 97,
    priceYen: 0,
    shots: ["pickleball", "cafe", "golf", "family"],
  },
];

// 有料トリップ用の汎用サンプル時間割（写真なし・1日）。
// paidFromEventOrder=3 なので先頭3件が無料プレビュー、残り2件が有料ライン内。
const PAID_SAMPLE_DAY = {
  dateLabel: "",
  openTime: "08:00",
  closeTime: "20:00",
  events: [
    {
      title: "現地集合・チェックイン",
      place: "現地の集合場所",
      category: "transport" as const,
      planStart: "09:00",
      planEnd: "09:30",
      detail: "集合場所と持ち物の確認。ここは無料で読めるプレビュー部分です。",
      caution: null as string | null,
    },
    {
      title: "午前のメインアクティビティ",
      place: "メインスポット",
      category: "sightseeing" as const,
      planStart: "10:00",
      planEnd: "12:00",
      detail: "この旅程の目玉。混雑を避けるなら午前が正解。",
      caution: null as string | null,
    },
    {
      title: "昼ごはん",
      place: "近くの食堂",
      category: "food" as const,
      planStart: "12:30",
      planEnd: "13:30",
      detail: "地元で人気の店。ここまでが無料プレビュー。",
      caution: null as string | null,
    },
    {
      title: "午後の穴場スポット",
      place: "有料エリアのスポットA",
      category: "sightseeing" as const,
      planStart: "14:00",
      planEnd: "16:00",
      detail: "ガイドブックに載っていない場所。行き方・入場のコツを詳しく。",
      caution: "夕方は道が分かりにくい。明るいうちに移動すること。",
    },
    {
      title: "しめの立ち寄り",
      place: "有料エリアのスポットB",
      category: "other" as const,
      planStart: "16:30",
      planEnd: "18:00",
      detail: "最後にここへ寄ると満足度が上がる。予約方法と価格の目安。",
      caution: "土日は混む。開店直後を狙う。",
    },
  ],
};

// 京都トリップのみ、時間割の詳細（DAYS）まで持たせる
const KYOTO_DAYS = [
  {
    dateLabel: "5/16(土)",
    openTime: "08:30",
    closeTime: "21:30",
    events: [
      {
        title: "京都駅に到着、荷物をロッカーへ",
        place: "京都駅 八条口",
        category: "transport" as const,
        planStart: "09:15",
        planEnd: "09:40",
        actualStart: "09:15",
        actualEnd: "09:55",
        detail: "新幹線を降りたら改札を出ずに八条口方面へ。大型ロッカーは700円。",
        caution:
          "八条口のロッカーは9時台でほぼ満杯。中央口まで歩いて15分ロスした。先に地下の大型ロッカーを見るのが正解。",
        shots: ["shinkansen"],
      },
      {
        title: "伏見稲荷大社 千本鳥居",
        place: "伏見稲荷大社",
        category: "sightseeing" as const,
        planStart: "10:05",
        planEnd: "11:40",
        actualStart: "10:20",
        actualEnd: "12:10",
        detail: "JR稲荷駅から徒歩0分。朝10時でも千本鳥居は人が多いが、奥へ進むほど空いていく。",
        caution: "奥社まで片道40分、山頂まで行くと2時間コース。時間がないなら奥社で折り返すのが現実的。",
        shots: ["torii", "torii2"],
      },
      {
        title: "錦市場で食べ歩き（昼ごはん）",
        place: "錦市場商店街",
        category: "food" as const,
        planStart: "12:30",
        planEnd: "13:25",
        actualStart: "12:55",
        actualEnd: "13:50",
        detail: "だし巻き玉子、湯葉、豆乳ドーナツ。ひとり2,000円くらい。",
        caution: "食べ歩き禁止の店が増えている。買った店の前で食べきるのがルール。現金しか使えない店もまだある。",
        shots: ["nishiki"],
      },
      {
        title: "清水寺と二年坂・三年坂",
        place: "清水寺",
        category: "sightseeing" as const,
        planStart: "15:10",
        planEnd: "16:30",
        actualStart: "15:25",
        actualEnd: "17:05",
        detail: "清水の舞台 → 三年坂 → 二年坂 → 八坂の塔。最後の八坂の塔が一番きれいに撮れる。",
        caution: "二年坂は石段。キャリーケースを持っていくと詰むので、必ず駅のロッカーに預けてから来ること。",
        shots: ["kiyomizu"],
      },
      {
        title: "先斗町で晩ごはん",
        place: "先斗町通",
        category: "food" as const,
        planStart: "18:40",
        planEnd: "20:30",
        actualStart: "19:05",
        actualEnd: "21:00",
        detail: "鴨川沿いの川床は5月から。ひとり4,000円〜。",
        caution: "土曜の夜は予約なしだとほぼ入れない。25分待った。2週間前には押さえるべき。",
        shots: ["ponto"],
      },
    ],
  },
  {
    dateLabel: "5/17(日)",
    openTime: "08:30",
    closeTime: "18:30",
    events: [
      {
        title: "宿を出る",
        place: "祇園四条",
        category: "transport" as const,
        planStart: "08:50",
        planEnd: "09:05",
        actualStart: "09:10",
        actualEnd: "09:25",
        detail: "阪急で桂まで、そこから嵐山線に乗り換え。",
        caution: "日曜の朝は嵐山線が混む。1本早く出るべきだった。",
        shots: [] as string[],
      },
      {
        title: "嵐山 竹林の小径",
        place: "嵯峨野 竹林の小径",
        category: "sightseeing" as const,
        planStart: "09:40",
        planEnd: "10:50",
        actualStart: "10:05",
        actualEnd: "11:00",
        detail: "野宮神社の側から入ると人の流れに逆らわずに歩ける。",
        caution: "9時を過ぎると人だらけで写真に必ず人が入る。竹林だけは早朝一択。",
        shots: ["bamboo"],
      },
      {
        title: "渡月橋",
        place: "渡月橋",
        category: "sightseeing" as const,
        planStart: "11:30",
        planEnd: "12:00",
        actualStart: "11:10",
        actualEnd: "11:35",
        detail: "橋の上より、北側の河原から撮るほうが山が入ってきれい。",
        caution: "",
        shots: ["togetsu"],
      },
      {
        title: "湯豆腐のお昼",
        place: "嵐山 中ノ島",
        category: "food" as const,
        planStart: "12:45",
        planEnd: "13:40",
        actualStart: "12:00",
        actualEnd: "13:10",
        detail: "ひとり3,000円前後。整理券を先に取る方式の店が多い。",
        caution: "12時ちょうどに入ると待たない。13時に行くと40分待ちだった。",
        shots: ["yudofu"],
      },
      {
        title: "金閣寺",
        place: "金閣寺（鹿苑寺）",
        category: "sightseeing" as const,
        planStart: "14:00",
        planEnd: "14:45",
        actualStart: "14:30",
        actualEnd: "15:20",
        detail: "拝観は500円。一方通行なので戻れない。",
        caution: "嵐山から金閣寺は市バスで50分、しかも激混みで座れない。タクシー割り勘のほうが早くて安いこともある。",
        shots: ["kinkaku"],
      },
      {
        title: "京都駅に戻る",
        place: "京都駅",
        category: "transport" as const,
        planStart: "17:20",
        planEnd: "17:40",
        actualStart: "16:50",
        actualEnd: "17:20",
        detail: "駅ビルでお土産。551は新幹線ホームにもある。",
        caution: "",
        shots: ["shinkansen"],
      },
    ],
  },
];

async function main() {
  console.log("seeding...");

  await db
    .insert(schema.users)
    .values({ id: DEMO_USER_ID, name: "あそびくん" })
    .onConflictDoNothing();

  await db
    .insert(schema.coinBalances)
    .values({ userId: DEMO_USER_ID, balance: 2340 })
    .onConflictDoNothing();

  for (const [i, f] of FEED.entries()) {
    const [trip] = await db
      .insert(schema.trips)
      .values({
        authorId: DEMO_USER_ID,
        title: f.title,
        genre: f.genre,
        // 季節フィルタ用に月を散らす（i*5 mod 12 で12か月を一巡）
        startDate: `2025-${String(((i * 5) % 12) + 1).padStart(2, "0")}-15`,
        daysLabel: f.daysLabel,
        nights: DAYS_LABEL_TO_NIGHTS[f.daysLabel] ?? 0,
        international: f.international,
        partySizeMin: f.partySizeMin,
        partySizeMax: f.partySizeMax ?? null,
        coverPhotos: f.shots.map((s) => photoUrl(s)),
        priceYen: f.priceYen,
        priceCoin: f.priceCoin ?? null,
        paidFromEventOrder: f.priceYen > 0 ? 3 : null,
        savesCount: f.saves,
        likesCount: f.likes,
        trendScore: f.trend,
      })
      .returning();

    // 京都トリップ(先頭)のみ詳細な時間割を持たせる
    if (i === 0) {
      for (const [dayIndex, day] of KYOTO_DAYS.entries()) {
        const [tripDay] = await db
          .insert(schema.tripDays)
          .values({
            tripId: trip.id,
            dayIndex,
            dateLabel: day.dateLabel,
            openTime: day.openTime,
            closeTime: day.closeTime,
          })
          .returning();

        for (const [orderIndex, ev] of day.events.entries()) {
          const [event] = await db
            .insert(schema.tripEvents)
            .values({
              dayId: tripDay.id,
              orderIndex,
              title: ev.title,
              place: ev.place,
              category: ev.category,
              planStart: ev.planStart,
              planEnd: ev.planEnd,
              actualStart: ev.actualStart,
              actualEnd: ev.actualEnd,
              detail: ev.detail,
              caution: ev.caution || null,
            })
            .returning();

          for (const [photoIndex, shotKey] of ev.shots.entries()) {
            await db.insert(schema.eventPhotos).values({
              eventId: event.id,
              url: photoUrl(shotKey),
              orderIndex: photoIndex,
            });
          }
        }
      }
    } else if (f.priceYen > 0) {
      // 有料トリップには汎用サンプル時間割を入れて、有料ライン（無料プレビュー→有料）が
      // 実際に機能するようにする
      const [tripDay] = await db
        .insert(schema.tripDays)
        .values({
          tripId: trip.id,
          dayIndex: 0,
          dateLabel: PAID_SAMPLE_DAY.dateLabel,
          openTime: PAID_SAMPLE_DAY.openTime,
          closeTime: PAID_SAMPLE_DAY.closeTime,
        })
        .returning();

      for (const [orderIndex, ev] of PAID_SAMPLE_DAY.events.entries()) {
        await db.insert(schema.tripEvents).values({
          dayId: tripDay.id,
          orderIndex,
          title: ev.title,
          place: ev.place,
          category: ev.category,
          planStart: ev.planStart,
          planEnd: ev.planEnd,
          actualStart: ev.planStart,
          actualEnd: ev.planEnd,
          detail: ev.detail,
          caution: ev.caution,
        });
      }
    }
  }

  console.log(`seeded ${FEED.length} trips (京都=フル時間割 / 有料トリップ=サンプル時間割)`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
