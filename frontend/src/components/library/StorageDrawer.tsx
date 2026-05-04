import { useEffect, useMemo, useState } from 'react'
import { Button, IconButton, Modal } from '../ui'
import {
  deleteStoredBook,
  fetchStoredBooks,
  moveStoredBooks,
  type StoredBook,
} from '../../api/storage'
import type { Bookshelf } from '../../api/library'
import { extractApiErrorMessage } from '../../api/client'

interface Props {
  open: boolean
  shelves: Bookshelf[]
  onClose: () => void
  onChanged: () => void
}

export function StorageDrawer({ open, shelves, onClose, onChanged }: Props) {
  const [books, setBooks] = useState<StoredBook[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [targetShelfId, setTargetShelfId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) return
    setError(null)
    setLoading(true)
    fetchStoredBooks()
      .then((data) => {
        setBooks(data)
        setSelected(new Set())
      })
      .catch((e) => setError(extractApiErrorMessage(e, '불러오기 실패')))
      .finally(() => setLoading(false))
  }, [open])

  // Filtered list — search applies to title, URL, and originalFolder.
  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return books
    return books.filter((b) => {
      return (
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        (b.originalFolder ?? '').toLowerCase().includes(q) ||
        (b.siteName ?? '').toLowerCase().includes(q)
      )
    })
  }, [books, search])

  const groupedByFolder = useMemo(() => {
    const map = new Map<string, StoredBook[]>()
    for (const b of filteredBooks) {
      const key = b.originalFolder || '(폴더 없음)'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [filteredBooks])

  // "전체" 체크박스는 현재 화면에 보이는(필터된) 책들 기준으로 동작
  const allSelected = filteredBooks.length > 0 && filteredBooks.every((b) => selected.has(b.id))

  const toggleAll = () => {
    if (allSelected) {
      // Uncheck all currently visible
      const next = new Set(selected)
      filteredBooks.forEach((b) => next.delete(b.id))
      setSelected(next)
    } else {
      const next = new Set(selected)
      filteredBooks.forEach((b) => next.add(b.id))
      setSelected(next)
    }
  }
  const toggleOne = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }
  const toggleGroup = (groupBooks: StoredBook[]) => {
    const allInGroup = groupBooks.every((b) => selected.has(b.id))
    const next = new Set(selected)
    for (const b of groupBooks) {
      if (allInGroup) next.delete(b.id)
      else next.add(b.id)
    }
    setSelected(next)
  }

  const handleMove = async () => {
    if (!targetShelfId || selected.size === 0) return
    setError(null)
    try {
      const moved = await moveStoredBooks({
        bookshelfId: targetShelfId,
        storedBookIds: [...selected],
      })
      setBooks((prev) => prev.filter((b) => !selected.has(b.id)))
      setSelected(new Set())
      onChanged()
      if (moved < selected.size) {
        setError(`${moved}권만 옮겼습니다.`)
      }
    } catch (e) {
      setError(extractApiErrorMessage(e, '옮기기 실패'))
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteStoredBook(id)
      setBooks((prev) => prev.filter((b) => b.id !== id))
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      onChanged()
    } catch (e) {
      setError(extractApiErrorMessage(e, '삭제 실패'))
    }
  }

  const handleBulkDelete = async () => {
    if (selected.size === 0) return
    const ok = window.confirm(
      `선택한 ${selected.size}권을 창고에서 삭제할까요?\n되돌릴 수 없습니다.`,
    )
    if (!ok) return
    setError(null)
    const ids = [...selected]
    try {
      await Promise.all(ids.map((id) => deleteStoredBook(id)))
      setBooks((prev) => prev.filter((b) => !selected.has(b.id)))
      setSelected(new Set())
      onChanged()
    } catch (e) {
      setError(extractApiErrorMessage(e, '일부 삭제 실패 — 새로고침 후 다시 시도해주세요.'))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="📦 창고" size="lg">
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-(--color-ink-muted) text-center py-12">불러오는 중…</p>
        ) : books.length === 0 ? (
          <p className="text-sm text-(--color-ink-muted) text-center py-12">
            창고가 비어있습니다.
          </p>
        ) : (
          <>
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="책 제목, URL, 폴더로 검색…"
                className="w-full pl-9 pr-9 py-2.5 text-sm bg-(--color-surface-raised)
                           border border-(--color-line) rounded-(--radius-sm)
                           focus:outline-none focus:border-(--color-walnut-500) focus:ring-2 focus:ring-(--color-walnut-300)/40"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--color-ink-muted) text-sm">🔍</span>
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="검색 지우기"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-(--color-ink-muted) hover:text-(--color-ink) px-1 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {filteredBooks.length === 0 && search && (
              <p className="text-sm text-(--color-ink-muted) text-center py-4">
                "{search}" 와(과) 일치하는 책이 없습니다.
              </p>
            )}

            <div className="flex items-center gap-3 flex-wrap p-3 bg-(--color-surface-sunken) rounded-(--radius-sm)">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none px-1 py-1 rounded hover:bg-(--color-surface-raised)/50">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-5 h-5 accent-(--color-walnut-500) cursor-pointer"
                />
                <span className="text-(--color-ink)">
                  {search ? `검색 결과 (${filteredBooks.length}권)` : `전체 (${books.length}권)`}
                </span>
              </label>
              {selected.size > 0 && (
                <span className="text-sm text-(--color-walnut-500) font-medium">
                  · {selected.size}권 선택
                </span>
              )}
              <div className="flex-1" />
              <Button
                size="sm"
                variant="danger"
                onClick={handleBulkDelete}
                disabled={selected.size === 0}
              >
                {selected.size > 0 ? `${selected.size}권 삭제` : '선택 삭제'}
              </Button>
              <select
                value={targetShelfId ?? ''}
                onChange={(e) => setTargetShelfId(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-1.5 text-sm rounded-(--radius-sm) border border-(--color-line) bg-(--color-surface-raised)"
              >
                <option value="">옮길 책장 선택…</option>
                {shelves.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.books.length >= s.maxBooks}>
                    {s.title} ({s.books.length}/{s.maxBooks}){s.zone === 'PRIVATE' ? ' 🔒' : ''}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                onClick={handleMove}
                disabled={!targetShelfId || selected.size === 0}
              >
                옮기기
              </Button>
            </div>

            {error && <p className="text-sm text-(--color-danger)">{error}</p>}

            <ul className="space-y-3 max-h-[60vh] overflow-auto pr-1">
              {groupedByFolder.map(([folder, groupBooks]) => {
                const groupSelected = groupBooks.every((b) => selected.has(b.id))
                const someSelected = groupBooks.some((b) => selected.has(b.id))
                return (
                  <li key={folder}>
                    <label className="flex items-center gap-2 mb-1.5 cursor-pointer select-none px-1 py-1 rounded hover:bg-(--color-surface-sunken)">
                      <input
                        type="checkbox"
                        checked={groupSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = !groupSelected && someSelected
                        }}
                        onChange={() => toggleGroup(groupBooks)}
                        className="w-5 h-5 accent-(--color-walnut-500) cursor-pointer"
                      />
                      <span className="text-xs font-medium text-(--color-ink-muted)">
                        {folder} · {groupBooks.length}권
                      </span>
                    </label>
                    <ul className="ml-6 space-y-0.5">
                      {groupBooks.map((b) => (
                        <li
                          key={b.id}
                          className="group flex items-center gap-1 rounded-(--radius-xs) hover:bg-(--color-surface-sunken)"
                        >
                          <label
                            className="flex items-center gap-3 flex-1 min-w-0 px-3 py-2 cursor-pointer select-none"
                            title={b.url}
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(b.id)}
                              onChange={() => toggleOne(b.id)}
                              className="w-5 h-5 accent-(--color-walnut-500) shrink-0 cursor-pointer"
                            />
                            <span className="flex-1 min-w-0 text-sm text-(--color-ink) truncate">
                              {b.title}
                            </span>
                          </label>
                          <IconButton
                            label="버리기"
                            size="sm"
                            onClick={() => handleDelete(b.id)}
                            className="opacity-0 group-hover:opacity-100 mr-1"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M2 3h8M5 5v4M7 5v4M3 3l1 7h4l1-7" stroke="currentColor" strokeWidth="1" />
                            </svg>
                          </IconButton>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </Modal>
  )
}
