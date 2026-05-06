import { Link } from 'react-router-dom'

/**
 * 개인정보처리방침 — Korean PIPA / 정보통신망법 compliance.
 *
 * Anyone running their own copy should update the operator name + contact
 * email in {@link OPERATOR_NAME} / {@link CONTACT_EMAIL} below, and the
 * effective date in {@link EFFECTIVE_DATE} after a substantive change.
 */
const OPERATOR_NAME = 'wodud17711'
const CONTACT_EMAIL = 'jaeyoung17711@gmail.com'
const EFFECTIVE_DATE = '2026-05-06'

export default function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="개인정보처리방침" effectiveDate={EFFECTIVE_DATE}>
      <p>
        북마크 도서관(이하 "서비스")은 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를
        보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 본 개인정보처리방침을
        수립·공개합니다.
      </p>

      <Section title="1. 수집하는 개인정보 항목">
        <p>서비스는 회원 가입 및 로그인 시 Google OAuth를 통해 다음 정보를 제공받습니다.</p>
        <ul>
          <li>Google 계정 고유 식별자(sub)</li>
          <li>이메일 주소</li>
          <li>이름(displayName)</li>
          <li>프로필 사진 URL</li>
        </ul>
        <p>
          서비스 이용 과정에서 자동으로 생성되는 정보: 사용자가 등록한 북마크(URL, 제목, 사이트명),
          도서관 설정, 접속 IP, 쿠키(세션), 이용 기록. 비밀번호는 별도로 저장하지 않으며 인증은
          전적으로 Google에 위임합니다.
        </p>
      </Section>

      <Section title="2. 개인정보의 수집 및 이용 목적">
        <ul>
          <li>회원 식별 및 로그인 인증</li>
          <li>북마크/도서관 데이터의 저장 및 표시</li>
          <li>공개로 설정한 도서관에 대한 사용자명·표시이름 노출</li>
          <li>서비스 안정성 확보를 위한 부정 이용 방지 및 오류 분석</li>
        </ul>
      </Section>

      <Section title="3. 개인정보의 보유 및 이용 기간">
        <p>
          원칙적으로 회원이 탈퇴하거나 서비스 이용이 종료된 시점에 지체 없이 파기합니다. 다만
          관련 법령에 따라 보존해야 하는 경우 해당 기간 동안 보관합니다. 1년 이상 서비스에
          접속하지 않은 휴면 계정은 별도 통지 후 분리 보관 또는 파기될 수 있습니다.
        </p>
      </Section>

      <Section title="4. 개인정보의 제3자 제공">
        <p>
          서비스는 정보주체의 별도 동의, 법률의 특별한 규정 등에 해당하는 경우를 제외하고는 개인정보를
          제3자에게 제공하지 않습니다. 단, 사용자가 자신의 도서관을 "공개"로 설정한 경우 해당
          도서관의 사용자명, 표시이름, 책장 및 책의 메타데이터는 인터넷에서 접근 가능한 상태가 됩니다.
        </p>
      </Section>

      <Section title="5. 개인정보 처리의 위탁">
        <p>서비스는 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.</p>
        <ul>
          <li>
            <strong>Google LLC</strong> — OAuth 인증, 이메일/이름/프로필 사진 제공
          </li>
        </ul>
        <p>
          위탁계약 체결 시 위탁업무 수행목적 외 개인정보 처리 금지, 기술적·관리적 보호조치,
          재위탁 제한 등을 계약서에 명시하여 안전하게 관리되도록 하고 있습니다.
        </p>
      </Section>

      <Section title="6. 개인정보의 국외 이전">
        <p>
          서비스는 OAuth 인증 및 안정적 운영을 위해 다음과 같이 개인정보를 국외로 이전합니다.
          정보주체는 본 국외 이전을 거부할 권리가 있으나, 거부 시 서비스 이용이 불가능할 수 있습니다.
        </p>
        <p>
          <strong>(1) Google LLC — OAuth 인증</strong>
        </p>
        <ul>
          <li>이전받는 국가: 미국 (United States)</li>
          <li>이전 일시 및 방법: 로그인 시점에 OAuth 2.0 프로토콜(HTTPS)을 통하여 즉시 전송</li>
          <li>이전 항목: Google 계정 고유 식별자(sub), 이메일, 이름, 프로필 사진 URL</li>
          <li>이용 목적 및 보유 기간: 회원 인증 / Google의 개인정보처리방침에 따름</li>
          <li>
            연락처:{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
              policies.google.com/privacy
            </a>
          </li>
        </ul>
        <p>
          <strong>
            (2) Vercel Inc. (프론트엔드 호스팅 / CDN) 및 Railway Corp. (백엔드 + PostgreSQL DB 호스팅)
          </strong>
        </p>
        <ul>
          <li>이전받는 국가: 미국 (United States)</li>
          <li>이전 일시 및 방법: 서비스 이용 시점에 HTTPS/TLS로 전송 및 저장</li>
          <li>
            이전 항목: 위 1항의 수집 항목 전체, 사용자가 등록한 북마크/도서관 데이터, 접속 IP, 세션 쿠키
          </li>
          <li>이용 목적 및 보유 기간: 서비스 운영 / 위 3항의 보유 기간에 따름</li>
          <li>
            연락처:{' '}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">
              vercel.com/legal/privacy-policy
            </a>
            ,{' '}
            <a href="https://railway.com/legal/privacy" target="_blank" rel="noreferrer">
              railway.com/legal/privacy
            </a>
          </li>
        </ul>
      </Section>

      <Section title="7. 정보주체의 권리·의무 및 행사방법">
        <p>정보주체는 언제든지 다음 권리를 행사할 수 있습니다.</p>
        <ul>
          <li>개인정보 열람 요구</li>
          <li>오류 등이 있을 경우 정정 요구</li>
          <li>삭제 요구(탈퇴)</li>
          <li>처리 정지 요구</li>
        </ul>
        <p>
          권리 행사는 서비스 내 설정 메뉴 또는 아래 연락처로 서면, 전자우편 등을 통하여 하실 수
          있으며 서비스는 이에 대해 지체 없이 조치하겠습니다.
        </p>
      </Section>

      <Section title="8. 개인정보의 안전성 확보 조치">
        <ul>
          <li>전송 구간 암호화(HTTPS/TLS)</li>
          <li>개인정보가 저장된 데이터베이스에 대한 접근 제한</li>
          <li>침입 차단 및 인증 로깅</li>
          <li>최소 권한 원칙에 따른 운영자 접근 통제</li>
        </ul>
      </Section>

      <Section title="9. 개인정보 자동 수집 장치 (쿠키)">
        <p>
          서비스는 로그인 세션 유지를 위해 필수적인 쿠키(JSESSIONID 등)를 사용합니다. 분석/광고
          목적의 제3자 쿠키는 사용하지 않습니다. 브라우저 설정에서 쿠키 저장을 거부할 수 있으나
          이 경우 서비스 이용에 일부 제한이 있을 수 있습니다.
        </p>
      </Section>

      <Section title="10. 개인정보보호 책임자">
        <ul>
          <li>책임자: {OPERATOR_NAME}</li>
          <li>이메일: {CONTACT_EMAIL}</li>
        </ul>
        <p>
          정보주체는 서비스 이용 중 발생하는 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에
          관한 사항을 위 연락처로 문의하실 수 있습니다.
        </p>
      </Section>

      <Section title="11. 권익침해 구제방법">
        <ul>
          <li>개인정보분쟁조정위원회 (kopico.go.kr / 1833-6972)</li>
          <li>개인정보침해신고센터 (privacy.kisa.or.kr / 118)</li>
          <li>대검찰청 사이버범죄수사단 (spo.go.kr / 1301)</li>
          <li>경찰청 사이버수사국 (ecrm.cyber.go.kr / 182)</li>
        </ul>
      </Section>

      <Section title="12. 처리방침의 변경">
        <p>
          본 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및
          정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지를 통하여 고지합니다.
        </p>
      </Section>
    </LegalPageShell>
  )
}

function LegalPageShell({
  title,
  effectiveDate,
  children,
}: {
  title: string
  effectiveDate: string
  children: React.ReactNode
}) {
  return (
    <div className="min-h-full bg-(--color-surface-base)">
      <header className="border-b border-(--color-line) bg-(--color-surface-raised)/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="text-sm text-(--color-walnut-500) hover:text-(--color-walnut-700) font-medium"
          >
            ← 도서관으로
          </Link>
          <span className="text-xs text-(--color-ink-faint)">시행일: {effectiveDate}</span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 leading-relaxed text-(--color-ink) [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-(--color-ink-strong)">
        <h1 className="font-display text-3xl font-semibold text-(--color-ink-strong) mb-8 tracking-tight">
          {title}
        </h1>
        <div className="space-y-8 text-[15px]">{children}</div>
      </main>
      <footer className="mt-12 py-8 border-t border-(--color-line-soft) text-center">
        <p className="text-xs text-(--color-ink-faint)">📚 북마크 도서관</p>
      </footer>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-(--color-ink-strong) mb-3 tracking-tight">
        {title}
      </h2>
      <div className="space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5">{children}</div>
    </section>
  )
}
