import { useCallback, useEffect, useState } from 'react'
import { fetchMyLibrary, type Library } from '../api/library'
import { extractApiErrorMessage } from '../api/client'

export interface UseLibraryResult {
  library: Library | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useLibrary(): UseLibraryResult {
  const [library, setLibrary] = useState<Library | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchMyLibrary()
      setLibrary(data)
    } catch (e) {
      setError(extractApiErrorMessage(e, '도서관을 불러오지 못했습니다'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { library, loading, error, refetch }
}
