import type { CSSProperties, ReactNode } from 'react'

export type IconName = 'calendar' | 'checklist' | 'gear'

// 연한 파란 배지 안의 파란 채움 아이콘. 가운데 구멍은 배지 배경색과 같게 칠한다 (다크모드에서도 맞도록 CSS 변수).
const HOLE: CSSProperties = { fill: 'var(--c-toss-soft)' }
const TEETH = [0, 45, 90, 135, 180, 225, 270, 315]

const GLYPH: Record<IconName, ReactNode> = {
  calendar: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="3" fill="#3182f6" />
      <path d="M8 3v4M16 3v4" stroke="#3182f6" strokeWidth="2" strokeLinecap="round" />
      <path d="M8.6 13l2.4 2.4 4.4-4.8" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  checklist: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="3" fill="#3182f6" />
      <path d="M9 10h6M9 14.5h6" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  gear: (
    <>
      <g fill="#3182f6">
        {TEETH.map((deg) => (
          <rect key={deg} x="10.5" y="1.8" width="3" height="5" rx="1.2" transform={`rotate(${deg} 12 12)`} />
        ))}
        <circle cx="12" cy="12" r="7.2" />
      </g>
      <circle cx="12" cy="12" r="2.8" style={HOLE} />
    </>
  ),
}

// 화면 맨 위 제목. 아이콘이 있어도 제목이 두 줄이 되지 않도록 줄바꿈을 막고 글자를 짧게 쓴다.
// 모든 화면이 이 부품 하나를 쓰므로 글자 크기·간격·아이콘 크기가 항상 같다.
export function PageTitle({ icon, children }: { icon: IconName; children: string }) {
  return (
    <div className="flex items-center gap-3 px-5 pb-1 pt-9">
      <span
        data-icon={icon}
        aria-hidden="true"
        className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] bg-toss-soft"
      >
        <svg width="22" height="22" viewBox="0 0 24 24">
          {GLYPH[icon]}
        </svg>
      </span>
      <h1 className="min-w-0 whitespace-nowrap text-[22px] font-bold leading-snug">{children}</h1>
    </div>
  )
}
