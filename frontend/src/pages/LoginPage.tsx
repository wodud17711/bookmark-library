import { Link } from 'react-router-dom'

export default function LoginPage() {
  return (
    <div className="min-h-full flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mb-10">
          <BookshelfMark />
        </div>

        <h1 className="font-display text-4xl font-semibold tracking-tight text-(--color-ink-strong) mb-4">
          나만의 도서관
        </h1>
        <p className="text-(--color-ink-muted) mb-10 leading-relaxed">
          북마크를 책장에 꽂아 정리하고, 꾸미고, 공유하세요.<br />
          정리된 책장에서 오는 작은 뿌듯함을.
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

        <p className="mt-10 text-xs text-(--color-ink-faint)">
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
