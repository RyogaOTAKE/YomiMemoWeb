import type { BookStatus } from '../types/models'
import { BOOK_STATUS_LABELS } from '../types/models'

interface StatusBadgeProps {
  status: BookStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-${status}`}>
      {BOOK_STATUS_LABELS[status]}
    </span>
  )
}
