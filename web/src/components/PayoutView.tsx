"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPayout, savePayoutAccount } from "@/app/(app)/me/actions";

type Account = {
  bankName: string;
  branchName: string;
  accountType: "ordinary" | "checking";
  accountNumber: string;
  accountHolder: string;
} | null;

type PayoutRequest = {
  id: string;
  amountYen: number;
  status: "pending" | "paid";
  createdAt: string;
};

const INPUT_CLASS = "w-full rounded-[9px] border border-line bg-surface-3 px-[11px] py-[9px] text-[13.5px] text-ink";

export function PayoutView({
  initialAccount,
  availableYen,
  requests,
}: {
  initialAccount: Account;
  availableYen: number;
  requests: PayoutRequest[];
}) {
  const [bankName, setBankName] = useState(initialAccount?.bankName ?? "");
  const [branchName, setBranchName] = useState(initialAccount?.branchName ?? "");
  const [accountType, setAccountType] = useState<"ordinary" | "checking">(initialAccount?.accountType ?? "ordinary");
  const [accountNumber, setAccountNumber] = useState(initialAccount?.accountNumber ?? "");
  const [accountHolder, setAccountHolder] = useState(initialAccount?.accountHolder ?? "");
  const [hasAccount, setHasAccount] = useState(!!initialAccount);

  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountSaved, setAccountSaved] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestDone, setRequestDone] = useState(false);
  const [localRequests, setLocalRequests] = useState(requests);
  const [isPending, startTransition] = useTransition();

  function saveAccount() {
    setAccountError(null);
    setAccountSaved(false);
    startTransition(async () => {
      const result = await savePayoutAccount({ bankName, branchName, accountType, accountNumber, accountHolder });
      if (result.ok) {
        setHasAccount(true);
        setAccountSaved(true);
      } else {
        setAccountError(result.error);
      }
    });
  }

  function submitRequest() {
    setRequestError(null);
    setRequestDone(false);
    startTransition(async () => {
      const result = await requestPayout(availableYen);
      if (result.ok) {
        setRequestDone(true);
        setLocalRequests((rs) => [
          { id: `pending-${Date.now()}`, amountYen: availableYen, status: "pending", createdAt: new Date().toISOString() },
          ...rs,
        ]);
      } else {
        setRequestError(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3.5">
        <Link
          href="/me"
          aria-label="マイページへ戻る"
          className="grid h-8 w-8 place-items-center rounded-[9px] border border-line text-ink-2"
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M9 1 L3 7 L9 13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="font-display text-[17px] font-semibold">売上を受け取る</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 pt-[18px]">
        <div className="mb-4 rounded-[13px] border border-line bg-surface p-3.5 text-center">
          <span className="block font-mono-num text-[26px] font-medium tabular-nums text-money">
            ¥{availableYen.toLocaleString()}
          </span>
          <span className="text-[11px] text-ink-3">受け取り申請できる金額（手数料差引後）</span>
        </div>

        <p className="mb-2 text-[11px] tracking-wide text-ink-3">振込先口座</p>
        <div className="mb-4 rounded-[13px] border border-line bg-surface p-3.5">
          <Field label="銀行名">
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="例：みずほ銀行" className={INPUT_CLASS} />
          </Field>
          <Field label="支店名">
            <input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="例：渋谷支店" className={INPUT_CLASS} />
          </Field>
          <Field label="口座種別">
            <div className="flex gap-1.5">
              {(["ordinary", "checking"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setAccountType(t)}
                  className={`flex-1 rounded-[9px] border py-2 text-[12.5px] font-medium ${
                    accountType === t ? "border-line bg-surface-2 font-bold text-ink" : "border-line bg-surface-3 text-ink-2"
                  }`}
                >
                  {t === "ordinary" ? "普通" : "当座"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="口座番号（数字のみ）">
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="例：1234567"
              inputMode="numeric"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="口座名義（カナ）">
            <input value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="例：アソビ タロウ" className={INPUT_CLASS} />
          </Field>

          {accountError && <p className="mb-2 text-[11px] leading-[1.5] text-actual">{accountError}</p>}
          {accountSaved && !accountError && <p className="mb-2 text-[11px] leading-[1.5] text-money">口座情報を保存しました。</p>}

          <button
            onClick={saveAccount}
            disabled={isPending || !bankName || !branchName || !accountNumber || !accountHolder}
            className="w-full rounded-[10px] bg-surface-2 py-2.5 text-[13px] font-bold text-ink disabled:opacity-50"
          >
            口座情報を保存
          </button>
        </div>

        {requestError && <p className="mb-2 text-[12px] leading-[1.5] text-actual">{requestError}</p>}
        {requestDone && !requestError && <p className="mb-2 text-[12px] leading-[1.5] text-money">受け取り申請を受け付けました。</p>}

        <button
          onClick={submitRequest}
          disabled={isPending || !hasAccount || availableYen <= 0}
          className="mb-5 w-full rounded-xl bg-money py-[14px] text-[14.5px] font-bold text-white disabled:opacity-50"
        >
          {hasAccount ? `¥${availableYen.toLocaleString()}の受け取りを申請する` : "先に口座情報を保存してください"}
        </button>

        {localRequests.length > 0 && (
          <>
            <p className="mb-2 text-[11px] tracking-wide text-ink-3">申請履歴</p>
            <div className="flex flex-col gap-[7px]">
              {localRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[12.5px]">
                  <span className="text-ink-2">{new Date(r.createdAt).toLocaleDateString("ja-JP")}</span>
                  <b className="font-mono-num tabular-nums text-ink">¥{r.amountYen.toLocaleString()}</b>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${r.status === "paid" ? "bg-money-soft text-money" : "bg-surface-2 text-ink-3"}`}>
                    {r.status === "paid" ? "振込済み" : "申請中"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-[11px]">
      <label className="mb-[5px] block text-[11px] tracking-wide text-ink-3">{label}</label>
      {children}
    </div>
  );
}
