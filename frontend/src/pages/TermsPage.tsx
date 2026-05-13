import { Link } from 'react-router-dom'

const OPERATOR_NAME = 'wodud17711'
const CONTACT_EMAIL = 'jaeyoung17711@gmail.com'
const EFFECTIVE_DATE = '2026-05-13'

export default function TermsPage() {
  return (
    <LegalPageShell title="이용약관" effectiveDate={EFFECTIVE_DATE}>
      <Article title="제1조 (목적)">
        <p>
          본 약관은 {OPERATOR_NAME}(이하 "운영자")가 제공하는 북마크 도서관 서비스(이하 "서비스")의
          이용과 관련하여 운영자와 이용자의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을
          목적으로 합니다.
        </p>
      </Article>

      <Article title="제2조 (정의)">
        <ul>
          <li>"서비스": 북마크를 책장 메타포로 시각화·관리·공유하는 웹 애플리케이션.</li>
          <li>"이용자": 본 약관에 따라 서비스를 이용하는 회원.</li>
          <li>"도서관": 이용자가 서비스 내에서 만든 북마크 모음의 단위. 사용자당 최대 3개.</li>
          <li>"책장": 도서관 내 분류 단위. 도서관당 최대 8개, 책장당 최대 30권.</li>
          <li>"창고": 도서관 한도를 초과하는 북마크의 보관 공간. 사용자당 1개, 무제한.</li>
        </ul>
      </Article>

      <Article title="제3조 (약관의 효력 및 변경)">
        <ol>
          <li>본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</li>
          <li>
            운영자는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며,
            변경 시에는 시행일로부터 7일 전(이용자에게 불리한 변경의 경우 30일 전)에 서비스
            화면에 공지합니다.
          </li>
          <li>
            이용자가 변경된 약관에 동의하지 않는 경우 회원 탈퇴를 요청할 수 있으며, 공지 후
            적용일까지 거부 의사를 표시하지 않으면 변경에 동의한 것으로 봅니다.
          </li>
        </ol>
      </Article>

      <Article title="제4조 (회원가입 및 자격)">
        <ol>
          <li>
            회원가입은 Google OAuth를 통한 인증으로 이루어집니다. Google 계정으로 최초 로그인 시
            이용자는 본 약관 및 개인정보처리방침에 동의한 것으로 간주됩니다.
          </li>
          <li>
            운영자는 다음 각 호에 해당하는 경우 가입을 거절하거나 사후에 이용계약을 해지할 수
            있습니다.
            <ul>
              <li>타인의 정보를 도용한 경우</li>
              <li>이전에 회원자격을 상실한 적이 있는 경우</li>
              <li>본 약관에 위배되거나 위법, 부당한 이용신청임이 확인된 경우</li>
            </ul>
          </li>
        </ol>
      </Article>

      <Article title="제5조 (서비스의 내용)">
        <ol>
          <li>
            운영자는 다음과 같은 서비스를 제공합니다:
            <ul>
              <li>북마크의 등록, 수정, 삭제, 분류</li>
              <li>도서관 시각화 및 꾸미기 (테마, 마룻바닥, 입구 분위기 등)</li>
              <li>도서관 공개 URL을 통한 공유</li>
              <li>창고 시스템 및 북마크 일괄 가져오기(import)</li>
              <li>생성형 AI(Google Gemini)를 활용한 북마크 자동 태그·요약</li>
            </ul>
          </li>
          <li>운영자는 서비스의 향상을 위해 기능을 추가·변경·중단할 수 있습니다.</li>
        </ol>
      </Article>

      <Article title="제5조의2 (AI 기반 부가 기능)">
        <ol>
          <li>
            서비스는 신규 북마크 등록 시 외부 생성형 AI 모델(Google Gemini API)을 호출하여
            해당 페이지의 제목·본문 일부를 분석하고 자동 태그(2~4개) 및 한 줄 요약을 생성하여
            함께 저장합니다.
          </li>
          <li>
            본 기능은 기본적으로 활성화되며, 이용자는 서비스 설정 메뉴의 "AI 자동 분류" 항목에서
            언제든지 비활성화할 수 있습니다. 비활성화 시 신규 북마크에 대한 AI 처리는 중지되며,
            기존에 생성된 태그·요약은 그대로 유지됩니다.
          </li>
          <li>
            AI가 생성한 결과는 모델의 한계로 인해 부정확하거나 부적절한 표현을 포함할 수 있으며,
            운영자는 이에 대한 정확성이나 적합성을 보장하지 않습니다. 이용자는 책별 편집 기능을
            통해 결과를 수정·삭제할 수 있습니다.
          </li>
          <li>
            AI 처리를 위한 외부 데이터 이전의 구체적인 범위·국가·연락처는{' '}
            <Link to="/privacy" className="text-(--color-walnut-500) hover:text-(--color-walnut-700)">
              개인정보처리방침
            </Link>{' '}
            제6조를 참고하시기 바랍니다.
          </li>
        </ol>
      </Article>

      <Article title="제6조 (이용자의 의무)">
        <p>이용자는 다음 행위를 하여서는 안 됩니다.</p>
        <ul>
          <li>타인의 저작권, 상표권, 초상권, 사생활 등 권리를 침해하는 URL 또는 콘텐츠의 등록</li>
          <li>음란물, 폭력, 도박 등 사회질서를 위반하는 콘텐츠의 등록 및 공유</li>
          <li>피싱, 멀웨어, 사기성 링크의 등록 및 공유</li>
          <li>서비스의 정상적인 운영을 방해하는 행위(자동화 도구를 통한 비정상적 접근 등)</li>
          <li>운영자 또는 제3자의 명예를 훼손하거나 업무를 방해하는 행위</li>
          <li>법령 또는 본 약관이 금지하는 기타 행위</li>
        </ul>
        <p>
          이용자가 등록한 북마크 및 표시 정보(도서관 이름, 환영 메시지 등)에 대한 책임은 전적으로
          이용자에게 있으며, 위 의무 위반으로 발생한 문제에 대해 운영자는 책임지지 않습니다.
        </p>
      </Article>

      <Article title="제6조의2 (콘텐츠 신고 및 운영자의 조치 권한)">
        <ol>
          <li>
            누구든지 공개 도서관에서 본 약관 제6조의 의무를 위반하는 콘텐츠를 발견한 경우
            서비스 내 "🚩 신고" 기능 또는 운영자 이메일을 통해 신고할 수 있습니다.
          </li>
          <li>
            운영자는 신고가 접수된 콘텐츠에 대하여 검토 후 24~48시간 내에 처리하도록 노력하며,
            위반이 명백한 경우 사전 통지 없이 해당 도서관을 비공개 처리하거나 콘텐츠를
            삭제할 수 있습니다.
          </li>
          <li>
            긴급한 권리 침해(저작권, 명예훼손, 개인정보 노출 등)가 신고된 경우 운영자는
            즉시 해당 콘텐츠를 비공개로 전환하고 사후 검토할 수 있습니다.
          </li>
          <li>
            허위 또는 반복적인 부적절한 신고가 확인된 경우 운영자는 해당 신고자의 신고
            기능을 제한하거나 계정의 이용을 정지할 수 있습니다.
          </li>
        </ol>
      </Article>

      <Article title="제7조 (운영자의 의무 및 책임 제한)">
        <ol>
          <li>
            운영자는 관련 법령과 본 약관이 금지하는 행위를 하지 않으며, 안정적인 서비스 제공을 위해
            노력합니다.
          </li>
          <li>
            운영자는 천재지변, 전쟁, 통신장애, 정전, 시스템 점검 또는 보수 등 불가항력적인 사유로
            서비스를 제공할 수 없는 경우 책임을 지지 않습니다.
          </li>
          <li>
            본 서비스는 무료로 제공되며, 데이터 손실에 대비한 백업은 이용자의 책임입니다.
            운영자는 데이터 손실에 대해 합리적인 범위 내에서 복구를 시도하나, 복구가 불가능한
            경우의 손해에 대해 책임을 지지 않습니다.
          </li>
        </ol>
      </Article>

      <Article title="제8조 (개인정보 보호)">
        <p>
          운영자는 이용자의 개인정보를{' '}
          <Link to="/privacy" className="text-(--color-walnut-500) hover:text-(--color-walnut-700)">
            개인정보처리방침
          </Link>
          에 따라 보호합니다.
        </p>
      </Article>

      <Article title="제9조 (서비스 이용계약의 해지)">
        <ol>
          <li>이용자는 언제든지 서비스 내 설정 메뉴 또는 운영자에게 통지하여 탈퇴할 수 있습니다.</li>
          <li>탈퇴 시 이용자가 등록한 북마크, 도서관 데이터는 즉시 삭제됩니다.</li>
          <li>
            운영자는 이용자가 본 약관을 위반한 경우 사전 통지 후 또는 즉시 이용계약을 해지할 수
            있습니다.
          </li>
        </ol>
      </Article>

      <Article title="제10조 (저작권 및 콘텐츠의 귀속)">
        <ol>
          <li>이용자가 등록한 북마크 및 도서관의 텍스트·이미지에 대한 저작권은 이용자에게 귀속됩니다.</li>
          <li>
            이용자는 자신이 등록한 콘텐츠에 대해 운영자에게 서비스 운영, 표시, 백업, 통계 분석에
            필요한 범위 내에서 무상의 비독점적 이용을 허락한 것으로 봅니다.
          </li>
        </ol>
      </Article>

      <Article title="제11조 (분쟁의 해결)">
        <ol>
          <li>
            본 약관 및 서비스 이용과 관련하여 분쟁이 발생한 경우, 운영자와 이용자는 상호 신의에
            따라 협의하여 해결합니다.
          </li>
          <li>협의가 이루어지지 않을 경우 관련 법령 및 상관례에 따릅니다.</li>
          <li>본 약관은 대한민국 법령에 따라 해석됩니다.</li>
        </ol>
      </Article>

      <Article title="문의">
        <p>본 약관 또는 서비스에 관한 문의는 {CONTACT_EMAIL} 로 보내주시기 바랍니다.</p>
      </Article>
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
      <main className="max-w-3xl mx-auto px-6 py-12 leading-relaxed text-(--color-ink)">
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

function Article({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-(--color-ink-strong) mb-3 tracking-tight">
        {title}
      </h2>
      <div className="space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5 [&_ol_ul]:mt-1.5">
        {children}
      </div>
    </section>
  )
}
