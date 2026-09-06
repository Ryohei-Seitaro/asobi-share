"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  {
    href: "/",
    label: "見つける",
    icon: (
      <svg width="19" height="19" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M13.5 6.5 L8.5 8.5 L6.5 13.5 L11.5 11.5 Z" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/create",
    label: "つくる",
    icon: (
      <svg width="19" height="19" viewBox="0 0 20 20" aria-hidden="true">
        <rect x="2.5" y="3.5" width="15" height="14" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M2.5 7.5h15M6.5 2v3M13.5 2v3M10 10.5v4M8 12.5h4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/me",
    label: "マイページ",
    icon: (
      <svg width="19" height="19" viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="10" cy="7" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M3.6 17c.6-3.3 3.2-5 6.4-5s5.8 1.7 6.4 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex border-t border-line bg-surface"
      aria-label="メニュー"
    >
      {ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-[3px] py-[9px] pb-[11px] text-[10.5px] font-medium ${
              active ? "text-plan" : "text-ink-3"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
