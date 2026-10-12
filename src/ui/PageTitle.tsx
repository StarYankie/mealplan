import type { ReactNode } from 'react'

export type IconName = 'bowl' | 'basket' | 'sliders'

// 흰색 글리프. 파란 둥근 사각형 배지 안에 들어간다.
const GLYPH: Record<IconName, ReactNode> = {
  bowl: (
    <>
      <path d="M3.5 11h17c0 4.5-3.6 8-8.5 8s-8.5-3.5-8.5-8z" fill="#fff" />
      <path d="M8.5 7.5c0-1.5 1.5-1.5 1.5-3M13 7.5c0-1.5 1.5-1.5 1.5-3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </>
  ),
  basket: (
    <>
      <path d="M8 9l3-5M16 9l-3-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M3 9h18l-1.8 9.2a2 2 0 0 1-2 1.6H6.8a2 2 0 0 1-2-1.6L3 9z" fill="#fff" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2.3" fill="#3182f6" stroke="#fff" strokeWidth="1.8" />
      <circle cx="15" cy="12" r="2.3" fill="#3182f6" stroke="#fff" strokeWidth="1.8" />
      <circle cx="8" cy="17" r="2.3" fill="#3182f6" stroke="#fff" strokeWidth="1.8" />
    </>
  ),
}

// 화면 맨 위 제목. 아이콘이 있어도 제목이 두 줄이 되지 않도록 줄바꿈을 막고 글자를 짧게 쓴다.
export function PageTitle({ icon, children }: { icon: IconName; children: string }) {
  return (
    <div className="flex items-center gap-3 px-5 pb-1 pt-9">
      <span
        data-icon={icon}
        aria-hidden="true"
        className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] bg-toss"
      >
        <svg width="22" height="22" viewBox="0 0 24 24">
          {GLYPH[icon]}
        </svg>
      </span>
      <h1 className="min-w-0 whitespace-nowrap text-[22px] font-bold leading-snug">{children}</h1>
    </div>
  )
}
