"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

type Field = "when" | "who" | "count" | "from" | "duration" | "budget";

const STEPS: { field: Field; question: string; options: string[] }[] = [
  { field: "when", question: "明日、なにする？", options: ["今日", "明日", "今週末"] },
  { field: "who", question: "誰と行く？", options: ["1人", "恋人", "友達", "家族", "男友達"] },
  { field: "count", question: "何人で行く？", options: ["2人", "3〜4人", "5人以上"] },
  { field: "from", question: "どこから出発する？", options: ["現在地", "東京", "横浜"] },
  {
    field: "duration",
    question: "移動時間はどれくらいまで平気？",
    options: ["30分", "1時間", "2時間", "3時間"],
  },
  { field: "budget", question: "予算はどれくらい？", options: ["3,000円", "5,000円", "1万円", "2万円"] },
];

const BUDGET_MAP: Record<string, number> = {
  "3,000円": 3000,
  "5,000円": 5000,
  "1万円": 10000,
  "2万円": 20000,
};

const TOTAL_STEPS = STEPS.length + 1; // + 天気確認ステップ

export default function SearchPage() {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<Field, string>>>({});

  const isWeatherStep = stepIdx === STEPS.length;
  const step = isWeatherStep ? null : STEPS[stepIdx];

  function choose(field: Field, value: string) {
    setAnswers((a) => ({ ...a, [field]: value }));
    setTimeout(() => setStepIdx((i) => Math.min(i + 1, TOTAL_STEPS - 1)), 220);
  }

  function submit() {
    const budgetNum = answers.budget ? BUDGET_MAP[answers.budget] : undefined;
    const qs = new URLSearchParams({ sort: "trend" });
    if (budgetNum) qs.set("budget", String(budgetNum));
    router.push(`/?${qs.toString()}`);
  }

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
        <Link
          href="/"
          aria-label="一覧へ戻る"
          className="grid h-8 w-8 place-items-center rounded-[9px] border border-line text-ink-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M9 1 L3 7 L9 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="font-display text-[17px] font-semibold">明日、なにする？</h1>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-5 pb-5 pt-[22px]">
        <div className="mb-[22px] flex flex-none gap-[5px]">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-[3px] flex-1 rounded-full ${i <= stepIdx ? "bg-plan" : "bg-line"}`}
            />
          ))}
        </div>

        <div key={stepIdx} className="flex flex-1 flex-col motion-safe:animate-[wizIn_0.32s_cubic-bezier(0.3,0.7,0.3,1)]">
          {stepIdx > 0 && (
            <button
              onClick={() => setStepIdx((i) => Math.max(i - 1, 0))}
              className="mb-4 flex-none self-start text-[12.5px] text-ink-3"
            >
              ← 戻る
            </button>
          )}

          {step ? (
            <>
              {stepIdx > 0 && (
                <p className="mb-[22px] font-display text-[21px] font-semibold leading-[1.4]">{step.question}</p>
              )}
              <div className="flex flex-col gap-[9px]">
                {step.options.map((opt) => {
                  const active = answers[step.field] === opt;
                  return (
                    <button
                      key={opt}
                      onClick={() => choose(step.field, opt)}
                      className={`flex items-center justify-between rounded-xl border px-4 py-[14px] text-left text-[14.5px] font-medium ${
                        active ? "border-plan bg-plan-soft text-plan font-bold" : "border-line bg-surface text-ink"
                      }`}
                    >
                      {opt}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 14 14"
                        className={active ? "text-plan opacity-100" : "opacity-0"}
                      >
                        <path
                          d="M2 7 L5.5 10.5 L12 3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="mb-[22px] font-display text-[21px] font-semibold leading-[1.4]">条件はそろいました</p>
              <div className="mb-[18px] flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-4">
                <span className="flex-none text-[28px] leading-none">☀️</span>
                <p className="text-[13px] leading-[1.6] text-ink-2">
                  行き先の天気は<b className="text-ink">晴れ</b>。屋外中心のプランで提案します。
                </p>
              </div>
              <div className="mb-[18px] flex flex-wrap gap-1.5">
                {STEPS.filter((s) => answers[s.field]).map((s) => (
                  <span key={s.field} className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] text-ink-2">
                    {answers[s.field]}
                  </span>
                ))}
              </div>
              <button
                onClick={submit}
                className="mt-auto flex-none rounded-xl bg-plan py-[14px] text-[15px] font-bold text-white"
              >
                おすすめを見る
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
