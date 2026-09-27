'use client'

import { useState, useEffect } from 'react'
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts'
import { Calendar, Filter, Loader2, CheckSquare, Square } from 'lucide-react'

const SENTIMENT_COLORS = { Positive: '#4ade80', Neutral: '#9ca3af', Negative: '#f87171' };
const SOURCE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#eab308'];

export function AdminDashboardClient() {
  const [days, setDays] = useState('30')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Chart Visibility Toggles (Hindi disabled by default)
  const [showScraped, setShowScraped] = useState(true)
  const [showClassified, setShowClassified] = useState(true)
  const [showHindi, setShowHindi] = useState(false)

  useEffect(() => {
    fetchData()
  }, [days])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/stats?days=${days}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const ToggleCheckbox = ({ label, checked, onChange, color }: any) => (
    <button 
      onClick={onChange} 
      className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
      style={{ color: checked ? color : '#737373' }}
    >
      {checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
      {label}
    </button>
  )

  return (
    <div className="mt-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-orange-500" /> 
          Trend Analytics
        </h2>
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <label className="text-sm text-neutral-400">Time Period:</label>
          <select 
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="bg-neutral-800 border border-neutral-700 text-white text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 p-2"
          >
            <option value="7">Last 7 Days</option>
            <option value="15">Last 15 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
          <button onClick={fetchData} className="bg-neutral-800 hover:bg-neutral-700 p-2 rounded-lg border border-neutral-700">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex justify-center items-center h-64 bg-neutral-900 rounded-xl border border-neutral-800">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Pending Bottlenecks Row */}
          <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
            <h3 className="text-lg font-bold mb-4 border-b border-neutral-800 pb-2">Pending Pipeline Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-neutral-800 p-4 rounded-lg text-center">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">To Be Rephrased</p>
                <p className="text-3xl font-black text-white mt-1">{data.pending.rephrase}</p>
              </div>
              <div className="bg-neutral-800 p-4 rounded-lg text-center">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">To Be Classified</p>
                <p className="text-3xl font-black text-white mt-1">{data.pending.classify}</p>
              </div>
              <div className="bg-neutral-800 p-4 rounded-lg text-center">
                <p className="text-xs text-neutral-400 uppercase tracking-wide">To Be Entitied</p>
                <p className="text-3xl font-black text-white mt-1">{data.pending.entity}</p>
              </div>
              <div className="bg-neutral-800 p-4 rounded-lg text-center border border-orange-900/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-orange-500"></div>
                <p className="text-xs text-neutral-400 uppercase tracking-wide">To Be Timelined</p>
                <p className="text-3xl font-black text-orange-400 mt-1">{data.pending.timeline}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pipeline Throughput Trend */}
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
              <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-2">
                <h3 className="text-lg font-bold">Pipeline Throughput (Daily)</h3>
                <div className="flex gap-4">
                  <ToggleCheckbox label="Scraped" checked={showScraped} onChange={() => setShowScraped(!showScraped)} color="#60a5fa" />
                  <ToggleCheckbox label="Classified" checked={showClassified} onChange={() => setShowClassified(!showClassified)} color="#4ade80" />
                  <ToggleCheckbox label="Hindi" checked={showHindi} onChange={() => setShowHindi(!showHindi)} color="#f43f5e" />
                </div>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="day" stroke="#737373" fontSize={12} tickMargin={10} />
                    <YAxis stroke="#737373" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#404040' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', display: 'none' }} />
                    {showScraped && <Line type="monotone" dataKey="scraped" name="Scraped" stroke="#60a5fa" strokeWidth={2} dot={false} />}
                    {showClassified && <Line type="monotone" dataKey="classified" name="Classified" stroke="#4ade80" strokeWidth={2} dot={false} />}
                    {showHindi && <Line type="monotone" dataKey="translated" name="Translated (HI)" stroke="#f43f5e" strokeWidth={2} dot={false} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Civic Alerts Area Chart */}
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
              <h3 className="text-lg font-bold mb-6 border-b border-neutral-800 pb-2">Civic Alert Volume</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="day" stroke="#737373" fontSize={12} tickMargin={10} />
                    <YAxis stroke="#737373" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#404040' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="civic" name="Civic Alerts Flagged" fill="#f97316" stroke="#ea580c" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Source Distribution Pie Chart */}
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
              <h3 className="text-lg font-bold mb-6 border-b border-neutral-800 pb-2">Top 5 Media Sources ({days} Days)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.sources} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {data.sources.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#404040' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sentiment Distribution Pie Chart */}
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800">
              <h3 className="text-lg font-bold mb-6 border-b border-neutral-800 pb-2">Sentiment Overview ({days} Days)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.sentiments} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} label>
                      {data.sentiments.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={(SENTIMENT_COLORS as any)[entry.name] || '#a8a29e'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#171717', borderColor: '#404040' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Distribution Bar Chart */}
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 lg:col-span-2">
              <h3 className="text-lg font-bold mb-6 border-b border-neutral-800 pb-2">Category Distribution ({days} Days)</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.categories} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                    <XAxis type="number" stroke="#737373" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#a3a3a3" fontSize={12} tickMargin={10} />
                    <Tooltip cursor={{ fill: '#262626' }} contentStyle={{ backgroundColor: '#171717', borderColor: '#404040' }} />
                    <Bar dataKey="count" name="Articles" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Civic Threat Vectors Bar Chart */}
            <div className="bg-neutral-900 p-6 rounded-xl border border-neutral-800 lg:col-span-2">
              <h3 className="text-lg font-bold mb-6 border-b border-neutral-800 pb-2">Civic Flag Threat Vectors ({days} Days)</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.civicCats} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                    <XAxis type="number" stroke="#737373" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="#a3a3a3" fontSize={12} tickMargin={10} />
                    <Tooltip cursor={{ fill: '#262626' }} contentStyle={{ backgroundColor: '#171717', borderColor: '#404040' }} />
                    <Bar dataKey="count" name="Flags Triggered" fill="#ea580c" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
