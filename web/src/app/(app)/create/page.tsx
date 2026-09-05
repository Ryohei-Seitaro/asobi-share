import { SignInButton } from "@clerk/nextjs";
import { getOrCreateUser } from "@/lib/auth";
import { createTrip } from "./actions";

const GENRES = [
  "デート",
  "国内旅行",
  "海外旅行",
  "合宿",
  "サークル遊び",
  "家族旅行",
  "山登り",
  "ゴルフ",
  "釣り",
  "キャンプ",
  "海",
  "川",
  "湖",
  "BBQ",
  "スノボ",
  "スキー",
  "ピックルボール",
];

export default async function CreatePage() {
  const user = await getOrCreateUser();

  if (!user) {
    return (
      <>
        <div className="border-b border-line-soft px-4 py-3.5">
          <h1 className="font-display text-[17px] font-semibold">旅程をつくる</h1>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-[13px] text-ink-2">旅程をつくるにはログインしてください。</p>
          <SignInButton mode="modal">
            <button className="rounded-xl bg-plan px-6 py-3 text-[14px] font-bold text-white">
              ログインする
            </button>
          </SignInButton>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="border-b border-line-soft px-4 py-3.5">
        <h1 className="font-display text-[17px] font-semibold">旅程をつくる</h1>
      </div>
      <form action={createTrip} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div>
          <label htmlFor="title" className="mb-1.5 block text-[11px] tracking-wide text-ink-3">
            タイトル
          </label>
          <input
            id="title"
            name="title"
            required
            placeholder="例：京都 弾丸1泊2日／初めてでも外さないルート"
            className="w-full rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink"
          />
        </div>
        <div>
          <label htmlFor="genre" className="mb-1.5 block text-[11px] tracking-wide text-ink-3">
            ジャンル
          </label>
          <select
            id="genre"
            name="genre"
            required
            defaultValue=""
            className="w-full rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink"
          >
            <option value="" disabled>
              選んでください
            </option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="daysLabel" className="mb-1.5 block text-[11px] tracking-wide text-ink-3">
            日数
          </label>
          <select
            id="daysLabel"
            name="daysLabel"
            defaultValue="日帰り"
            className="w-full rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink"
          >
            <option value="日帰り">日帰り</option>
            <option value="1泊2日">1泊2日</option>
            <option value="2泊3日">2泊3日</option>
            <option value="3泊4日">3泊4日</option>
          </select>
        </div>
        <button type="submit" className="mt-auto rounded-xl bg-plan py-3.5 text-[14px] font-bold text-white">
          つぎへ（予定を置く）
        </button>
      </form>
    </>
  );
}
