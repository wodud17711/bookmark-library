import { useEffect, useMemo, useState } from 'react'
import { Button, IconButton, Modal } from '../ui'
import {
  deleteStoredBook,
  fetchStoredBooks,
  moveStoredBooks,
  type StoredBook,
} from '../../api/storage'
import type { Bookshelf } from '../../api/library'

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

  useEffect(() => {
    if (!open) return
    setError(null)
    setLoading(true)
    fetchStoredBooks()
      .then((data) => {
        setBooks(data)
        setSelected(new Set())
      })
      .catch((e) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setLoading(false))
  }, [open])

  const groupedByFolder = useMemo(() => {
    const map = new Map<string, StoredBook[]>()
    for (const b of books) {
      const key = b.originalFolder || '(폴더 없음)'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(b)
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [books])

  const allSelected = books.length > 0 && selected.size === books.length

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(books.map((b) => b.id)))
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
      setError(e instanceof Error ? e.message : '옮기기 실패')
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
      setError(e instanceof Error ? e.message : '삭제 실패')
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
            <div className="flex items-center gap-3 flex-wrap p-3 bg-(--color-surface-sunken) rounded-(--radius-sm)">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-(--color-walnut-500)"
                />
                <span className="text-(--color-ink)">
                  전체 ({books.length}권)
                </span>
              </label>
              {selected.size > 0 && (
                <span className="text-sm text-(--color-walnut-500) font-medium">
                  · {selected.size}권 선택
                </span>
              )}
              <div className="flex-1" />
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
                    <div className="flex items-center gap-2 mb-1.5">
                      <input
                        type="checkbox"
                        checked={groupSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = !groupSelected && someSelected
                        }}
                        onChange={() => toggleGroup(groupBooks)}
                        className="w-4 h-4 accent-(--color-walnut-500)"
                      />
                      <span className="text-xs font-medium text-(--color-ink-muted)">
                        {folder} · {groupBooks.length}권
                      </span>
                    </div>
                    <ul className="ml-6 space-y-0.5">
                      {groupBooks.map((b) => (
                        <li
                          key={b.id}
                          className="group flex items-center gap-2 px-2 py-1.5 rounded-(--radius-xs) hover:bg-(--color-surface-sunken)"
                        >
                          <input
                            type="checkbox"
                            checked={selected.has(b.id)}
                            onChange={() => toggleOne(b.id)}
                            className="w-3.5 h-3.5 accent-(--color-walnut-500) shrink-0"
                          />
                          <span
                            className="flex-1 min-w-0 text-sm text-(--color-ink) truncate"
                            title={b.url}
                          >
                            {b.title}
                          </span>
                          <IconButton
                            label="버리기"
                            size="sm"
                            onClick={() => handleDelete(b.id)}
                            className="opacity-0 group-hover:opacity-100"
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
