import axios from 'axios'

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
})

/**
 * Extract a user-friendly message from an unknown error.
 *
 * Spring Boot returns errors as JSON with a `message` field (enabled via
 * `server.error.include-message: always` in application.yml). We surface that
 * to users when present; otherwise fall back to status text or a generic
 * error string. This keeps "Request failed with status code 409" out of the UI.
 */
export function extractApiErrorMessage(err: unknown, fallback = '오류가 발생했습니다'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>
      // Spring Boot's standard error body
      if (typeof obj.message === 'string' && obj.message.trim().length > 0) {
        return obj.message
      }
      // Validation errors aggregated
      if (Array.isArray(obj.errors) && obj.errors.length > 0) {
        return obj.errors.map((e) => (typeof e === 'string' ? e : JSON.stringify(e))).join(', ')
      }
    }
    // Network / no-response cases
    if (!err.response) {
      return '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.'
    }
    if (err.response.statusText) {
      return `${err.response.status} ${err.response.statusText}`
    }
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}
