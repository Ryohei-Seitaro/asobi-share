import { redirect } from "next/navigation";

// 検索（ウィザード）は「見つける」のフィルタ欄に統合した（CEOフィードバック⑥）。
// 旧URL・ブックマークが 404 にならないよう、見つけるへリダイレクトする。
export default function SearchPage() {
  redirect("/");
}
