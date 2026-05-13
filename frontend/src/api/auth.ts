import { apiClient } from './client'

export interface Me {
  id: number
  email: string
  displayName: string
  username: string
  pictureUrl?: string
  /** Default true. False = AI auto-tag/summary skipped for new books. */
  aiFeaturesEnabled: boolean
}

export async function fetchMe(): Promise<Me> {
  const { data } = await apiClient.get<Me>('/me')
  return data
}

export interface UpdateMePayload {
  aiFeaturesEnabled?: boolean
}

export async function updateMe(payload: UpdateMePayload): Promise<Me> {
  const { data } = await apiClient.patch<Me>('/me', payload)
  return data
}
