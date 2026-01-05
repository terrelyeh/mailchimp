import React, { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

/**
 * 時間序列組合圖表 - 顯示所有區域的關鍵指標隨時間變化
 * 支援：智慧選擇模式 - 多國單指標 / 單國多指標
 */
export default function TimeSeriesMetricsChart({ regionsData, regions }) {
  const [selectedRegions, setSelectedRegions] = useState([]);
  const [selectedMetrics, setSelectedMetrics] = useState(['openRate']);

  // 提前檢查資料有效性
  if (!regionsData || !regions || regions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="section-title mb-4">Campaign Metrics Over Time</h2>
        <div className="h-[400px] flex items-center justify-center text-gray-400">
          Loading data...
        </div>
      </div>
    );
  }

  // 過濾出有資料的 regions
  const activeRegions = useMemo(() => {
    return regions.filter(region => {
      const campaigns = regionsData[region.code];
      return campaigns && Array.isArray(campaigns) && campaigns.length > 0;
    });
  }, [regions, regionsData]);

  // 初始化選中所有區域
  useEffect(() => {
    if (selectedRegions.length === 0 && activeRegions.length > 0) {
      setSelectedRegions(activeRegions.map(r => r.code));
    }
  }, [activeRegions]);

  // 判斷是否為多國模式
  const isMultiRegionMode = selectedRegions.length > 1;

  // 日期格式化函數
  const formatDate = (date) => {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  // 處理資料：將 campaigns 按日期分組
  const timeSeriesData = useMemo(() => {
    const dateMap = new Map();

    regions.forEach(region => {
      const campaigns = regionsData[region.code] || [];

      campaigns.forEach(campaign => {
        if (!campaign.send_time) return;

        const date = new Date(campaign.send_time);
        const dateKey = date.toISOString().split('T')[0];

        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, {
            date: dateKey,
            dateObj: date,
            dateFormatted: formatDate(date),
            campaigns: {},
            emailsSent: {},
            openRate: {},
            clickRate: {},
            deliveryRate: {},
            unsubscribes: {},
            totalCampaigns: 0
          });
        }

        const dayData = dateMap.get(dateKey);

        if (!dayData.campaigns[region.code]) {
          dayData.campaigns[region.code] = 0;
          dayData.emailsSent[region.code] = 0;
          dayData.openRate[region.code] = [];
          dayData.clickRate[region.code] = [];
          dayData.deliveryRate[region.code] = [];
          dayData.unsubscribes[region.code] = 0;
        }

        dayData.campaigns[region.code]++;
        dayData.totalCampaigns++;

        if (campaign.emails_sent !== undefined) {
          dayData.emailsSent[region.code] += campaign.emails_sent || 0;
        }
        if (campaign.open_rate !== undefined) {
          dayData.openRate[region.code].push(campaign.open_rate * 100);
        }
        if (campaign.click_rate !== undefined) {
          dayData.clickRate[region.code].push(campaign.click_rate * 100);
        }
        // Calculate delivery rate for this campaign
        if (campaign.emails_sent > 0) {
          const delivered = campaign.emails_sent - (campaign.bounces || 0);
          const deliveryRate = (delivered / campaign.emails_sent) * 100;
          dayData.deliveryRate[region.code].push(deliveryRate);
        }
        if (campaign.unsubscribed !== undefined) {
          dayData.unsubscribes[region.code] += campaign.unsubscribed || 0;
        }
      });
    });

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
          processed[`${code}_campaigns`] = day.campaigns[code] || 0;
          processed[`${code}_emailsSent`] = day.emailsSent[code] || 0;

          const openRates = day.openRate[code] || [];
          processed[`${code}_openRate`] = openRates.length > 0
            ? (openRates.reduce((a, b) => a + b, 0) / openRates.length).toFixed(1)
            : 0;

          const clickRates = day.clickRate[code] || [];
          processed[`${code}_clickRate`] = clickRates.length > 0
            ? (clickRates.reduce((a, b) => a + b, 0) / clickRates.length).toFixed(1)
            : 0;

          const deliveryRates = day.deliveryRate[code] || [];
          processed[`${code}_deliveryRate`] = deliveryRates.length > 0
            ? (deliveryRates.reduce((a, b) => a + b, 0) / deliveryRates.length).toFixed(1)
            : 0;

          processed[`${code}_unsubscribes`] = day.unsubscribes[code] || 0;
        });

        return processed;
      });

    return result;
  }, [regionsData, regions]);

  // 區域選擇處理 - 確保至少選一個
  const toggleRegion = (regionCode) => {
    setSelectedRegions(prev => {
      if (prev.includes(regionCode)) {
        // 如果只剩一個，不允許取消
        if (prev.length === 1) return prev;
        return prev.filter(r => r !== regionCode);
      } else {
        const newSelection = [...prev, regionCode];
        // 當從單選變多選時，限制為單一指標
        if (newSelection.length > 1 && selectedMetrics.length > 1) {
          setSelectedMetrics([selectedMetrics[0]]);
        }
        return newSelection;
      }
    });
  };

  // 指標選擇處理
  const handleMetricChange = (metricKey) => {
    if (isMultiRegionMode) {
      // 多國模式：單選
      setSelectedMetrics([metricKey]);
    } else {
      // 單國模式：多選
      setSelectedMetrics(prev => {
        if (prev.includes(metricKey)) {
          // 確保至少選擇一個指標
          if (prev.length === 1) return prev;
          return prev.filter(m => m !== metricKey);
        }
        return [...prev, metricKey];
      });
    }
  };

  // Metric definitions with distinct colors for single-region multi-metric mode
  const metrics = [
    { key: 'campaigns', label: 'Campaigns', type: 'bar', color: '#6366F1' },        // Indigo
    { key: 'emailsSent', label: 'Emails Sent', type: 'bar', color: '#8B5CF6' },     // Purple
    { key: 'openRate', label: 'Open Rate', type: 'line', unit: '%', color: '#FFE01B' },    // Yellow (Mailchimp)
    { key: 'clickRate', label: 'Click Rate', type: 'line', unit: '%', color: '#007C89' },  // Teal (Mailchimp)
    { key: 'deliveryRate', label: 'Delivery Rate', type: 'line', unit: '%', color: '#10B981' }, // Emerald
    { key: 'unsubscribes', label: 'Unsubscribes', type: 'line', color: '#EF4444' }  // Red
  ];

  // Helper to get color based on mode
  const getColor = (metricKey, regionColor) => {
    if (isMultiRegionMode) {
      return regionColor; // Multi-region: use region color
    }
    // Single-region: use metric color
    const metric = metrics.find(m => m.key === metricKey);
    return metric?.color || regionColor;
  };

  // 獲取選中的區域物件
  const displayRegions = activeRegions.filter(r => selectedRegions.includes(r.code));

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const regionData = {};

    payload.forEach(entry => {
      const match = entry.dataKey.match(/^([A-Z]+)_(.+)$/);
      if (match) {
        const [, regionCode, metric] = match;
        if (!regionData[regionCode]) {
          regionData[regionCode] = {};
        }
        regionData[regionCode][metric] = {
          value: entry.value,
          color: entry.color,
          unit: entry.unit || ''
        };
      }
    });

    return (
      <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-lg max-w-xs">
        <p className="font-bold text-sm mb-2 pb-2 border-b border-gray-200">{label}</p>
        <div className="space-y-2">
          {Object.entries(regionData).map(([regionCode, metricsData]) => {
            const region = activeRegions.find(r => r.code === regionCode);
            if (!region) return null;

            return (
              <div key={regionCode} className="text-xs">
                <div className="flex items-center gap-1.5 font-semibold mb-1" style={{ color: region.color }}>
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: region.color }}
                  />
                  {region.flag} {regionCode}
                </div>
                <div className="ml-4 space-y-0.5">
                  {metricsData.campaigns !== undefined && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Campaigns:</span>
                      <span className="font-medium text-gray-900">{metricsData.campaigns.value}</span>
                    </div>
                  )}
                  {metricsData.emailsSent !== undefined && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Emails Sent:</span>
                      <span className="font-medium text-gray-900">{Number(metricsData.emailsSent.value).toLocaleString()}</span>
                    </div>
                  )}
                  {metricsData.openRate !== undefined && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Open Rate:</span>
                      <span className="font-medium text-gray-900">{metricsData.openRate.value}%</span>
                    </div>
                  )}
                  {metricsData.clickRate !== undefined && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Click Rate:</span>
                      <span className="font-medium text-gray-900">{metricsData.clickRate.value}%</span>
                    </div>
                  )}
                  {metricsData.deliveryRate !== undefined && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Delivery Rate:</span>
                      <span className="font-medium text-gray-900">{metricsData.deliveryRate.value}%</span>
                    </div>
                  )}
                  {metricsData.unsubscribes !== undefined && (
                    <div className="flex justify-between gap-4">
                      <span className="text-gray-500">Unsubscribes:</span>
                      <span className="font-medium text-gray-900">{metricsData.unsubscribes.value}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (timeSeriesData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
        <h2 className="section-title mb-4">Campaign Metrics Over Time</h2>
        <div className="h-[400px] flex items-center justify-center text-gray-400">
          No campaign data available for the selected period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6 md:mb-8">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h2 className="section-title">Campaign Metrics Over Time</h2>
      </div>

      {/* Selectors */}
      <div className="flex flex-col gap-4 md:gap-6 mb-4 md:mb-6 pb-4 md:pb-6 border-b border-gray-100">
        {/* Region Selector */}
        <div>
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Regions</span>
            <span className="text-xs text-gray-400">
              ({selectedRegions.length} selected)
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {activeRegions.map(region => {
              const isSelected = selectedRegions.includes(region.code);
              return (
                <button
                  key={region.code}
                  onClick={() => toggleRegion(region.code)}
                  style={isSelected ? {
                    backgroundColor: region.color,
                    borderColor: region.color,
                    color: 'white'
                  } : {}}
                  className={`
                    inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-medium
                    transition-all duration-150 border-2
                    ${!isSelected && 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}
                  `}
                >
                  <span>{region.flag}</span>
                  <span className="hidden sm:inline">{region.code}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Metric Selector */}
        <div>
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Metric</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isMultiRegionMode ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
              {isMultiRegionMode ? 'single' : 'multi'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 md:gap-2">
            {metrics.map(metric => {
              const isSelected = selectedMetrics.includes(metric.key);
              return (
                <button
                  key={metric.key}
                  onClick={() => handleMetricChange(metric.key)}
                  className={`
                    inline-flex items-center px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-medium
                    transition-all duration-150 border-2
                    ${isSelected
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }
                  `}
                >
                  {metric.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selection Mode Hint */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${isMultiRegionMode ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          <span className="text-base">{isMultiRegionMode ? '🌍' : '📊'}</span>
          <span>
            {isMultiRegionMode
              ? 'Multi-region mode: Compare one metric across regions'
              : 'Single-region mode: Analyze multiple metrics for one region'
            }
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px] md:h-[400px]">
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

            {/* Left Y-axis for volume metrics (campaigns, emails sent) */}
            {(selectedMetrics.includes('campaigns') || selectedMetrics.includes('emailsSent')) && (
              <YAxis
                yAxisId="left"
                stroke="#9CA3AF"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: selectedMetrics.includes('emailsSent') ? 'Volume' : 'Campaigns',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12 }
                }}
              />
            )}

            {/* Right Y-axis for rates */}
            {(selectedMetrics.includes('openRate') || selectedMetrics.includes('clickRate') || selectedMetrics.includes('deliveryRate') || selectedMetrics.includes('unsubscribes')) && (
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
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }}
              formatter={(value, entry) => {
                // In single-region mode, show metric name with metric color
                if (!isMultiRegionMode) {
                  const metric = metrics.find(m => value.includes(m.label));
                  if (metric) {
                    return <span style={{ color: metric.color }}>{metric.label}</span>;
                  }
                }
                // In multi-region mode, show region with region color
                const region = displayRegions.find(r => value.includes(r.code) || value.includes(r.flag));
                if (region) {
                  return <span style={{ color: region.color }}>{value}</span>;
                }
                return value;
              }}
            />

            {/* Bars for Campaigns */}
            {selectedMetrics.includes('campaigns') && displayRegions.map((region) => {
              const color = getColor('campaigns', region.color);
              return (
                <Bar
                  key={`${region.code}_campaigns`}
                  dataKey={`${region.code}_campaigns`}
                  fill={color}
                  yAxisId="left"
                  name={isMultiRegionMode ? `${region.flag} ${region.code}` : 'Campaigns'}
                  radius={[4, 4, 0, 0]}
                  opacity={0.85}
                />
              );
            })}

            {/* Bars for Emails Sent */}
            {selectedMetrics.includes('emailsSent') && displayRegions.map((region) => {
              const color = getColor('emailsSent', region.color);
              return (
                <Bar
                  key={`${region.code}_emailsSent`}
                  dataKey={`${region.code}_emailsSent`}
                  fill={color}
                  yAxisId="left"
                  name={isMultiRegionMode ? `${region.flag} ${region.code}` : 'Emails Sent'}
                  radius={[4, 4, 0, 0]}
                  opacity={0.85}
                />
              );
            })}

            {/* Lines for Open Rate */}
            {selectedMetrics.includes('openRate') && displayRegions.map((region) => {
              const color = getColor('openRate', region.color);
              return (
                <Line
                  key={`${region.code}_openRate`}
                  type="monotone"
                  dataKey={`${region.code}_openRate`}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: '#fff' }}
                  yAxisId="right"
                  name={isMultiRegionMode ? `${region.flag} ${region.code}` : 'Open Rate'}
                  unit="%"
                />
              );
            })}

            {/* Lines for Click Rate */}
            {selectedMetrics.includes('clickRate') && displayRegions.map((region) => {
              const color = getColor('clickRate', region.color);
              return (
                <Line
                  key={`${region.code}_clickRate`}
                  type="monotone"
                  dataKey={`${region.code}_clickRate`}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: '#fff' }}
                  yAxisId="right"
                  name={isMultiRegionMode ? `${region.flag} ${region.code}` : 'Click Rate'}
                  unit="%"
                />
              );
            })}

            {/* Lines for Delivery Rate */}
            {selectedMetrics.includes('deliveryRate') && displayRegions.map((region) => {
              const color = getColor('deliveryRate', region.color);
              return (
                <Line
                  key={`${region.code}_deliveryRate`}
                  type="monotone"
                  dataKey={`${region.code}_deliveryRate`}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: '#fff' }}
                  yAxisId="right"
                  name={isMultiRegionMode ? `${region.flag} ${region.code}` : 'Delivery Rate'}
                  unit="%"
                />
              );
            })}

            {/* Lines for Unsubscribes */}
            {selectedMetrics.includes('unsubscribes') && displayRegions.map((region) => {
              const color = getColor('unsubscribes', region.color);
              return (
                <Line
                  key={`${region.code}_unsubscribes`}
                  type="monotone"
                  dataKey={`${region.code}_unsubscribes`}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: color, strokeWidth: 2, stroke: '#fff' }}
                  yAxisId="right"
                  name={isMultiRegionMode ? `${region.flag} ${region.code}` : 'Unsubscribes'}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}
