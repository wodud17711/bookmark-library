import { Link } from 'react-router-dom'

export default function LoginPage() {
  return (
    <div className="min-h-full flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <header className="text-center">
          <div className="mb-8">
            <BookshelfMark />
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-(--color-ink-strong) mb-4">
            나만의 도서관
          </h1>
          <p className="text-(--color-ink-muted) leading-relaxed mb-2 text-base sm:text-lg">
            북마크가 책이 되고, 책장이 도서관이 됩니다.
          </p>
          <p className="text-(--color-ink-faint) leading-relaxed mb-10 text-sm">
            정리하고 · 꾸미고 · 친구에게 자랑하세요
          </p>

          <a
            href="/oauth2/authorization/google"
            className="
              inline-flex items-center justify-center gap-3
              w-full max-w-xs mx-auto
              px-6 py-3.5 text-[15px] font-medium
              bg-(--color-walnut-500) text-(--color-surface-raised)
              rounded-(--radius-md)
              shadow-(--shadow-sm) hover:shadow-(--shadow-md)
              hover:bg-(--color-walnut-700)
              transition-all duration-150
            "
          >
            <GoogleIcon />
            Google 계정으로 시작
          </a>
        </header>

        <section className="mt-16 pt-12 border-t border-(--color-line-soft)">
          <h2 className="font-display text-base sm:text-lg font-semibold text-(--color-ink-strong) text-center mb-8 tracking-tight">
            이렇게 작동해요
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4">
            <Step
              illustration={<BookSpinesIllustration />}
              title="북마크 → 책"
              body="URL 하나가 원하는 색깔의 책 한 권이 됩니다."
            />
            <Step
              illustration={<FloorPlanIllustration />}
              title="책장 → 평면도"
              body="크롬 북마크를 가져와 8개 책장에 정리. 위에서 내려본 도서관 평면도로 한눈에."
            />
            <Step
              illustration={<ShareIllustration />}
              title="도서관 → 공유"
              body="공개 도서관은 링크로 공유. 카톡 / 트위터 / 디스코드 미리보기 지원."
            />
          </div>
        </section>

        <p className="mt-12 text-xs text-(--color-ink-faint) text-center">
          로그인하면{' '}
          <Link
            to="/terms"
            className="text-(--color-ink-muted) underline underline-offset-2 hover:text-(--color-walnut-500)"
          >
            서비스 이용약관
          </Link>{' '}
          및{' '}
          <Link
            to="/privacy"
            className="text-(--color-ink-muted) underline underline-offset-2 hover:text-(--color-walnut-500)"
          >
            개인정보 처리방침
          </Link>
          에 동의한 것으로 간주됩니다.
        </p>
      </div>
    </div>
  )
}

function Step({
  illustration,
  title,
  body,
}: {
  illustration: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="text-center px-2">
      <div className="flex justify-center mb-3 h-16 items-end">{illustration}</div>
      <h3 className="font-display text-sm font-semibold text-(--color-ink-strong) mb-1.5">
        {title}
      </h3>
      <p className="text-xs text-(--color-ink-muted) leading-relaxed">{body}</p>
    </div>
  )
}

/** Three colored book spines — visual cue for "북마크가 책이 된다". */
function BookSpinesIllustration() {
  return (
    <div className="flex items-end gap-1" aria-hidden="true">
      <div className="w-3 h-12 rounded-t-sm" style={{ background: '#3D2817' }} />
      <div className="w-3.5 h-14 rounded-t-sm" style={{ background: '#6B2C2C' }} />
      <div className="w-3 h-11 rounded-t-sm" style={{ background: '#2C4A6B' }} />
      <div className="w-3.5 h-[3.25rem] rounded-t-sm" style={{ background: '#6A7A5C' }} />
    </div>
  )
}

/** Tiny top-down floor plan — left/right shelves + center pedestal evokes
 *  the actual library view users land on after login. */
function FloorPlanIllustration() {
  return (
    <svg width="64" height="56" viewBox="0 0 64 56" aria-hidden="true">
      <rect x="1" y="1" width="62" height="54" rx="3" fill="var(--color-walnut-50)" stroke="var(--color-walnut-300)" strokeWidth="1" />
      {/* left + right shelves */}
      <rect x="6" y="10" width="8" height="36" fill="var(--color-walnut-500)" rx="1" />
      <rect x="50" y="10" width="8" height="36" fill="var(--color-walnut-500)" rx="1" />
      {/* center pedestal */}
      <rect x="26" y="22" width="12" height="12" fill="var(--color-walnut-300)" rx="1" />
      {/* entrance line at top */}
      <line x1="22" y1="2" x2="42" y2="2" stroke="var(--color-walnut-700)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Link card icon with a small "→" — share affordance. */
function ShareIllustration() {
  return (
    <svg width="64" height="48" viewBox="0 0 64 48" aria-hidden="true">
      <rect x="2" y="6" width="48" height="36" rx="3" fill="var(--color-walnut-50)" stroke="var(--color-walnut-300)" strokeWidth="1" />
      <rect x="6" y="10" width="20" height="14" rx="1" fill="var(--color-walnut-300)" />
      <line x1="6" y1="28" x2="46" y2="28" stroke="var(--color-walnut-300)" strokeWidth="1" />
      <line x1="6" y1="33" x2="40" y2="33" stroke="var(--color-walnut-300)" strokeWidth="1" />
      <line x1="6" y1="37" x2="35" y2="37" stroke="var(--color-walnut-300)" strokeWidth="1" />
      {/* arrow pointing out */}
      <path d="M52 24h8M58 21l3 3-3 3" stroke="var(--color-walnut-500)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function BookshelfMark() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      fill="none"
      className="mx-auto"
      aria-hidden="true"
    >
      <rect x="6" y="8" width="44" height="40" rx="2" stroke="var(--color-walnut-500)" strokeWidth="2" />
      <line x1="6" y1="22" x2="50" y2="22" stroke="var(--color-walnut-500)" strokeWidth="2" />
      <line x1="6" y1="36" x2="50" y2="36" stroke="var(--color-walnut-500)" strokeWidth="2" />
      <rect x="11" y="11" width="3" height="9" fill="var(--color-walnut-300)" />
      <rect x="16" y="13" width="3" height="7" fill="var(--color-walnut-500)" />
      <rect x="21" y="11" width="3" height="9" fill="var(--color-walnut-300)" />
      <rect x="11" y="25" width="3" height="9" fill="var(--color-walnut-500)" />
      <rect x="16" y="27" width="3" height="7" fill="var(--color-walnut-300)" />
      <rect x="11" y="39" width="3" height="7" fill="var(--color-walnut-300)" />
      <rect x="16" y="39" width="3" height="7" fill="var(--color-walnut-500)" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#FFFFFF"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#FFFFFF"
        opacity="0.9"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FFFFFF"
        opacity="0.7"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#FFFFFF"
        opacity="0.85"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}
