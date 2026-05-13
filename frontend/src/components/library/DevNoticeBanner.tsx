import { useEffect, useState } from 'react'

/**
 * Soft dismissable notice shown at the top of the main library pages while
 * the service is in active development. "오늘 하루 보지 않기" stores today's
 * date in localStorage so the banner stays hidden for the rest of the day
 * and reappears the next day. "닫기"는 그 세션 한정.
 */
const STORAGE_KEY = 'bookmark.devNoticeDismissedOn'

function todayStr(): string {
  // YYYY-MM-DD in the user's local timezone (so "오늘" matches their wall clock).
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function DevNoticeBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const dismissedOn = localStorage.getItem(STORAGE_KEY)
      if (dismissedOn !== todayStr()) setVisible(true)
    } catch {
      // Private mode or storage disabled — show anyway, default to open.
      setVisible(true)
    }
  }, [])

  if (!visible) return null

  const dismissForToday = () => {
    try {
      localStorage.setItem(STORAGE_KEY, todayStr())
    } catch {
      // Couldn't persist; still hide for this session.
    }
    setVisible(false)
  }

  return (
    <div
      role="status"
      className="rounded-(--radius-md) border border-(--color-walnut-300)/50 bg-(--color-surface-raised)
                 px-4 py-3.5 flex items-start gap-3 mb-6 shadow-sm"
    >
      <span className="text-base shrink-0" aria-hidden="true">🛠</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-(--color-ink-strong)">
          개발 중인 사이트입니다
        </p>
        <p className="text-xs text-(--color-ink-muted) mt-1 leading-relaxed">
          서버가 잠시 끊기거나 에러가 날 수 있어요. 그럴 땐 페이지를 한 번 새로고침해 주세요.
          <br />
          🤖 새로 추가하는 책은 Google Gemini가 자동으로 태그·요약을 달아드려요.
          원치 않으시면 ⚙ 도서관 설정 &gt; 내 계정에서 끌 수 있어요.
        </p>
        <div className="flex gap-4 mt-2.5">
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="text-xs text-(--color-ink-muted) hover:text-(--color-ink-strong) transition-colors"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={dismissForToday}
            className="text-xs text-(--color-walnut-500) hover:text-(--color-walnut-700) transition-colors"
          >
            오늘 하루 보지 않기
          </button>
        </div>
      </div>
    </div>
  )
}
