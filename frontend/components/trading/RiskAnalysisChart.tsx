'use client'

import { Card } from '@/components/ui/card'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

interface RiskAnalysisChartProps {
  riskAnalysis: any
  symbol: string
}

export function RiskAnalysisChart({ riskAnalysis, symbol }: RiskAnalysisChartProps) {
  // Monte Carlo simulation data
  const monteCarloData = Array.from({ length: 100 }, (_, i) => ({
    simulation: i + 1,
    return: riskAnalysis.metrics.expectedReturn * (1 + (Math.random() - 0.5) * riskAnalysis.metrics.volatility / 100)
  }))

  // Risk distribution data
  const riskDistribution = [
    { name: 'Market Risk', value: 40 },
    { name: 'Liquidity Risk', value: 25 },
    { name: 'Volatility Risk', value: 20 },
    { name: 'Sector Risk', value: 15 }
  ]

  const COLORS = ['#00C2FF', '#7A5CFF', '#FFB347', '#FF4D4F']

  return (
    <Card className="bg-[#121833] border-[#1E2438] p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Risk Visualization</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monte Carlo Simulation */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Monte Carlo Simulation</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monteCarloData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2438" />
              <XAxis dataKey="simulation" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B1020', border: '1px solid #1E2438' }}
                labelStyle={{ color: '#fff' }}
              />
              <Line
                type="monotone"
                dataKey="return"
                stroke="#00C2FF"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#0B1020', border: '1px solid #1E2438' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Value at Risk (VaR) Distribution */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Value at Risk (VaR) Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={Array.from({ length: 50 }, (_, i) => ({
              loss: -i * 100,
              probability: Math.exp(-Math.pow(i / 10, 2))
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2438" />
              <XAxis dataKey="loss" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B1020', border: '1px solid #1E2438' }}
              />
              <Area
                type="monotone"
                dataKey="probability"
                fill="#FF4D4F"
                fillOpacity={0.3}
                stroke="#FF4D4F"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expected Return vs Risk */}
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Risk-Return Profile</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[
              { name: 'Conservative', return: 8, risk: 15 },
              { name: 'Moderate', return: 15, risk: 25 },
              { name: 'Aggressive', return: 25, risk: 40 },
              { name: symbol, return: riskAnalysis.metrics.expectedReturn, risk: riskAnalysis.metrics.volatility }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E2438" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{ backgroundColor: '#0B1020', border: '1px solid #1E2438' }}
              />
              <Bar dataKey="return" fill="#00C2FF" />
              <Bar dataKey="risk" fill="#FF4D4F" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  )
}