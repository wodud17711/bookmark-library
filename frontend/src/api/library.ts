import { apiClient } from './client'

export type BookshelfZone = 'PUBLIC' | 'PRIVATE'
export type EntranceMood = 'DAY' | 'EVENING' | 'NIGHT'

export interface Book {
  id: number
  url: string
  title: string
  siteName?: string
  coverColor: string
  titleColor: string
  position: number
  isFavorite: boolean
  faviconUrl?: string
  ogImageUrl?: string
}

export interface Bookshelf {
  id: number
  title: string
  zone: BookshelfZone
  position: number
  maxBooks: number
  woodColor: string
  books: Book[]
}

export interface Library {
  id: number
  title: string
  paletteName: string
  welcomeMessage?: string
  entranceMood: EntranceMood
  isPublic: boolean
  ownerUsername: string
  ownerDisplayName: string
  bookshelves: Bookshelf[]
}

// ─── Library ────────────────────────────────────────────

export async function fetchMyLibrary(): Promise<Library> {
  const { data } = await apiClient.get<Library>('/library')
  return data
}

export interface UpdateLibraryPayload {
  title?: string
  paletteName?: string
  welcomeMessage?: string
  entranceMood?: EntranceMood
  isPublic?: boolean
}

export async function updateLibrary(payload: UpdateLibraryPayload): Promise<Library> {
  const { data } = await apiClient.patch<Library>('/library', payload)
  return data
}

// ─── Bookshelf ──────────────────────────────────────────

export interface CreateBookshelfPayload {
  title: string
  zone?: BookshelfZone
  woodColor?: string
}

export interface UpdateBookshelfPayload {
  title?: string
  zone?: BookshelfZone
  position?: number
  woodColor?: string
}

export async function createBookshelf(payload: CreateBookshelfPayload): Promise<Bookshelf> {
  const { data } = await apiClient.post<Bookshelf>('/bookshelves', payload)
  return data
}

export async function updateBookshelf(id: number, payload: UpdateBookshelfPayload): Promise<Bookshelf> {
  const { data } = await apiClient.patch<Bookshelf>(`/bookshelves/${id}`, payload)
  return data
}

export async function deleteBookshelf(id: number): Promise<void> {
  await apiClient.delete(`/bookshelves/${id}`)
}

// ─── Book ───────────────────────────────────────────────

export interface CreateBookPayload {
  bookshelfId: number
  url: string
  title?: string
  siteName?: string
  coverColor?: string
  titleColor?: string
}

export interface UpdateBookPayload {
  title?: string
  siteName?: string
  coverColor?: string
  titleColor?: string
  position?: number
  bookshelfId?: number
  isFavorite?: boolean
}

export async function createBook(payload: CreateBookPayload): Promise<Book> {
  const { data } = await apiClient.post<Book>('/books', payload)
  return data
}

export async function updateBook(id: number, payload: UpdateBookPayload): Promise<Book> {
  const { data } = await apiClient.patch<Book>(`/books/${id}`, payload)
  return data
}

export async function deleteBook(id: number): Promise<void> {
  await apiClient.delete(`/books/${id}`)
}

export async function moveBookToStorage(id: number): Promise<void> {
  await apiClient.post(`/books/${id}/to-storage`)
}
