import { apiClient } from './client'

export type ThemeTier = 'FREE' | 'PAID'

export interface Theme {
  id: string
  displayName: string
  description?: string
  tier: ThemeTier
  priceKrw?: number
  woodColor: string
  shadowColor: string
  wallColor: string
  /** Optional accent (e.g. industrial frame metal). */
  frameColor?: string
  sortOrder: number
}

export async function fetchThemes(): Promise<Theme[]> {
  const { data } = await apiClient.get<Theme[]>('/themes')
  return data
}
