import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Users, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../config';

/**
 * SubscriberTrendChart - Shows subscriber growth trends
 *
 * For Home Dashboard: Compare all regions
 * For Region Detail: Compare audiences or show single audience metrics
 */
export default function SubscriberTrendChart({
  regions = [],
  currentRegion = null,
  selectedAudience = null,
  isOverview = true
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch subscriber growth data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let url = `${API_BASE_URL}/api/subscribers/growth?months=12`;

        if (currentRegion) {
          url += `&region=${currentRegion}`;
          if (selectedAudience) {
            url += `&audience_id=${selectedAudience}`;
          }
        }

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch subscriber data');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        console.error('Error fetching subscriber growth:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentRegion, selectedAudience]);

  // Process data for chart
  const chartData = useMemo(() => {
    if (!data) return [];

    if (isOverview && data.regions) {
      // Home Dashboard: Aggregate by month across regions
      const monthlyData = {};

      data.regions.forEach(region => {
        (region.growth_history || []).forEach(entry => {
          const month = entry.month;
          if (!monthlyData[month]) {
            monthlyData[month] = {
              month,
              monthFormatted: formatMonth(month),
              total: 0
            };
          }
          // Use 'existing' as the subscriber count for that month
          monthlyData[month][region.region] = entry.existing || 0;
          monthlyData[month].total += entry.existing || 0;
        });
      });

      // Sort by month ascending
      return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    } else if (data.audiences) {
      // Region Detail (All Audiences): Compare audiences
      const monthlyData = {};

      data.audiences.forEach(audience => {
        (audience.growth_history || []).forEach(entry => {
          const month = entry.month;
          if (!monthlyData[month]) {
            monthlyData[month] = {
              month,
              monthFormatted: formatMonth(month),
              total: 0
            };
          }
          monthlyData[month][audience.id] = entry.existing || 0;
          monthlyData[month][`${audience.id}_name`] = audience.name;
          monthlyData[month].total += entry.existing || 0;
        });
      });

      return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    } else if (data.audience) {
      // Single Audience Detail
      return (data.audience.growth_history || [])
        .map(entry => ({
          month: entry.month,
          monthFormatted: formatMonth(entry.month),
          subscribers: entry.existing || 0,
          newSubscribers: entry.subscribed || 0,
          unsubscribed: entry.unsubscribed || 0,
          netChange: (entry.subscribed || 0) - (entry.unsubscribed || 0) - (entry.cleaned || 0)
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    }

    return [];
  }, [data, isOverview]);

  // Format month for display
  function formatMonth(monthStr) {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month, 10) - 1]} ${year.slice(2)}`;
  }

  // Get region color
  const getRegionColor = (regionCode) => {
    const region = regions.find(r => r.code === regionCode);
    return region?.color || '#6366F1';
  };

  // Loading state
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-500" />
          <h2 className="section-title">Subscriber Trend</h2>
        </div>
        <div className="h-[200px] flex items-center justify-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading subscriber data...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-500" />
          <h2 className="section-title">Subscriber Trend</h2>
        </div>
        <div className="h-[200px] flex items-center justify-center text-gray-400">
          Unable to load subscriber data
        </div>
      </div>
    );
  }

  // No data state
  if (!data || chartData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-purple-500" />
          <h2 className="section-title">Subscriber Trend</h2>
        </div>
        <div className="h-[200px] flex items-center justify-center text-gray-400">
          No subscriber data available
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (isOverview && data.regions) {
      const totalSubscribers = data.grand_total || 0;

      // Calculate growth from first to last month
      const firstMonth = chartData[0];
      const lastMonth = chartData[chartData.length - 1];
      const growth = lastMonth && firstMonth
        ? ((lastMonth.total - firstMonth.total) / firstMonth.total * 100)
        : 0;

      return {
        total: totalSubscribers,
        growth: growth.toFixed(1),
        isPositive: growth >= 0
      };
    } else if (data.audience) {
      const metrics = data.audience.metrics || {};
      return {
        total: data.audience.current_subscribers || 0,
        growthRate: metrics.growth_rate || 0,
        churnRate: metrics.churn_rate || 0,
        netChange: metrics.net_change || 0,
        isPositive: (metrics.growth_rate || 0) >= 0
      };
    } else if (data.audiences) {
      const total = data.total_subscribers || 0;
      return { total };
    }
    return { total: 0 };
  }, [data, chartData, isOverview]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white p-3 border border-gray-200 shadow-xl rounded-lg">
        <p className="font-bold text-sm mb-2 pb-2 border-b border-gray-200">{label}</p>
        <div className="space-y-1 text-xs">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600">{entry.name}:</span>
              </div>
              <span className="font-medium text-gray-900">
                {Number(entry.value).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-500" />
          <h2 className="section-title">Subscriber Trend</h2>
        </div>

        {/* Summary Stats */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-lg">
            <span className="text-purple-600 font-medium">Total:</span>
            <span className="font-bold text-purple-700">
              {summaryStats.total.toLocaleString()}
            </span>
          </div>

          {summaryStats.growth !== undefined && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
              summaryStats.isPositive ? 'bg-green-50' : 'bg-red-50'
            }`}>
              {summaryStats.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`font-medium ${
                summaryStats.isPositive ? 'text-green-700' : 'text-red-700'
              }`}>
                {summaryStats.isPositive ? '+' : ''}{summaryStats.growth}%
              </span>
            </div>
          )}

          {summaryStats.churnRate !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-lg">
              <span className="text-amber-600 text-xs">Churn:</span>
              <span className="font-medium text-amber-700">{summaryStats.churnRate}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[200px] md:h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {isOverview && data.regions ? (
                data.regions.map(region => (
                  <linearGradient key={region.region} id={`gradient-${region.region}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getRegionColor(region.region)} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={getRegionColor(region.region)} stopOpacity={0}/>
                  </linearGradient>
                ))
              ) : (
                <linearGradient id="gradient-default" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
            <XAxis
              dataKey="monthFormatted"
              stroke="#9CA3AF"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#9CA3AF"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value;
              }}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              iconType="circle"
              iconSize={8}
            />

            {isOverview && data.regions ? (
              // Home Dashboard: Stacked area for each region
              data.regions.map(region => (
                <Area
                  key={region.region}
                  type="monotone"
                  dataKey={region.region}
                  name={region.region_name || region.region}
                  stroke={getRegionColor(region.region)}
                  strokeWidth={2}
                  fill={`url(#gradient-${region.region})`}
                  stackId="1"
                />
              ))
            ) : data.audience ? (
              // Single Audience: Show subscriber count
              <Area
                type="monotone"
                dataKey="subscribers"
                name="Subscribers"
                stroke="#8B5CF6"
                strokeWidth={2}
                fill="url(#gradient-default)"
              />
            ) : data.audiences ? (
              // Multiple Audiences in region
              data.audiences.slice(0, 5).map((audience, index) => {
                const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
                return (
                  <Area
                    key={audience.id}
                    type="monotone"
                    dataKey={audience.id}
                    name={audience.name}
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    fill="none"
                  />
                );
              })
            ) : null}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Region breakdown for overview */}
      {isOverview && data.regions && data.regions.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-3">
            {data.regions.map(region => (
              <div
                key={region.region}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getRegionColor(region.region) }}
                />
                <span className="text-gray-600">{region.region_name || region.region}:</span>
                <span className="font-medium text-gray-900">
                  {(region.total_subscribers || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
