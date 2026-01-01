import React, { useMemo } from 'react';
import { Lightbulb, ArrowRight, Zap, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * Level 2: Actionable Insights - 可執行建議
 * 根據數據分析提供具體改善建議
 */
export default function ActionableInsights({ data, regionsData, regions, isMultiRegion = false }) {
  const insights = useMemo(() => {
    // Flatten data
    let campaigns = [];
    if (isMultiRegion && typeof data === 'object' && !Array.isArray(data)) {
      campaigns = Object.values(data).flat().filter(Boolean);
    } else if (Array.isArray(data)) {
      campaigns = data;
    }

    if (campaigns.length === 0) return [];

    const result = [];

    // Calculate overall metrics
    const totalSent = campaigns.reduce((acc, c) => acc + (c.emails_sent || 0), 0);
    const totalOpens = campaigns.reduce((acc, c) => acc + (c.opens || 0), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
    const totalBounces = campaigns.reduce((acc, c) => acc + (c.bounces || 0), 0);
    const totalUnsubs = campaigns.reduce((acc, c) => acc + (c.unsubscribed || 0), 0);

    const openRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (totalClicks / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (totalBounces / totalSent) * 100 : 0;
    const unsubRate = totalSent > 0 ? (totalUnsubs / totalSent) * 100 : 0;
    const clickToOpenRate = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0;

    // 1. Open Rate Analysis
    if (openRate < 20) {
      result.push({
        priority: 'high',
        category: 'open_rate',
        title: '優化 Subject Line 提升開信率',
        description: `目前開信率 ${openRate.toFixed(1)}% 低於行業平均 (21.5%)`,
        impact: '預估提升 3-5%',
        actions: [
          '使用個人化標題（加入收件者名字）',
          '控制標題長度在 30 字元以內',
          '加入數字或具體利益點',
          'A/B 測試不同標題風格'
        ],
        icon: TrendingUp
      });
    } else if (openRate >= 25) {
      result.push({
        priority: 'success',
        category: 'open_rate',
        title: '開信率表現優異',
        description: `目前開信率 ${openRate.toFixed(1)}% 超越目標，持續保持！`,
        impact: '維持現有策略',
        actions: [
          '記錄成功的 Subject Line 模式',
          '分析高表現 Campaign 共同點'
        ],
        icon: CheckCircle
      });
    }

    // 2. Click Rate / CTO Analysis
    if (clickToOpenRate < 10) {
      result.push({
        priority: 'high',
        category: 'click_rate',
        title: '改善郵件內容提升點擊率',
        description: `開啟後點擊率僅 ${clickToOpenRate.toFixed(1)}%，內容吸引力不足`,
        impact: '預估提升 2-3%',
        actions: [
          '優化 CTA 按鈕設計（顏色、大小、位置）',
          '減少郵件長度，突出重點',
          '使用更吸引人的圖片和視覺',
          '確保 CTA 在首屏可見'
        ],
        icon: Zap
      });
    }

    // 3. Bounce Rate Analysis
    if (bounceRate > 2) {
      result.push({
        priority: 'high',
        category: 'list_health',
        title: '清理無效郵件地址',
        description: `退信率 ${bounceRate.toFixed(1)}% 過高，影響發送信譽`,
        impact: '降低退信率至 < 2%',
        actions: [
          '移除硬退信 (Hard Bounce) 地址',
          '對沉睡用戶發送激活 Campaign',
          '設定自動清理規則',
          '驗證新訂閱者郵件地址'
        ],
        icon: AlertTriangle
      });
    }

    // 4. Unsub Rate Analysis
    if (unsubRate > 0.3) {
      result.push({
        priority: 'medium',
        category: 'engagement',
        title: '檢視發送頻率和內容相關性',
        description: `退訂率 ${unsubRate.toFixed(2)}% 偏高`,
        impact: '降低退訂率 50%',
        actions: [
          '檢視發送頻率是否過高',
          '提供訂閱頻率選項',
          '確保內容符合訂閱者預期',
          '改善郵件分眾策略'
        ],
        icon: AlertTriangle
      });
    }

    // 5. Send Time Optimization
    // Analyze by day of week
    const dayPerformance = {};
    campaigns.forEach(c => {
      if (!c.send_time) return;
      const day = new Date(c.send_time).getDay();
      if (!dayPerformance[day]) {
        dayPerformance[day] = { sent: 0, opens: 0 };
      }
      dayPerformance[day].sent += c.emails_sent || 0;
      dayPerformance[day].opens += c.opens || 0;
    });

    let bestDay = null;
    let bestDayRate = 0;
    Object.entries(dayPerformance).forEach(([day, stats]) => {
      if (stats.sent > 0) {
        const rate = (stats.opens / stats.sent) * 100;
        if (rate > bestDayRate) {
          bestDayRate = rate;
          bestDay = parseInt(day);
        }
      }
    });

    if (bestDay !== null) {
      const dayNames = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
      result.push({
        priority: 'medium',
        category: 'timing',
        title: `優化發送時間至 ${dayNames[bestDay]}`,
        description: `${dayNames[bestDay]} 的開信率最高 (${bestDayRate.toFixed(1)}%)`,
        impact: '預估提升 1-2%',
        actions: [
          `將主要 Campaign 安排在 ${dayNames[bestDay]} 發送`,
          '測試上午 10:00 和下午 2:00 時段',
          '避開週末發送商業郵件'
        ],
        icon: TrendingUp
      });
    }

    // 6. Region-specific insights
    if (isMultiRegion && regionsData && regions) {
      const regionStats = regions.map(r => {
        const regionCampaigns = regionsData[r.code] || [];
        if (regionCampaigns.length === 0) return null;

        const sent = regionCampaigns.reduce((acc, c) => acc + (c.emails_sent || 0), 0);
        const opens = regionCampaigns.reduce((acc, c) => acc + (c.opens || 0), 0);
        return {
          ...r,
          openRate: sent > 0 ? (opens / sent) * 100 : 0
        };
      }).filter(Boolean);

      const sortedRegions = regionStats.sort((a, b) => a.openRate - b.openRate);
      const worstRegion = sortedRegions[0];

      if (worstRegion && worstRegion.openRate < openRate * 0.8) {
        result.push({
          priority: 'medium',
          category: 'regional',
          title: `加強 ${worstRegion.name} 區域策略`,
          description: `${worstRegion.name} 開信率 ${worstRegion.openRate.toFixed(1)}% 明顯落後`,
          impact: '縮小區域差距',
          actions: [
            '分析該區域受眾特性',
            '考慮當地時區發送時間',
            '調整內容以符合當地偏好',
            '檢視該區域名單品質'
          ],
          icon: AlertTriangle
        });
      }
    }

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, success: 2 };
    result.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return result;
  }, [data, regionsData, regions, isMultiRegion]);

  if (insights.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">可執行建議</h2>
        <div className="text-center text-gray-400 py-8">No insights available</div>
      </div>
    );
  }

  const getPriorityConfig = (priority) => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-700',
          label: '高優先',
          icon: '🔥'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-700',
          label: '中優先',
          icon: '⚡'
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          badge: 'bg-green-100 text-green-700',
          label: '表現良好',
          icon: '✅'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          badge: 'bg-gray-100 text-gray-700',
          label: '建議',
          icon: '💡'
        };
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold text-gray-900">可執行建議</h2>
        </div>
        <div className="text-xs text-gray-500">
          依優先級排序 · {insights.length} 項建議
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((insight, index) => {
          const config = getPriorityConfig(insight.priority);
          const Icon = insight.icon;

          return (
            <div
              key={index}
              className={`${config.bg} ${config.border} border rounded-lg p-4`}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Icon className="w-5 h-5 text-gray-700" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{config.icon}</span>
                    <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${config.badge}`}>
                      {config.label}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-2">{insight.description}</p>

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <span className="font-medium">預期效果:</span>
                    <span className="bg-white px-2 py-0.5 rounded text-gray-700">{insight.impact}</span>
                  </div>

                  {/* Action Items */}
                  <div className="space-y-1">
                    {insight.actions.slice(0, 3).map((action, actionIndex) => (
                      <div key={actionIndex} className="flex items-center gap-2 text-sm text-gray-700">
                        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span>{action}</span>
                      </div>
                    ))}
                    {insight.actions.length > 3 && (
                      <div className="text-xs text-gray-500 ml-5">
                        +{insight.actions.length - 3} 更多建議...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-gray-500">優先處理:</span>
            <span className="font-medium text-red-600">
              {insights.filter(i => i.priority === 'high').length} 項高優先
            </span>
            <span className="font-medium text-yellow-600">
              {insights.filter(i => i.priority === 'medium').length} 項中優先
            </span>
          </div>
          <div className="text-xs text-gray-500">
            建議每週檢視一次
          </div>
        </div>
      </div>
    </div>
  );
}
