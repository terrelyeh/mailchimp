import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

/**
 * 時間序列組合圖表 - 顯示所有區域的關鍵指標隨時間變化
 * 支援：Campaign 數量（長條圖）+ Open Rate / Click Rate / Unsubscribes（折線圖）
 */
export default function TimeSeriesMetricsChart({ regionsData, regions }) {
  const [selectedMetrics, setSelectedMetrics] = useState(['campaigns', 'openRate']);

  // 處理資料：將 campaigns 按日期分組，計算每個時間點的指標
  const timeSeriesData = useMemo(() => {
    const dateMap = new Map();

    // 遍歷所有區域的資料
    regions.forEach(region => {
      const campaigns = regionsData[region.code] || [];

      campaigns.forEach(campaign => {
        if (!campaign.send_time) return;

        // 取得日期（去除時間部分）
        const date = new Date(campaign.send_time);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            date: dateKey,
            dateObj: date,
            dateFormatted: formatDate(date),
            campaigns: {},
            openRate: {},
            clickRate: {},
            unsubscribes: {},
            totalCampaigns: 0
          });
        }

        const dayData = dateMap.get(dateKey);

        // 累計各區域的資料
        if (!dayData.campaigns[region.code]) {
          dayData.campaigns[region.code] = 0;
          dayData.openRate[region.code] = [];
          dayData.clickRate[region.code] = [];
          dayData.unsubscribes[region.code] = 0;
        }

        dayData.campaigns[region.code]++;
        dayData.totalCampaigns++;

        if (campaign.open_rate !== undefined) {
          dayData.openRate[region.code].push(campaign.open_rate * 100);
        }
        if (campaign.click_rate !== undefined) {
          dayData.clickRate[region.code].push(campaign.click_rate * 100);
        }
        if (campaign.unsubscribed !== undefined) {
          dayData.unsubscribes[region.code] += campaign.unsubscribed || 0;
        }
      });
    });

    // 轉換成陣列並計算平均值
    const result = Array.from(dateMap.values())
      .sort((a, b) => a.dateObj - b.dateObj)
      .map(day => {
        const processed = {
          date: day.date,
          dateFormatted: day.dateFormatted,
          totalCampaigns: day.totalCampaigns
        };

        regions.forEach(region => {
          const code = region.code;

          // Campaign 數量
          processed[`${code}_campaigns`] = day.campaigns[code] || 0;

          // Open Rate 平均
          const openRates = day.openRate[code] || [];
          processed[`${code}_openRate`] = openRates.length > 0
            ? (openRates.reduce((a, b) => a + b, 0) / openRates.length).toFixed(1)
            : 0;

          // Click Rate 平均
          const clickRates = day.clickRate[code] || [];
          processed[`${code}_clickRate`] = clickRates.length > 0
            ? (clickRates.reduce((a, b) => a + b, 0) / clickRates.length).toFixed(1)
            : 0;

          // Unsubscribes 總和
          processed[`${code}_unsubscribes`] = day.unsubscribes[code] || 0;
        });

        return processed;
      });

    return result;
  }, [regionsData, regions]);

  const formatDate = (date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  const toggleMetric = (metric) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metric)) {
        return prev.filter(m => m !== metric);
      } else {
        return [...prev, metric];
      }
    });
  };

  const metrics = [
    { key: 'campaigns', label: 'Campaigns', type: 'bar' },
    { key: 'openRate', label: 'Open Rate', type: 'line', unit: '%' },
    { key: 'clickRate', label: 'Click Rate', type: 'line', unit: '%' },
    { key: 'unsubscribes', label: 'Unsubscribes', type: 'line' }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
          <p className="font-bold text-sm mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}{entry.unit || ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // 如果沒有資料
  if (timeSeriesData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Campaign Metrics Over Time</h2>
        <div className="h-[400px] flex items-center justify-center text-gray-400">
          No campaign data available for the selected period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-lg font-bold text-gray-900">Campaign Metrics Over Time</h2>

        {/* Metric Selector */}
        <div className="flex flex-wrap gap-2">
          {metrics.map(metric => (
            <button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                selectedMetrics.includes(metric.key)
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 border border-transparent hover:border-gray-300'
              }`}
            >
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={timeSeriesData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="dateFormatted"
              stroke="#9CA3AF"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />

            {/* Left Y-axis for campaigns */}
            {selectedMetrics.includes('campaigns') && (
              <YAxis
                yAxisId="left"
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Campaigns', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
              />
            )}

            {/* Right Y-axis for rates */}
            {(selectedMetrics.includes('openRate') || selectedMetrics.includes('clickRate') || selectedMetrics.includes('unsubscribes')) && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Rate (%) / Count', angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
              />
            )}

            <RechartsTooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />

            {/* Bars for Campaigns */}
            {selectedMetrics.includes('campaigns') && regions.map((region, idx) => (
              <Bar
                key={`${region.code}_campaigns`}
                dataKey={`${region.code}_campaigns`}
                fill={region.color || '#3B82F6'}
                yAxisId="left"
                name={`${region.flag} ${region.code} Campaigns`}
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
            ))}

            {/* Lines for Open Rate */}
            {selectedMetrics.includes('openRate') && regions.map((region) => (
              <Line
                key={`${region.code}_openRate`}
                type="monotone"
                dataKey={`${region.code}_openRate`}
                stroke={region.color || '#3B82F6'}
                strokeWidth={2}
                dot={{ r: 3 }}
                yAxisId="right"
                name={`${region.flag} ${region.code} Open Rate`}
                unit="%"
              />
            ))}

            {/* Lines for Click Rate */}
            {selectedMetrics.includes('clickRate') && regions.map((region) => (
              <Line
                key={`${region.code}_clickRate`}
                type="monotone"
                dataKey={`${region.code}_clickRate`}
                stroke={region.color || '#10B981'}
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="5 5"
                yAxisId="right"
                name={`${region.flag} ${region.code} Click Rate`}
                unit="%"
              />
            ))}

            {/* Lines for Unsubscribes */}
            {selectedMetrics.includes('unsubscribes') && regions.map((region) => (
              <Line
                key={`${region.code}_unsubscribes`}
                type="monotone"
                dataKey={`${region.code}_unsubscribes`}
                stroke={region.color || '#EF4444'}
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="3 3"
                yAxisId="right"
                name={`${region.flag} ${region.code} Unsubscribes`}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        💡 提示：點擊上方按鈕可切換顯示的指標
      </div>
    </div>
  );
}
