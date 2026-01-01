import React, { useMemo } from 'react';
import { Users, AlertTriangle, CheckCircle, TrendingDown, Heart } from 'lucide-react';

/**
 * Level 2: Audience Health - 受眾名單健康度
 * 分析各區域名單品質
 */
export default function AudienceHealth({ regionsData, regions, audiences }) {
  const healthData = useMemo(() => {
    if (!regionsData || !regions || regions.length === 0) return null;

    const regionHealth = regions.map(region => {
      const campaigns = regionsData[region.code] || [];
      if (!Array.isArray(campaigns) || campaigns.length === 0) {
        return {
          ...region,
          hasData: false
        };
      }

      // Calculate engagement metrics
      const totalSent = campaigns.reduce((acc, c) => acc + (c.emails_sent || 0), 0);
      const totalOpens = campaigns.reduce((acc, c) => acc + (c.opens || 0), 0);
      const totalBounces = campaigns.reduce((acc, c) => acc + (c.bounces || 0), 0);
      const totalUnsubs = campaigns.reduce((acc, c) => acc + (c.unsubscribed || 0), 0);

      const openRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0;
      const bounceRate = totalSent > 0 ? (totalBounces / totalSent) * 100 : 0;
      const unsubRate = totalSent > 0 ? (totalUnsubs / totalSent) * 100 : 0;

      // Estimate audience segments based on engagement
      // Active: opened at least once recently (estimate from open rate)
      // Dormant: no opens in a while
      // At-risk: high bounce/unsub tendency

      const activePercent = Math.min(openRate * 2.5, 80); // Estimate: open rate correlates with active users
      const atRiskPercent = bounceRate + unsubRate * 2;
      const dormantPercent = 100 - activePercent - atRiskPercent;

      // Health score (0-100)
      // Factors: high open rate (+), low bounce rate (+), low unsub rate (+)
      const healthScore = Math.min(100, Math.max(0,
        (openRate * 2) + // Open rate weight
        (100 - bounceRate * 10) * 0.3 + // Bounce penalty
        (100 - unsubRate * 20) * 0.2 // Unsub penalty
      ));

      let healthStatus = 'healthy';
      if (healthScore < 40) healthStatus = 'critical';
      else if (healthScore < 60) healthStatus = 'warning';
      else if (healthScore < 75) healthStatus = 'moderate';

      // Get subscriber count if available
      let subscriberCount = null;
      if (audiences) {
        if (typeof audiences === 'object' && audiences[region.code]) {
          subscriberCount = audiences[region.code].reduce((acc, a) => acc + (a.member_count || 0), 0);
        } else if (Array.isArray(audiences)) {
          subscriberCount = audiences.reduce((acc, a) => acc + (a.member_count || 0), 0);
        }
      }

      return {
        ...region,
        hasData: true,
        subscribers: subscriberCount,
        totalSent,
        openRate,
        bounceRate,
        unsubRate,
        activePercent: Math.max(0, activePercent),
        dormantPercent: Math.max(0, dormantPercent),
        atRiskPercent: Math.max(0, Math.min(atRiskPercent, 100)),
        healthScore,
        healthStatus,
        campaigns: campaigns.length
      };
    }).filter(r => r.hasData);

    // Sort by health score
    regionHealth.sort((a, b) => b.healthScore - a.healthScore);

    // Find regions needing attention
    const needsAttention = regionHealth.filter(r => r.healthStatus === 'warning' || r.healthStatus === 'critical');

    return {
      regions: regionHealth,
      needsAttention,
      avgHealthScore: regionHealth.length > 0
        ? regionHealth.reduce((acc, r) => acc + r.healthScore, 0) / regionHealth.length
        : 0
    };
  }, [regionsData, regions, audiences]);

  if (!healthData || healthData.regions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">受眾名單健康度</h2>
        <div className="text-center text-gray-400 py-8">No data available</div>
      </div>
    );
  }

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500' };
      case 'moderate': return { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500' };
      case 'warning': return { bg: 'bg-yellow-100', text: 'text-yellow-700', bar: 'bg-yellow-500' };
      case 'critical': return { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', bar: 'bg-gray-500' };
    }
  };

  const getHealthLabel = (status) => {
    switch (status) {
      case 'healthy': return '健康';
      case 'moderate': return '良好';
      case 'warning': return '需關注';
      case 'critical': return '需改善';
      default: return '未知';
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900">受眾名單健康度</h2>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-gray-500">整體健康分數:</span>
          <span className={`font-bold ${healthData.avgHealthScore >= 60 ? 'text-green-600' : 'text-yellow-600'}`}>
            {healthData.avgHealthScore.toFixed(0)}/100
          </span>
        </div>
      </div>

      {/* Alert for regions needing attention */}
      {healthData.needsAttention.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-orange-800">
                {healthData.needsAttention.length} 個區域需要關注
              </div>
              <div className="text-xs text-orange-600 mt-0.5">
                {healthData.needsAttention.map(r => r.name).join('、')} - 建議進行名單清理
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Region Health Table */}
      <div className="space-y-4">
        {healthData.regions.map((region) => {
          const colors = getHealthColor(region.healthStatus);

          return (
            <div key={region.code} className="border border-gray-100 rounded-lg p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{region.flag}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{region.name}</div>
                    <div className="text-xs text-gray-500">
                      {region.subscribers ? `${region.subscribers.toLocaleString()} 訂閱者 · ` : ''}
                      {region.campaigns} campaigns
                    </div>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                  {getHealthLabel(region.healthStatus)}
                </div>
              </div>

              {/* Health Score Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>健康分數</span>
                  <span className="font-medium">{region.healthScore.toFixed(0)}/100</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                    style={{ width: `${region.healthScore}%` }}
                  />
                </div>
              </div>

              {/* Segment Breakdown */}
              <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-2">
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${region.activePercent}%` }}
                  title={`活躍用戶: ${region.activePercent.toFixed(0)}%`}
                />
                <div
                  className="bg-gray-300 transition-all"
                  style={{ width: `${region.dormantPercent}%` }}
                  title={`沉睡用戶: ${region.dormantPercent.toFixed(0)}%`}
                />
                <div
                  className="bg-red-400 transition-all"
                  style={{ width: `${region.atRiskPercent}%` }}
                  title={`流失風險: ${region.atRiskPercent.toFixed(0)}%`}
                />
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span>活躍 {region.activePercent.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                  <span>沉睡 {region.dormantPercent.toFixed(0)}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-400 rounded-full" />
                  <span>風險 {region.atRiskPercent.toFixed(0)}%</span>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-gray-500">開信率</div>
                  <div className={`font-bold ${region.openRate >= 20 ? 'text-green-600' : 'text-gray-700'}`}>
                    {region.openRate.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">退信率</div>
                  <div className={`font-bold ${region.bounceRate > 2 ? 'text-red-600' : 'text-gray-700'}`}>
                    {region.bounceRate.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-500">退訂率</div>
                  <div className={`font-bold ${region.unsubRate > 0.5 ? 'text-orange-600' : 'text-gray-700'}`}>
                    {region.unsubRate.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
