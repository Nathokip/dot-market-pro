'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  Brain,
  DollarSign,
  PieChart,
  Bot,
  History,
  Clock,
  Settings
} from 'lucide-react'

const menuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Market Overview', href: '/market-overview', icon: TrendingUp },
  { name: 'Predictions', href: '/predictions', icon: Brain },
  { name: 'Trading', href: '/trading', icon: DollarSign },
  { name: 'Portfolio', href: '/portfolio', icon: PieChart },
  { name: 'AI Insights', href: '/ai-insights', icon: Bot },
  { name: 'Backtesting', href: '/backtesting', icon: History },
  { name: 'Trade History', href: '/trade-history', icon: Clock },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 h-screen bg-[#121833] border-r border-[#1E2438] flex flex-col">
      <div className="p-6 border-b border-[#1E2438]">
        <span className="text-xl font-bold text-white">Dot Market</span>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map(({ name, href, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-[#00C2FF]/10 text-[#00C2FF]'
                  : 'text-gray-400 hover:text-white hover:bg-[#1E2438]'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
