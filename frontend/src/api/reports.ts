import { apiClient } from './client'

export type ReportReason = 'ILLEGAL' | 'COPYRIGHT' | 'HARASSMENT' | 'SPAM' | 'OTHER'

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  ILLEGAL: '불법 콘텐츠 (음란/도박/마약 등)',
  COPYRIGHT: '저작권 침해',
  HARASSMENT: '명예훼손·괴롭힘·사생활 침해',
  SPAM: '스팸 / 피싱 / 사기성 링크',
  OTHER: '기타',
}

/**
 * Submit a report against a public library. Anonymous (no auth) submissions
 * are allowed by the backend — we still send credentials so authenticated
 * reports get the reporter's user id stored alongside.
 */
export async function submitReport(payload: {
  libraryId: number
  reason: ReportReason
  details?: string
}): Promise<void> {
  await apiClient.post('/reports', payload)
}
