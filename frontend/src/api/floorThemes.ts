import { apiClient } from './client'
import type { ThemeTier } from './themes'

export interface FloorTheme {
  id: string
  displayName: string
  description?: string
  tier: ThemeTier
  priceKrw?: number
  primaryColor: string
  shadowColor: string
  sortOrder: number
}

export async function fetchFloorThemes(): Promise<FloorTheme[]> {
  const { data } = await apiClient.get<FloorTheme[]>('/floor-themes')
  return data
}
