import { BottomNav } from "@/components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-surface-3">
      <div className="flex flex-1 flex-col overflow-y-auto">{children}</div>
      <BottomNav />
    </div>
  );
}
