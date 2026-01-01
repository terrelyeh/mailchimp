import React, { useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Level 1: Goal Progress - 目標達成進度
 * 視覺化顯示 KPI 達成狀態
 */
export default function GoalProgress({ data, isMultiRegion = false }) {
  const metrics = useMemo(() => {
    // Flatten data
    let campaigns = [];
    if (isMultiRegion && typeof data === 'object' && !Array.isArray(data)) {
      campaigns = Object.values(data).flat().filter(Boolean);
    } else if (Array.isArray(data)) {
      campaigns = data;
    }

    if (campaigns.length === 0) return null;

    // Calculate metrics (weighted)
    const totalSent = campaigns.reduce((acc, c) => acc + (c.emails_sent || 0), 0);
    const totalOpens = campaigns.reduce((acc, c) => acc + (c.opens || 0), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
    const totalBounces = campaigns.reduce((acc, c) => acc + (c.bounces || 0), 0);

    const openRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (totalClicks / totalSent) * 100 : 0;
    const deliveryRate = totalSent > 0 ? ((totalSent - totalBounces) / totalSent) * 100 : 0;

    // Define goals
    return [
      {
        id: 'openRate',
        label: '開信率',
        current: openRate,
        target: 25,
        unit: '%',
        trend: 2.3, // Mock: would come from comparing periods
        color: 'yellow'
      },
      {
        id: 'clickRate',
        label: '點擊率',
        current: clickRate,
        target: 3.5,
        unit: '%',
        trend: -0.2,
        color: 'cyan'
      },
      {
        id: 'deliveryRate',
        label: '送達率',
        current: deliveryRate,
        target: 98,
        unit: '%',
        trend: 0.5,
        color: 'green'
      },
      {
        id: 'campaigns',
        label: 'Campaigns',
        current: campaigns.length,
        target: 30, // Monthly target
        unit: '',
        trend: 5,
        color: 'blue'
      }
    ];
  }, [data, isMultiRegion]);

  if (!metrics) {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex items-center gap-2 mb-6">
        <Target className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-bold text-gray-900">目標達成進度</h2>
        <span className="text-xs text-gray-500 ml-auto">本期表現 vs 目標</span>
      </div>

      <div className="space-y-5">
        {metrics.map((metric) => (
          <GoalBar key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
}

function GoalBar({ metric }) {
  const percentage = Math.min((metric.current / metric.target) * 100, 150);
  const isAchieved = metric.current >= metric.target;
  const isClose = percentage >= 80;

  const colorMap = {
    yellow: {
      bar: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
      bg: 'bg-yellow-100',
      text: 'text-yellow-700'
    },
    cyan: {
      bar: 'bg-gradient-to-r from-cyan-400 to-cyan-500',
      bg: 'bg-cyan-100',
      text: 'text-cyan-700'
    },
    green: {
      bar: 'bg-gradient-to-r from-green-400 to-green-500',
      bg: 'bg-green-100',
      text: 'text-green-700'
    },
    blue: {
      bar: 'bg-gradient-to-r from-blue-400 to-blue-500',
      bg: 'bg-blue-100',
      text: 'text-blue-700'
    }
  };

  const colors = colorMap[metric.color] || colorMap.blue;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{metric.label}</span>
          {metric.trend !== 0 && (
            <span className={`flex items-center text-xs ${metric.trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {metric.trend > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
              {metric.trend > 0 ? '+' : ''}{metric.trend}{metric.unit}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">
            {metric.current.toFixed(metric.unit === '%' ? 1 : 0)}{metric.unit}
          </span>
          <span className="text-sm text-gray-400">/ {metric.target}{metric.unit}</span>
          {isAchieved ? (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">達標</span>
          ) : isClose ? (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">接近</span>
          ) : (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">進行中</span>
          )}
        </div>
      </div>

      <div className="relative">
        {/* Background bar */}
        <div className={`h-3 ${colors.bg} rounded-full overflow-hidden`}>
          {/* Progress bar */}
          <div
            className={`h-full ${colors.bar} rounded-full transition-all duration-500 relative`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
          </div>
        </div>

        {/* Target marker */}
        <div
          className="absolute top-0 w-0.5 h-3 bg-gray-600"
          style={{ left: '100%', transform: 'translateX(-1px)' }}
        />

        {/* Percentage label */}
        <div className="absolute -top-0.5 text-xs font-bold text-gray-700"
          style={{ left: `${Math.min(percentage, 100)}%`, transform: 'translateX(-50%)' }}>
        </div>
      </div>

      {/* Progress percentage */}
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">0%</span>
        <span className={`text-xs font-medium ${isAchieved ? 'text-green-600' : colors.text}`}>
          {percentage.toFixed(0)}% 達成
        </span>
        <span className="text-xs text-gray-400">100%</span>
      </div>
    </div>
  );
}
