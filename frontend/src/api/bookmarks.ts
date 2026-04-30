import { apiClient } from './client'

export type ImportMode = 'SHELVES' | 'STORAGE'

export interface ImportEntry {
  url: string
  title: string
  siteName?: string
  folderPath: string
}

export interface ImportRequest {
  mode: ImportMode
  entries: ImportEntry[]
}

export interface ImportSummary {
  mode: ImportMode
  booksImported: number
  shelvesCreated: number
  storedCount: number
  warnings: string[]
}

export async function importBookmarks(request: ImportRequest): Promise<ImportSummary> {
  const { data } = await apiClient.post<ImportSummary>('/bookmarks/import', request)
  return data
}
