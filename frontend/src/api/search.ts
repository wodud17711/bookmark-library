import { apiClient } from './client'

export interface BookHit {
  id: number
  title: string
  url: string
  siteName?: string
  coverColor: string
  isFavorite: boolean
  position: number
  bookshelfId: number
  bookshelfTitle: string
  bookshelfZone: 'PUBLIC' | 'PRIVATE'
  libraryId: number
  librarySlug: string
  libraryTitle: string
  isCurrentLibrary: boolean
}

export interface StoredHit {
  id: number
  title: string
  url: string
  siteName?: string
  originalFolder?: string
}

export interface SearchResponse {
  query: string
  books: BookHit[]
  stored: StoredHit[]
}

export async function searchLibrary(query: string): Promise<SearchResponse> {
  const { data } = await apiClient.get<SearchResponse>('/search', {
    params: { q: query },
  })
  return data
}
