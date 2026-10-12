import { useState } from 'react'
import { PlanScreen } from './ui/PlanScreen'
import { SettingsScreen } from './ui/SettingsScreen'
import { ShoppingScreen } from './ui/ShoppingScreen'
import { useApplyTheme } from './theme'
import { useAppState } from './ui/useAppState'

type Tab = 'plan' | 'shopping' | 'settings'

const TABS: { key: Tab; label: string }[] = [
  { key: 'plan', label: '식단' },
  { key: 'shopping', label: '장보기' },
  { key: 'settings', label: '설정' },
]

export default function App() {
  const app = useAppState()
  useApplyTheme(app.theme)
  const [tab, setTab] = useState<Tab>('plan')
  return (
    <main className="mx-auto min-h-screen max-w-md bg-surface pb-40">
      {tab === 'plan' && <PlanScreen settings={app.settings} recipes={app.recipes} plan={app.plan} onPlan={app.setPlan} />}
      {tab === 'shopping' && (
        <ShoppingScreen
          plan={app.plan}
          recipes={app.recipes}
          pantry={app.pantry}
          onTogglePantry={app.togglePantry}
          bought={app.bought}
          onToggleBought={app.toggleBought}
        />
      )}
      {tab === 'settings' && <SettingsScreen settings={app.settings} onChange={app.setSettings} theme={app.theme} onThemeChange={app.setTheme} />}
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex h-[58px] max-w-md border-t border-line bg-surface">
        {TABS.map((t) => (
          <button
            key={t.key}
            aria-current={tab === t.key ? 'page' : undefined}
            onClick={() => setTab(t.key)}
            className={`flex-1 text-xs ${tab === t.key ? 'font-bold text-ink' : 'text-faint'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </main>
  )
}
