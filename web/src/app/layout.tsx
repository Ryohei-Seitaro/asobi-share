import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Zen_Kaku_Gothic_New, Klee_One } from "next/font/google";
import "./globals.css";

const bodyFont = Zen_Kaku_Gothic_New({
  variable: "--font-body",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
});

const displayFont = Klee_One({
  variable: "--font-display",
  weight: ["400", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "asobi-share",
  description: "遊び・旅行シェアアプリ（仮）",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
