import { useState, useEffect } from 'react';
import { analyticsClient } from '@/lib/api-client/analytics';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { Activity, AlertOctagon, Calendar, Users } from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#10b981', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 p-4 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[160px] animate-in fade-in zoom-in-95 duration-200">
        {label && <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full shadow-inner" 
                style={{ backgroundColor: entry.color || entry.payload?.fill || (entry.fill && !entry.fill.includes('url') ? entry.fill : '#6366f1') }} 
              />
              <span className="font-medium text-sm text-gray-700 dark:text-gray-300">{entry.name}</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">
              {entry.value >= 1000 ? (entry.value / 1000).toFixed(1) + 'k' : entry.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function AnalyticsTab() {
  const [timeframe, setTimeframe] = useState('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await analyticsClient.getUsage({ timeframe });
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [timeframe]);

  if (loading && !data) return (
    <div className="mt-6 flex flex-col space-y-6">
      <div className="h-16 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse"></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[400px] bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse"></div>
        <div className="h-[400px] bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse"></div>
      </div>
    </div>
  );
  if (!data) return <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl">Failed to load analytics</div>;

  const trafficData = data.trends?.traffic || [];
  const clientData = data.topPerformers?.clients?.map((c: any) => ({
    name: c.name,
    requests: c.reqs
  })) || [];

  return (
    <div className="space-y-8 mt-6">
      {/* Control Bar */}
      <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 flex flex-wrap gap-4 items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Historical Trends</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Track your API growth over time</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-gray-900 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <Calendar className="h-4 w-4 text-gray-400" />
          <select 
            value={timeframe} 
            onChange={(e) => setTimeframe(e.target.value)}
            className="text-sm font-semibold bg-transparent border-none focus:ring-0 text-gray-700 dark:text-gray-200 cursor-pointer outline-none pl-1 pr-6 appearance-none hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239ca3af%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.2rem top 50%', backgroundSize: '0.65rem auto' }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Traffic Area Chart */}
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 h-[420px] flex flex-col shadow-sm group hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full -z-0"></div>
          
          <div className="flex justify-between items-start mb-8 z-10">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                API Requests
              </h3>
              <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">Total Volume</p>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative z-10">
            {loading && <div className="absolute inset-0 bg-white/40 dark:bg-gray-950/40 z-20 flex items-center justify-center backdrop-blur-sm rounded-xl">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01}/>
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#6b7280" opacity={0.15} />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }} 
                  dy={15} 
                  minTickGap={30} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }} 
                  tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val} 
                  dx={0} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.4 }} />
                <Area 
                  type="monotone" 
                  dataKey="requests" 
                  name="Total Requests" 
                  stroke="#6366f1" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorRequests)" 
                  animationDuration={1500}
                  filter="url(#glow)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Errors Bar Chart */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 h-[420px] flex flex-col shadow-sm group hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full -z-0"></div>

            <div className="flex justify-between items-start mb-8 z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-500" />
                  Failed Requests
                </h3>
                <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">4xx and 5xx Errors</p>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative z-10">
              {loading && <div className="absolute inset-0 bg-white/40 dark:bg-gray-950/40 z-20 flex items-center justify-center backdrop-blur-sm rounded-xl">
                <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
              </div>}
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9}/>
                      <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.7}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#6b7280" opacity={0.15} />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }} 
                    dy={15} 
                    minTickGap={30} 
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }} 
                    dx={0} 
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(239, 68, 68, 0.05)' }} />
                  <Bar 
                    dataKey="errors" 
                    name="Failed Requests" 
                    fill="url(#colorErrors)" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={45} 
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Client Share Donut Chart */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200/60 dark:border-gray-800/60 p-6 h-[420px] flex flex-col shadow-sm group hover:shadow-md transition-shadow duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-full -z-0"></div>

            <div className="flex justify-between items-start mb-2 z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  Traffic by Client
                </h3>
                <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">Top Clients vs Total Requests</p>
              </div>
            </div>

            <div className="flex-1 min-h-0 relative z-10 flex items-center justify-center">
              {loading && <div className="absolute inset-0 bg-white/40 dark:bg-gray-950/40 z-20 flex items-center justify-center backdrop-blur-sm rounded-xl">
                <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>}
              {clientData.length === 0 && !loading ? (
                <div className="text-gray-500 dark:text-gray-400 text-sm">No client data available</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Pie
                      data={clientData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="requests"
                      nameKey="name"
                      animationDuration={1500}
                      stroke="none"
                    >
                      {clientData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      formatter={(value, entry, index) => <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
