import { useState } from 'react'
import { PlanScreen } from './ui/PlanScreen'
import { SettingsScreen } from './ui/SettingsScreen'
import { ShoppingScreen } from './ui/ShoppingScreen'
import { useAppState } from './ui/useAppState'

type Tab = 'settings' | 'plan' | 'shopping'

export default function App() {
  const app = useAppState()
  const [tab, setTab] = useState<Tab>('settings')
  const tabs: { key: Tab; label: string }[] = [
    { key: 'settings', label: '설정' },
    { key: 'plan', label: '식단' },
    { key: 'shopping', label: '장보기' },
  ]
  return (
    <main>
      {tab === 'settings' && <SettingsScreen settings={app.settings} onChange={app.setSettings} />}
      {tab === 'plan' && (
        <PlanScreen settings={app.settings} recipes={app.recipes} plan={app.plan} onPlan={app.setPlan} />
      )}
      {tab === 'shopping' && (
        <ShoppingScreen plan={app.plan} recipes={app.recipes} pantry={app.pantry} onTogglePantry={app.togglePantry}
          bought={app.bought}
          onToggleBought={app.toggleBought}
        />
      )}
      <nav className="tabs">
        {tabs.map((t) => (
          <button key={t.key} aria-current={tab === t.key ? 'page' : undefined} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>
    </main>
  )
}
