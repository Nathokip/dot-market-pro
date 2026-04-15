'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface Trade {
  id: string
  symbol: string
  type: 'buy' | 'sell'
  amount: number
  price: number
  quantity: number
  total: number
  pnl: number
  pnlPercent: number
  timestamp: Date
  status: 'completed' | 'pending' | 'failed'
  riskScore: number
}

interface TradeHistoryProps {
  symbol?: string
}

export function TradeHistory({ symbol }: TradeHistoryProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  useEffect(() => {
    loadTradeHistory()
    
    // Listen for new trades
    const handleTradeExecuted = () => loadTradeHistory()
    window.addEventListener('tradeExecuted', handleTradeExecuted)
    
    return () => window.removeEventListener('tradeExecuted', handleTradeExecuted)
  }, [symbol])

  useEffect(() => {
    filterTrades()
  }, [trades, searchTerm, filterType])

  const loadTradeHistory = async () => {
    setIsLoading(true)
    try {
      const url = symbol 
        ? `/api/trading/history?symbol=${symbol}`
        : '/api/trading/history'
      const response = await fetch(url)
      const data = await response.json()
      setTrades(data)
    } catch (error) {
      console.error('Failed to load trade history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterTrades = () => {
    let filtered = [...trades]
    
    // Filter by symbol search
    if (searchTerm) {
      filtered = filtered.filter(trade =>
        trade.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(trade => trade.type === filterType)
    }
    
    setFilteredTrades(filtered)
    setCurrentPage(1)
  }

  const exportTrades = () => {
    const csv = [
      ['Date', 'Symbol', 'Type', 'Quantity', 'Price', 'Total', 'PNL', 'PNL%'],
      ...filteredTrades.map(trade => [
        new Date(trade.timestamp).toLocaleString(),
        trade.symbol,
        trade.type.toUpperCase(),
        trade.quantity,
        trade.price,
        trade.total,
        trade.pnl,
        trade.pnlPercent
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trade_history_${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Pagination
  const totalPages = Math.ceil(filteredTrades.length / itemsPerPage)
  const paginatedTrades = filteredTrades.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Calculate summary statistics
  const stats = {
    totalTrades: trades.length,
    totalVolume: trades.reduce((sum, t) => sum + t.total, 0),
    totalPnL: trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
    winRate: trades.filter(t => t.pnl > 0).length / trades.length * 100,
    bestTrade: Math.max(...trades.map(t => t.pnl || 0), 0),
    worstTrade: Math.min(...trades.map(t => t.pnl || 0), 0)
  }

  return (
    <Card className="bg-[#121833] border-[#1E2438]">
      <div className="p-6 border-b border-[#1E2438]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Trade History</h2>
          <Button
            onClick={exportTrades}
            variant="outline"
            size="sm"
            className="bg-[#0B1020] border-[#1E2438] text-gray-400 hover:text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
          <div className="p-2 bg-[#0B1020] rounded-lg">
            <div className="text-xs text-gray-400">Total Trades</div>
            <div className="text-lg font-bold text-white">{stats.totalTrades}</div>
          </div>
          <div className="p-2 bg-[#0B1020] rounded-lg">
            <div className="text-xs text-gray-400">Volume</div>
            <div className="text-lg font-bold text-white">${stats.totalVolume.toLocaleString()}</div>
          </div>
          <div className="p-2 bg-[#0B1020] rounded-lg">
            <div className="text-xs text-gray-400">Total P&L</div>
            <div className={`text-lg font-bold ${stats.totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ${stats.totalPnL.toLocaleString()}
            </div>
          </div>
          <div className="p-2 bg-[#0B1020] rounded-lg">
            <div className="text-xs text-gray-400">Win Rate</div>
            <div className="text-lg font-bold text-white">{stats.winRate.toFixed(1)}%</div>
          </div>
          <div className="p-2 bg-[#0B1020] rounded-lg">
            <div className="text-xs text-gray-400">Best Trade</div>
            <div className="text-lg font-bold text-green-500">+${stats.bestTrade}</div>
          </div>
          <div className="p-2 bg-[#0B1020] rounded-lg">
            <div className="text-xs text-gray-400">Worst Trade</div>
            <div className="text-lg font-bold text-red-500">${stats.worstTrade}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by symbol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#0B1020] border-[#1E2438] text-white"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
              className={filterType === 'all' ? 'bg-[#00C2FF]' : 'bg-[#0B1020] border-[#1E2438]'}
            >
              All
            </Button>
            <Button
              variant={filterType === 'buy' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('buy')}
              className={filterType === 'buy' ? 'bg-green-600' : 'bg-[#0B1020] border-[#1E2438]'}
            >
              Buys
            </Button>
            <Button
              variant={filterType === 'sell' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('sell')}
              className={filterType === 'sell' ? 'bg-red-600' : 'bg-[#0B1020] border-[#1E2438]'}
            >
              Sells
            </Button>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[#1E2438]">
              <TableHead className="text-gray-400">Date</TableHead>
              <TableHead className="text-gray-400">Symbol</TableHead>
              <TableHead className="text-gray-400">Type</TableHead>
              <TableHead className="text-gray-400 text-right">Quantity</TableHead>
              <TableHead className="text-gray-400 text-right">Price</TableHead>
              <TableHead className="text-gray-400 text-right">Total</TableHead>
              <TableHead className="text-gray-400 text-right">P&L</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                  Loading trade history...
                </TableCell>
              </TableRow>
            ) : paginatedTrades.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-400">
                  No trades found
                </TableCell>
              </TableRow>
            ) : (
              paginatedTrades.map((trade) => (
                <TableRow key={trade.id} className="border-[#1E2438]">
                  <TableCell className="text-white">
                    {new Date(trade.timestamp).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium text-white">{trade.symbol}</TableCell>
                  <TableCell>
                    <Badge
                      className={trade.type === 'buy' 
                        ? 'bg-green-500/20 text-green-500'
                        : 'bg-red-500/20 text-red-500'
                      }
                    >
                      {trade.type.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-white">{trade.quantity}</TableCell>
                  <TableCell className="text-right text-white">${trade.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right text-white">${trade.total.toLocaleString()}</TableCell>
                  <TableCell className={`text-right ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {trade.pnl !== 0 && (
                      <>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                        <span className="text-xs ml-1">
                          ({trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(1)}%)
                        </span>
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        trade.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                        trade.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                        'bg-red-500/20 text-red-500'
                      }
                    >
                      {trade.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-[#1E2438] flex justify-between items-center">
          <div className="text-sm text-gray-400">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredTrades.length)} of{' '}
            {filteredTrades.length} trades
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="bg-[#0B1020] border-[#1E2438]"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="bg-[#0B1020] border-[#1E2438]"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}