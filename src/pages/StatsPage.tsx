import { useStore } from '../store/useStore'
import { BarChart2 } from 'lucide-react'

export function StatsPage() {
  const { books, getMonthlyStats } = useStore()

  const monthlyStats = getMonthlyStats()
  const totalFinished = books.filter(b => b.status === 'FINISHED').length
  const totalReading = books.filter(b => b.status === 'READING').length
  const totalUnread = books.filter(b => b.status === 'UNREAD').length
  const totalConsidering = books.filter(b => b.status === 'CONSIDERING_PURCHASE').length

  // 直近12ヶ月のデータを準備
  const recentMonths: { month: string; label: string; count: number }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const stat = monthlyStats.find(s => s.month === month)
    const label = `${d.getMonth() + 1}月`
    recentMonths.push({ month, label, count: stat?.count ?? 0 })
  }

  const maxCount = Math.max(...recentMonths.map(m => m.count), 1)

  // 年ごとの統計
  const yearStats = new Map<string, number>()
  for (const stat of monthlyStats) {
    const year = stat.month.slice(0, 4)
    yearStats.set(year, (yearStats.get(year) ?? 0) + stat.count)
  }
  const sortedYears = [...yearStats.entries()].sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">統計</h1>
      </div>

      <div className="page-container" style={{ paddingTop: '8px' }}>
        {books.length === 0 ? (
          <div className="empty-state">
            <BarChart2 size={48} className="empty-state-icon" />
            <p className="font-medium">まだデータがありません</p>
          </div>
        ) : (
          <>
            {/* 概要カード */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              marginBottom: '20px',
            }}>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {totalFinished}
                </div>
                <div className="text-sm text-muted">読了</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-tertiary)' }}>
                  {totalReading}
                </div>
                <div className="text-sm text-muted">読書中</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>
                  {totalUnread}
                </div>
                <div className="text-sm text-muted">未読</div>
              </div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-secondary)' }}>
                  {totalConsidering}
                </div>
                <div className="text-sm text-muted">購入検討</div>
              </div>
            </div>

            {/* 月別読了グラフ */}
            <div className="card" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>
                月別読了数（直近12ヶ月）
              </h2>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px' }}>
                {recentMonths.map(({ month, label, count }) => (
                  <div key={month} style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}>
                    <div style={{
                      fontSize: '10px',
                      color: 'var(--color-on-surface-variant)',
                      fontWeight: count > 0 ? 600 : 400,
                    }}>
                      {count > 0 ? count : ''}
                    </div>
                    <div style={{
                      width: '100%',
                      height: `${Math.max(count / maxCount * 80, count > 0 ? 8 : 2)}px`,
                      backgroundColor: count > 0 ? 'var(--color-primary)' : 'var(--color-surface-variant)',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.3s ease',
                    }} />
                    <div style={{ fontSize: '10px', color: 'var(--color-on-surface-variant)', writingMode: 'horizontal-tb' }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 年別統計 */}
            {sortedYears.length > 0 && (
              <div className="card">
                <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>
                  年別読了数
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sortedYears.map(([year, count]) => (
                    <div key={year} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, width: '50px' }}>{year}年</span>
                      <div style={{
                        flex: 1,
                        height: '20px',
                        backgroundColor: 'var(--color-surface-variant)',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${(count / Math.max(...sortedYears.map(([, c]) => c))) * 100}%`,
                          backgroundColor: 'var(--color-primary)',
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, width: '30px', textAlign: 'right' }}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
