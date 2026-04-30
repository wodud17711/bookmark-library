import { apiClient } from './client'

export interface Me {
  id: number
  email: string
  displayName: string
  username: string
  pictureUrl?: string
}

export async function fetchMe(): Promise<Me> {
  const { data } = await apiClient.get<Me>('/me')
  return data
}
