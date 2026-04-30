import { apiClient } from './client'

export interface StoredBook {
  id: number
  url: string
  title: string
  siteName?: string
  originalFolder?: string
  addedAt: string
}

export async function fetchStoredBooks(): Promise<StoredBook[]> {
  const { data } = await apiClient.get<StoredBook[]>('/storage')
  return data
}

export async function fetchStorageCount(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>('/storage/count')
  return data.count
}

export interface MoveStoredBooksRequest {
  storedBookIds: number[]
  bookshelfId: number
}

export async function moveStoredBooks(request: MoveStoredBooksRequest): Promise<number> {
  const { data } = await apiClient.post<{ moved: number }>('/storage/move', request)
  return data.moved
}

export async function deleteStoredBook(id: number): Promise<void> {
  await apiClient.delete(`/storage/${id}`)
}
