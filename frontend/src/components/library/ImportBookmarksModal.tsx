import { useEffect, useRef, useState } from 'react'
import { Button, Modal } from '../ui'
import { parseBookmarksHtml, type ParseResult } from '../../utils/parseBookmarksHtml'
import { importBookmarks, type ImportMode, type ImportSummary } from '../../api/bookmarks'
import {
  fetchMyLibraries,
  MAX_BOOKSHELVES_PER_LIBRARY,
  type LibrarySummary,
} from '../../api/library'
import { extractApiErrorMessage } from '../../api/client'

interface Props {
  open: boolean
  onClose: () => void
  onImported: () => void
}

type Stage = 'pick' | 'preview' | 'importing' | 'done'

export function ImportBookmarksModal({ open, onClose, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('pick')
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [mode, setMode] = useState<ImportMode>('SHELVES')
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [libraries, setLibraries] = useState<LibrarySummary[]>([])
  const [targetLibraryId, setTargetLibraryId] = useState<number | null>(null)

  const reset = () => {
    setStage('pick')
    setParsed(null)
    setMode('SHELVES')
    setSummary(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  // Fetch libraries each time the modal opens, so newly created ones appear.
  useEffect(() => {
    if (!open) return
    fetchMyLibraries()
      .then((list) => {
        setLibraries(list)
        // Default to the current library
        const current = list.find((l) => l.isCurrent) ?? list[0]
        if (current) setTargetLibraryId(current.id)
      })
      .catch(() => {})
  }, [open])

  const targetLibrary = libraries.find((l) => l.id === targetLibraryId) ?? null
  const currentShelfCount = targetLibrary?.bookshelfCount ?? 0
  const remainingSlots = MAX_BOOKSHELVES_PER_LIBRARY - currentShelfCount

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    try {
      const text = await file.text()
      const result = parseBookmarksHtml(text)
      if (result.bookmarks.length === 0) {
        setError('이 파일에서 북마크를 찾지 못했어요. Chrome에서 내보낸 북마크 HTML 파일이 맞는지 확인해주세요.')
        return
      }
      setParsed(result)
      setStage('preview')
    } catch (err) {
      setError(extractApiErrorMessage(err, '파일을 읽지 못했습니다.'))
    }
  }

  const handleImport = async () => {
    if (!parsed) return
    setStage('importing')
    setError(null)
    try {
      const result = await importBookmarks({
        mode,
        libraryId: mode === 'SHELVES' ? targetLibraryId ?? undefined : undefined,
        entries: parsed.bookmarks.map((b) => ({
          url: b.url,
          title: b.title,
          siteName: b.siteName,
          folderPath: b.folderPath,
        })),
      })
      setSummary(result)
      setStage('done')
      onImported()
    } catch (err) {
      setError(extractApiErrorMessage(err, '가져오기에 실패했습니다.'))
      setStage('preview')
    }
  }

  const sizeProjection = parsed ? projectShelves(parsed) : null

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="북마크 가져오기"
      size="lg"
      footer={
        stage === 'pick' ? (
          <Button type="button" variant="ghost" onClick={handleClose}>
            취소
          </Button>
        ) : stage === 'preview' ? (
          <>
            <Button type="button" variant="ghost" onClick={reset}>
              다른 파일
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="ghost" onClick={handleClose}>
              취소
            </Button>
            <Button type="button" onClick={handleImport}>
              {parsed?.bookmarks.length}권 가져오기
            </Button>
          </>
        ) : stage === 'importing' ? (
          <Button disabled>가져오는 중…</Button>
        ) : (
          <Button onClick={handleClose}>완료</Button>
        )
      }
    >
      {stage === 'pick' && (
        <div className="space-y-5">
          <div className="text-sm text-(--color-ink) leading-relaxed">
            <p className="font-medium text-(--color-ink-strong) mb-2">Chrome에서 북마크 내보내기</p>
            <ol className="list-decimal pl-5 space-y-1 text-(--color-ink-muted)">
              <li>주소창에 <code className="px-1 py-0.5 bg-(--color-surface-sunken) rounded text-xs">chrome://bookmarks</code> 입력</li>
              <li>우상단 ⋮ 메뉴 → "북마크 내보내기"</li>
              <li>저장된 <code className="px-1 py-0.5 bg-(--color-surface-sunken) rounded text-xs">.html</code> 파일을 아래에 업로드</li>
            </ol>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".html,.htm,text/html"
              onChange={handleFileChange}
              className="block w-full text-sm
                         file:mr-3 file:py-2.5 file:px-5
                         file:rounded-(--radius-sm)
                         file:border-0
                         file:bg-(--color-walnut-500) file:text-white
                         file:font-medium
                         file:cursor-pointer
                         hover:file:bg-(--color-walnut-700)"
            />
          </div>

          {error && <p className="text-sm text-(--color-danger)">{error}</p>}
        </div>
      )}

      {stage === 'preview' && parsed && (
        <div className="space-y-5">
          <div className="bg-(--color-surface-sunken) rounded-(--radius-sm) p-4 space-y-1.5 text-sm">
            <Stat label="북마크" value={`${parsed.stats.totalBookmarks}권`} />
            <Stat label="폴더" value={`${parsed.stats.totalFolders}개`} />
            <Stat label="최대 깊이" value={`${parsed.stats.maxDepth}단계`} />
            {sizeProjection && (
              <Stat
                label="예상 책장 수"
                value={`${sizeProjection.shelves}개${sizeProjection.split > 0 ? ` (${sizeProjection.split}개 분할)` : ''}`}
              />
            )}
          </div>

          {/* Library picker — only matters for SHELVES mode but shown always for clarity */}
          <div>
            <label
              htmlFor="import-target-library"
              className="text-sm font-medium text-(--color-ink-strong) block mb-1.5"
            >
              어느 도서관에 가져올까요?
              {mode === 'STORAGE' && (
                <span className="ml-2 text-xs text-(--color-ink-muted) font-normal">
                  (창고로 보내기 모드는 도서관과 무관)
                </span>
              )}
            </label>
            <select
              id="import-target-library"
              value={targetLibraryId ?? ''}
              onChange={(e) => setTargetLibraryId(e.target.value ? Number(e.target.value) : null)}
              disabled={mode === 'STORAGE' || libraries.length === 0}
              className="w-full px-3.5 py-2.5 text-[15px] bg-(--color-surface-raised)
                         text-(--color-ink-strong) border border-(--color-line) rounded-(--radius-sm)
                         focus:outline-none focus:border-(--color-walnut-500) focus:ring-2 focus:ring-(--color-walnut-300)/40
                         disabled:bg-(--color-surface-sunken) disabled:cursor-not-allowed"
            >
              {libraries.map((lib) => {
                const remaining = MAX_BOOKSHELVES_PER_LIBRARY - lib.bookshelfCount
                return (
                  <option key={lib.id} value={lib.id}>
                    {lib.title} (책장 {lib.bookshelfCount} / {MAX_BOOKSHELVES_PER_LIBRARY}
                    {remaining <= 0 ? ' · 가득' : ` · ${remaining}칸 여유`})
                    {lib.isCurrent ? ' · 현재' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          {parsed.stats.folderSizes.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-(--color-ink-muted) hover:text-(--color-ink)">
                폴더별 책 수 보기
              </summary>
              <ul className="mt-2 max-h-40 overflow-auto pl-4 space-y-0.5 text-(--color-ink-muted)">
                {parsed.stats.folderSizes.slice(0, 50).map((f) => (
                  <li key={f.path}>
                    <span className="text-(--color-ink)">{f.count}권</span> · {f.path}
                  </li>
                ))}
                {parsed.stats.folderSizes.length > 50 && (
                  <li className="italic">... 외 {parsed.stats.folderSizes.length - 50}개</li>
                )}
              </ul>
            </details>
          )}

          {sizeProjection && mode === 'SHELVES' && sizeProjection.shelves > remainingSlots && (
            <div className="rounded-(--radius-sm) p-4 bg-(--color-walnut-50) border border-(--color-walnut-100) text-sm leading-relaxed">
              <p className="font-medium text-(--color-walnut-700) mb-1">
                ⚠ 책장 한도를 넘는 폴더가 있습니다
              </p>
              <p className="text-(--color-ink) text-xs">
                선택한 도서관 <strong>"{targetLibrary?.title ?? ''}"</strong>에는 책장 {remainingSlots}칸 여유가 있는데
                예상 {sizeProjection.shelves}개 책장이 만들어집니다.
                남는 폴더는 자동으로 <strong>창고로 보관</strong>됩니다.
                전체를 책장으로 정리하려면 <strong>다른 도서관을 선택</strong>하거나 새 도서관을 만들어주세요.
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-(--color-ink-strong) mb-2">어떻게 가져올까요?</p>
            <div className="grid grid-cols-1 gap-2">
              <ModeOption
                selected={mode === 'SHELVES'}
                onClick={() => setMode('SHELVES')}
                title="자동으로 책장 만들기"
                description="폴더 구조대로 책장을 만들어 위에서 선택한 도서관에 진열합니다. 30권 초과 폴더는 자동으로 분할됩니다."
              />
              <ModeOption
                selected={mode === 'STORAGE'}
                onClick={() => setMode('STORAGE')}
                title="창고로 모두 보내기"
                description="우선 창고에 보관하고 천천히 책장으로 옮기며 정리합니다. 도서관 풍경은 깔끔하게 유지됩니다."
              />
            </div>
          </div>

          {mode === 'SHELVES' && (
            <p className="text-xs text-(--color-ink-faint) leading-relaxed bg-(--color-surface-sunken) rounded-(--radius-xs) px-3 py-2.5">
              처음 50권은 AI가 백그라운드에서 제목과 색상을 천천히 정리해드려요.
              책은 먼저 책장에 꽂히고, 잠시 후 새로고침하면 정리된 모습이 보여요.
              (무료 모델 사용 중이라 50권 처리에 6분 정도 걸려요)
            </p>
          )}

          {error && <p className="text-sm text-(--color-danger)">{error}</p>}
        </div>
      )}

      {stage === 'importing' && (
        <div className="text-center py-12">
          <p className="text-(--color-ink-muted)">잠시만요, 책을 옮기고 있어요…</p>
        </div>
      )}

      {stage === 'done' && summary && (
        <div className="space-y-4">
          <div className="bg-(--color-walnut-50) rounded-(--radius-sm) p-5 text-center">
            <p className="text-2xl font-display font-semibold text-(--color-walnut-700) mb-1">
              완료!
            </p>
            <p className="text-sm text-(--color-ink) mt-3">
              {summary.mode === 'SHELVES' ? (
                <>
                  <strong>{summary.shelvesCreated}개</strong> 책장에{' '}
                  <strong>{summary.booksImported}권</strong> 진열됨
                  {summary.storedCount > 0 && (
                    <>, <strong>{summary.storedCount}권</strong>은 창고로</>
                  )}
                </>
              ) : (
                <>창고에 <strong>{summary.storedCount}권</strong> 보관됨</>
              )}
            </p>
          </div>

          {summary.warnings.length > 0 && (
            <ul className="text-xs text-(--color-ink-muted) space-y-1 max-h-40 overflow-auto">
              {summary.warnings.map((w, i) => (
                <li key={i}>· {w}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-(--color-ink-muted) w-20">{label}</span>
      <span className="font-medium text-(--color-ink-strong)">{value}</span>
    </div>
  )
}

function ModeOption({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean
  onClick: () => void
  title: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'text-left p-4 rounded-(--radius-sm) border transition-all',
        selected
          ? 'border-(--color-walnut-500) bg-(--color-walnut-50)'
          : 'border-(--color-line) hover:border-(--color-walnut-300)',
      ].join(' ')}
    >
      <p className="font-medium text-(--color-ink-strong) text-sm mb-1">{title}</p>
      <p className="text-xs text-(--color-ink-muted) leading-relaxed">{description}</p>
    </button>
  )
}

/**
 * Predict how many shelves "auto-organize" will create, accounting for the
 * 30-book-per-shelf split, so users see this before clicking Import.
 */
function projectShelves(parsed: ParseResult): { shelves: number; split: number } {
  const MAX = 30
  let total = 0
  let split = 0
  for (const folder of parsed.stats.folderSizes) {
    const chunks = Math.max(1, Math.ceil(folder.count / MAX))
    total += chunks
    if (chunks > 1) split++
  }
  return { shelves: total, split }
}
