"use client";

// ルートレイアウト自体が描画に失敗したときの最終フォールバック。
// layout.tsx を置き換えるので <html>/<body> を自前で持ち、globals.css も効かない。
// 通常は (app)/error.tsx 側で捕捉されるため、ここに来るのは稀。

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          color: "#141a2b",
          background: "#f7f9fe",
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>うまく読み込めませんでした</p>
        <p style={{ fontSize: 13, color: "#8b93ab", margin: 0 }}>
          一時的な問題の可能性があります。もう一度お試しください。
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: "none",
            borderRadius: 12,
            background: "#2b47c9",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            padding: "12px 24px",
            cursor: "pointer",
          }}
        >
          再読み込み
        </button>
        {error.digest && (
          <p style={{ fontSize: 10.5, color: "#8b93ab", margin: 0 }}>エラーID: {error.digest}</p>
        )}
      </body>
    </html>
  );
}
