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
  /** AI-generated tags (2-4 items). Empty for pre-AI books or opted-out users. */
  tags: string[]
  /** AI-generated 1-2 sentence Korean summary. Null when AI is disabled/failed. */
  aiSummary?: string
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

/** Hard cap on bookshelves per library. Mirrors Library.MAX_BOOKSHELVES on the backend. */
export const MAX_BOOKSHELVES_PER_LIBRARY = 8

/** Hard cap on libraries per user. Mirrors User.MAX_LIBRARIES on the backend. */
export const MAX_LIBRARIES_PER_USER = 3

export interface Library {
  id: number
  slug: string
  title: string
  paletteName: string
  floorPaletteName: string
  welcomeMessage?: string
  entranceMood: EntranceMood
  isPublic: boolean
  ownerUsername: string
  ownerDisplayName: string
  bookshelves: Bookshelf[]
}

export interface LibrarySummary {
  id: number
  slug: string
  title: string
  sortOrder: number
  isPublic: boolean
  isCurrent: boolean
  bookshelfCount: number
}

// ─── Library ────────────────────────────────────────────

export async function fetchMyLibrary(): Promise<Library> {
  const { data } = await apiClient.get<Library>('/library')
  return data
}

/**
 * Fetch a public library. If `slug` is provided, fetches that specific library;
 * otherwise returns the user's first public library (legacy short URL).
 * 404 if not public or doesn't exist.
 */
export async function fetchPublicLibrary(username: string, slug?: string): Promise<Library> {
  const path = slug
    ? `/u/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/library`
    : `/u/${encodeURIComponent(username)}/library`
  const { data } = await apiClient.get<Library>(path)
  return data
}

// ─── Multi-library management ───────────────────────────

export async function fetchMyLibraries(): Promise<LibrarySummary[]> {
  const { data } = await apiClient.get<LibrarySummary[]>('/libraries')
  return data
}

export interface CreateLibraryPayload {
  title: string
  slug?: string
}

export async function createLibrary(payload: CreateLibraryPayload): Promise<Library> {
  const { data } = await apiClient.post<Library>('/libraries', payload)
  return data
}

export async function switchCurrentLibrary(libraryId: number): Promise<Library> {
  const { data } = await apiClient.post<Library>(`/libraries/${libraryId}/switch`)
  return data
}

export async function updateLibraryById(
  libraryId: number,
  payload: UpdateLibraryPayload,
): Promise<Library> {
  const { data } = await apiClient.patch<Library>(`/libraries/${libraryId}`, payload)
  return data
}

export interface UpdateLibraryPayload {
  title?: string
  paletteName?: string
  floorPaletteName?: string
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

export async function reorderBooksInShelf(
  bookshelfId: number,
  orderedBookIds: number[],
): Promise<Bookshelf> {
  const { data } = await apiClient.patch<Bookshelf>(
    `/bookshelves/${bookshelfId}/book-order`,
    { orderedBookIds },
  )
  return data
}

// ─── Book ───────────────────────────────────────────────

export interface CreateBookPayload {
  bookshelfId: number
  url: string
  title?: string
  siteName?: string
  coverColor?: string
  titleColor?: string
  /** True when the user did NOT touch the cover-color picker. Lets the
   *  backend optionally override the lastUsedColor default with a theme-color
   *  pulled from the page or an AI-suggested spine color. */
  coverColorAutoPicked?: boolean
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
