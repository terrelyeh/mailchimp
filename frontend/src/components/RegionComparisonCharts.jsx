import React, { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import { generateSubscriberTrend } from '../mockData';

export default function RegionComparisonCharts({ regionsData, regions }) {
  const [mode, setMode] = useState('openRate'); // 'openRate', 'clickRate', 'subscribers'

  // Prepare data for bar chart - comparing regions
  const barChartData = regions.map(region => {
    const data = regionsData[region.code] || [];
    if (data.length === 0) return null;

    const avgOpenRate = data.reduce((acc, curr) => acc + (curr.open_rate || 0), 0) / data.length;
    const avgClickRate = data.reduce((acc, curr) => acc + (curr.click_rate || 0), 0) / data.length;
    const totalSent = data.reduce((acc, curr) => acc + (curr.emails_sent || 0), 0);

    return {
      name: region.code,
      flag: region.flag,
      openRate: (avgOpenRate * 100).toFixed(1),
      clickRate: (avgClickRate * 100).toFixed(1),
      totalSent: totalSent,
      fill: region.color || '#3B82F6'
    };
  }).filter(Boolean);

  // Generate subscriber trend data
  const subscriberTrendData = generateSubscriberTrend(
    regions.map(r => r.code),
    30
  );

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
          <p className="font-bold text-sm mb-1">{payload[0].payload.flag} {payload[0].payload.name}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.name.includes('Rate') ? '%' : ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Bar Chart - Region Comparison */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900">Region Comparison</h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setMode('openRate')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${mode === 'openRate' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Open Rate
            </button>
            <button
              onClick={() => setMode('clickRate')}
              className={`px-3 py-1 text-xs rounded-md transition-all ${mode === 'clickRate' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Click Rate
            </button>
          </div>
        </div>

        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                unit="%"
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar
                dataKey={mode}
                fill="#FFE01B"
                radius={[8, 8, 0, 0]}
                name={mode === 'openRate' ? 'Open Rate' : 'Click Rate'}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Line Chart - Subscriber Trend */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Subscriber Growth (30 Days)</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={subscriberTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="dateFormatted"
                stroke="#9CA3AF"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {regions.map((region) => (
                <Line
                  key={region.code}
                  type="monotone"
                  dataKey={region.code}
                  stroke={region.color}
                  strokeWidth={2}
                  dot={false}
                  name={`${region.flag} ${region.code}`}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
