import { useEffect, type ReactNode } from 'react'

export function Sheet({ label, onClose, children }: { label: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div aria-hidden className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white px-5 pb-6 pt-5 shadow-2xl"
      >
        {children}
      </div>
    </div>
  )
}
