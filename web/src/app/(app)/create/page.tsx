import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/auth";
import { GENRE_TAXONOMY } from "@/lib/genres";
import { createTrip } from "./actions";

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
        <Link
          href="/create/memo"
          className="flex items-center gap-2.5 rounded-xl border border-plan bg-plan-soft px-4 py-3.5 text-[13.5px] font-bold text-plan"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M4 3h10a1 1 0 011 1v7.5L11.5 15H4a1 1 0 01-1-1V4a1 1 0 011-1z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path d="M11.5 15V12a1 1 0 011-1H15" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M6 6.5h6M6 9h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span className="flex-1">
            📌 メモから旅程をつくる
            <span className="mt-0.5 block text-[11px] font-normal text-plan/80">
              他アプリで書いた旅程のテキストと写真を貼り付けると自動で整えます
            </span>
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0" aria-hidden="true">
            <path d="M4 1.5 L8.5 6 L4 10.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <div className="flex items-center gap-2 text-[11px] text-ink-3">
          <span className="h-px flex-1 bg-line-soft" />
          または、はじめから入力する
          <span className="h-px flex-1 bg-line-soft" />
        </div>

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
            ジャンル（カテゴリ ＞ 種類）
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
            {GENRE_TAXONOMY.map((cat) => (
              <optgroup key={cat.category} label={cat.category}>
                {cat.subgenres.map((g) => (
                  <option key={g} value={g}>
                    {cat.category} ＞ {g}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="startDate" className="mb-1.5 block text-[11px] tracking-wide text-ink-3">
            いつ行った？（開始日）
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            className="w-full rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink"
          />
          <p className="mt-1 text-[10.5px] text-ink-3">
            日付を入れると「行った月・季節」が表示され、季節で探せるようになります。あとで編集画面でも変更できます。
          </p>
        </div>
        <div>
          <label htmlFor="daysLabel" className="mb-1.5 block text-[11px] tracking-wide text-ink-3">
            日数（あとで日程を組むと自動更新されます）
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
        <div>
          <span className="mb-1.5 block text-[11px] tracking-wide text-ink-3">
            国内・海外 <span className="text-plan">必須</span>
          </span>
          <div className="flex gap-[9px]">
            <label className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-line bg-surface-3 py-[9px] text-[13.5px] text-ink has-[:checked]:border-plan has-[:checked]:bg-plan-soft has-[:checked]:font-bold has-[:checked]:text-plan">
              <input type="radio" name="scope" value="domestic" required className="sr-only" />
              国内
            </label>
            <label className="flex flex-1 items-center justify-center gap-1.5 rounded-[9px] border border-line bg-surface-3 py-[9px] text-[13.5px] text-ink has-[:checked]:border-plan has-[:checked]:bg-plan-soft has-[:checked]:font-bold has-[:checked]:text-plan">
              <input type="radio" name="scope" value="international" required className="sr-only" />
              海外
            </label>
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-[11px] tracking-wide text-ink-3">
            おすすめの人数 <span className="text-plan">必須</span>
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              name="partySizeMin"
              min={1}
              required
              defaultValue={1}
              aria-label="最少人数"
              className="w-full rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink"
            />
            <span className="shrink-0 text-[12.5px] text-ink-3">人 〜</span>
            <input
              type="number"
              name="partySizeMax"
              min={1}
              placeholder="上限なし"
              aria-label="最大人数"
              className="w-full rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink"
            />
            <span className="shrink-0 text-[12.5px] text-ink-3">人</span>
          </div>
          <p className="mt-1 text-[10.5px] text-ink-3">国内・海外／人数は「見つける」のフィルタで使われます。</p>
        </div>
        <button type="submit" className="mt-auto rounded-xl bg-plan py-3.5 text-[14px] font-bold text-white">
          つぎへ（予定を置く）
        </button>
      </form>
    </>
  );
}
