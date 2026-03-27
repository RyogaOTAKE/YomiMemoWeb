import type { ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { BookOpen, FileText, Search, BarChart2, Settings } from 'lucide-react'

interface NavItem {
  to: string
  icon: ReactNode
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: <BookOpen size={22} />, label: '本棚' },
  { to: '/memos', icon: <FileText size={22} />, label: 'メモ' },
  { to: '/search', icon: <Search size={22} />, label: '検索' },
  { to: '/stats', icon: <BarChart2 size={22} />, label: '統計' },
  { to: '/sync', icon: <Settings size={22} />, label: '同期' },
]

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="layout">
      <div className="layout-content">
        {children}
      </div>
      <nav className="bottom-nav">
        {NAV_ITEMS.map(item => {
          const isActive = item.to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`bottom-nav-item${isActive ? ' active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
