import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Trophy, Target } from 'lucide-react';

/**
 * Level 1: Executive Summary - 高階主管摘要
 * 30 秒內讓老闆掌握全局
 */
export default function ExecutiveSummary({ data, isMultiRegion = false, previousPeriodData = null }) {
  const analysis = useMemo(() => {
    // Flatten data
    let campaigns = [];
    if (isMultiRegion && typeof data === 'object' && !Array.isArray(data)) {
      campaigns = Object.values(data).flat().filter(Boolean);
    } else if (Array.isArray(data)) {
      campaigns = data;
    }

    if (campaigns.length === 0) {
      return null;
    }

    // Calculate current metrics (weighted average)
    const totalSent = campaigns.reduce((acc, c) => acc + (c.emails_sent || 0), 0);
    const totalOpens = campaigns.reduce((acc, c) => acc + (c.opens || 0), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
    const totalUnsubs = campaigns.reduce((acc, c) => acc + (c.unsubscribed || 0), 0);
    const totalBounces = campaigns.reduce((acc, c) => acc + (c.bounces || 0), 0);

    const openRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (totalClicks / totalSent) * 100 : 0;
    const unsubRate = totalSent > 0 ? (totalUnsubs / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounces / totalSent) * 100 : 0;
    const deliveryRate = totalSent > 0 ? ((totalSent - totalBounces) / totalSent) * 100 : 0;

    // Industry benchmarks (Mailchimp averages)
    const benchmarks = {
      openRate: 21.5,    // Industry average
      clickRate: 2.7,
      unsubRate: 0.26,
      bounceRate: 0.4
    };

    // Targets (slightly above benchmarks)
    const targets = {
      openRate: 25,
      clickRate: 3.5,
      unsubRate: 0.2,
      bounceRate: 0.3
    };

    // Find best/worst performing region
    let regionPerformance = [];
    if (isMultiRegion && typeof data === 'object' && !Array.isArray(data)) {
      regionPerformance = Object.entries(data).map(([region, regionCampaigns]) => {
        if (!Array.isArray(regionCampaigns) || regionCampaigns.length === 0) {
          return { region, openRate: 0, campaigns: 0 };
        }
        const sent = regionCampaigns.reduce((acc, c) => acc + (c.emails_sent || 0), 0);
        const opens = regionCampaigns.reduce((acc, c) => acc + (c.opens || 0), 0);
        return {
          region,
          openRate: sent > 0 ? (opens / sent) * 100 : 0,
          campaigns: regionCampaigns.length
        };
      }).filter(r => r.campaigns > 0).sort((a, b) => b.openRate - a.openRate);
    }

    // Determine overall status
    const isOpenRateGood = openRate >= targets.openRate;
    const isClickRateGood = clickRate >= targets.clickRate;
    const isUnsubRateGood = unsubRate <= targets.unsubRate;

    const goodCount = [isOpenRateGood, isClickRateGood, isUnsubRateGood].filter(Boolean).length;
    let overallStatus = 'warning';
    if (goodCount === 3) overallStatus = 'excellent';
    else if (goodCount >= 2) overallStatus = 'good';
    else if (goodCount === 1) overallStatus = 'warning';
    else overallStatus = 'critical';

    // Generate insights
    const insights = [];

    // Open Rate insight
    if (openRate >= targets.openRate) {
      insights.push({
        type: 'success',
        icon: CheckCircle,
        text: `開信率 ${openRate.toFixed(1)}%，超越目標 ${((openRate - targets.openRate) / targets.openRate * 100).toFixed(0)}%`,
        detail: `目標: ${targets.openRate}% | 行業平均: ${benchmarks.openRate}%`
      });
    } else if (openRate >= benchmarks.openRate) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        text: `開信率 ${openRate.toFixed(1)}%，高於行業平均但未達目標`,
        detail: `目標: ${targets.openRate}% | 差距: ${(targets.openRate - openRate).toFixed(1)}%`
      });
    } else {
      insights.push({
        type: 'critical',
        icon: XCircle,
        text: `開信率 ${openRate.toFixed(1)}%，低於行業平均`,
        detail: `行業平均: ${benchmarks.openRate}% | 需提升: ${(benchmarks.openRate - openRate).toFixed(1)}%`
      });
    }

    // Best/Worst region insight
    if (regionPerformance.length >= 2) {
      const best = regionPerformance[0];
      const worst = regionPerformance[regionPerformance.length - 1];

      insights.push({
        type: 'info',
        icon: Trophy,
        text: `${best.region} 區域表現最佳 (${best.openRate.toFixed(1)}%)`,
        detail: `${worst.region} 區域需加強 (${worst.openRate.toFixed(1)}%)`
      });
    }

    // Unsub alert
    if (unsubRate > targets.unsubRate) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        text: `退訂率偏高 (${unsubRate.toFixed(2)}%)，建議檢視發送頻率`,
        detail: `目標: < ${targets.unsubRate}%`
      });
    }

    // Bounce rate alert
    if (bounceRate > 2) {
      insights.push({
        type: 'critical',
        icon: XCircle,
        text: `退信率過高 (${bounceRate.toFixed(1)}%)，需清理名單`,
        detail: `健康標準: < 2%`
      });
    }

    return {
      metrics: { openRate, clickRate, unsubRate, bounceRate, deliveryRate, totalSent, totalCampaigns: campaigns.length },
      benchmarks,
      targets,
      regionPerformance,
      overallStatus,
      insights
    };
  }, [data, isMultiRegion]);

  if (!analysis) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="text-center text-gray-400 py-8">Loading executive summary...</div>
      </div>
    );
  }

  const statusConfig = {
    excellent: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', label: '表現優異', icon: '🎯' },
    good: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', label: '表現良好', icon: '✅' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', label: '需要關注', icon: '⚠️' },
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', label: '需要改善', icon: '🚨' }
  };

  const status = statusConfig[analysis.overallStatus];

  return (
    <div className={`${status.bg} ${status.border} border-2 rounded-xl p-6 mb-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{status.icon}</span>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Executive Summary</h2>
            <p className="text-sm text-gray-600">
              {analysis.metrics.totalCampaigns} campaigns · {analysis.metrics.totalSent.toLocaleString()} emails sent
            </p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full ${status.bg} ${status.text} font-bold text-sm border ${status.border}`}>
          {status.label}
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricBadge
          label="開信率"
          value={`${analysis.metrics.openRate.toFixed(1)}%`}
          target={analysis.targets.openRate}
          actual={analysis.metrics.openRate}
          benchmark={analysis.benchmarks.openRate}
        />
        <MetricBadge
          label="點擊率"
          value={`${analysis.metrics.clickRate.toFixed(1)}%`}
          target={analysis.targets.clickRate}
          actual={analysis.metrics.clickRate}
          benchmark={analysis.benchmarks.clickRate}
        />
        <MetricBadge
          label="送達率"
          value={`${analysis.metrics.deliveryRate.toFixed(1)}%`}
          target={99}
          actual={analysis.metrics.deliveryRate}
          benchmark={97}
        />
        <MetricBadge
          label="退訂率"
          value={`${analysis.metrics.unsubRate.toFixed(2)}%`}
          target={analysis.targets.unsubRate}
          actual={analysis.targets.unsubRate - analysis.metrics.unsubRate} // Inverted for display
          benchmark={analysis.benchmarks.unsubRate}
          inverted
        />
      </div>

      {/* Insights */}
      <div className="space-y-2">
        {analysis.insights.map((insight, idx) => (
          <InsightRow key={idx} insight={insight} />
        ))}
      </div>
    </div>
  );
}

function MetricBadge({ label, value, target, actual, benchmark, inverted = false }) {
  const isGood = inverted ? actual >= 0 : actual >= target;
  const vsBenchmark = inverted ? actual >= 0 : actual >= benchmark;

  return (
    <div className="bg-white/80 rounded-lg p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className={`text-xs mt-1 ${isGood ? 'text-green-600' : vsBenchmark ? 'text-yellow-600' : 'text-red-600'}`}>
        {isGood ? '✓ 達標' : vsBenchmark ? '~ 接近' : '✗ 未達標'}
      </div>
    </div>
  );
}

function InsightRow({ insight }) {
  const colorMap = {
    success: 'text-green-700 bg-green-100',
    warning: 'text-yellow-700 bg-yellow-100',
    critical: 'text-red-700 bg-red-100',
    info: 'text-blue-700 bg-blue-100'
  };

  const Icon = insight.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${colorMap[insight.type]}`}>
      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
      <div>
        <div className="font-medium text-sm">{insight.text}</div>
        {insight.detail && (
          <div className="text-xs opacity-75 mt-0.5">{insight.detail}</div>
        )}
      </div>
    </div>
  );
}
