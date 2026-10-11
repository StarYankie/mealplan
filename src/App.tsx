import { useState } from 'react'
import { SettingsScreen } from './ui/SettingsScreen'
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
