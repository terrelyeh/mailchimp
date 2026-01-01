import React, { useMemo } from 'react';
import { Filter, AlertTriangle, ArrowDown } from 'lucide-react';

/**
 * Level 2: Conversion Funnel - 轉換漏斗
 * 分析 EDM 從發送到點擊的轉換流程
 */
export default function ConversionFunnel({ data, isMultiRegion = false }) {
  const funnelData = useMemo(() => {
    // Flatten data
    let campaigns = [];
    if (isMultiRegion && typeof data === 'object' && !Array.isArray(data)) {
      campaigns = Object.values(data).flat().filter(Boolean);
    } else if (Array.isArray(data)) {
      campaigns = data;
    }

    if (campaigns.length === 0) return null;

    // Calculate funnel metrics
    const totalSent = campaigns.reduce((acc, c) => acc + (c.emails_sent || 0), 0);
    const totalBounces = campaigns.reduce((acc, c) => acc + (c.bounces || 0), 0);
    const totalDelivered = totalSent - totalBounces;
    const totalOpens = campaigns.reduce((acc, c) => acc + (c.opens || 0), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);

    const stages = [
      {
        id: 'sent',
        label: '發送',
        value: totalSent,
        rate: 100,
        color: 'bg-blue-500',
        icon: '📤'
      },
      {
        id: 'delivered',
        label: '送達',
        value: totalDelivered,
        rate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
        dropRate: totalSent > 0 ? (totalBounces / totalSent) * 100 : 0,
        dropLabel: '退信',
        color: 'bg-cyan-500',
        icon: '📬'
      },
      {
        id: 'opened',
        label: '開啟',
        value: totalOpens,
        rate: totalSent > 0 ? (totalOpens / totalSent) * 100 : 0,
        dropRate: totalDelivered > 0 ? ((totalDelivered - totalOpens) / totalDelivered) * 100 : 0,
        dropLabel: '未開啟',
        color: 'bg-yellow-500',
        icon: '👁️'
      },
      {
        id: 'clicked',
        label: '點擊',
        value: totalClicks,
        rate: totalSent > 0 ? (totalClicks / totalSent) * 100 : 0,
        dropRate: totalOpens > 0 ? ((totalOpens - totalClicks) / totalOpens) * 100 : 0,
        dropLabel: '未點擊',
        color: 'bg-green-500',
        icon: '🖱️'
      }
    ];

    // Find biggest drop-off
    let maxDropIndex = 1;
    let maxDrop = 0;
    for (let i = 1; i < stages.length; i++) {
      if (stages[i].dropRate > maxDrop) {
        maxDrop = stages[i].dropRate;
        maxDropIndex = i;
      }
    }

    return {
      stages,
      bottleneck: {
        from: stages[maxDropIndex - 1].label,
        to: stages[maxDropIndex].label,
        dropRate: maxDrop
      }
    };
  }, [data, isMultiRegion]);

  if (!funnelData) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">轉換漏斗</h2>
        <div className="text-center text-gray-400 py-8">No data available</div>
      </div>
    );
  }

  const maxValue = funnelData.stages[0].value;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900">轉換漏斗</h2>
        </div>
      </div>

      {/* Bottleneck Alert */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-6 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-sm font-medium text-orange-800">
            瓶頸分析：{funnelData.bottleneck.from} → {funnelData.bottleneck.to} 流失 {funnelData.bottleneck.dropRate.toFixed(1)}%
          </div>
          <div className="text-xs text-orange-600 mt-0.5">
            {funnelData.bottleneck.to === '點擊'
              ? '建議：優化 CTA 按鈕設計和郵件內容'
              : funnelData.bottleneck.to === '開啟'
              ? '建議：優化 Subject Line 和發送時機'
              : '建議：清理無效郵件地址'}
          </div>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="space-y-3">
        {funnelData.stages.map((stage, index) => {
          const widthPercent = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
          const isBottleneck = index > 0 && stage.dropRate === funnelData.bottleneck.dropRate;

          return (
            <div key={stage.id}>
              {/* Drop indicator */}
              {index > 0 && (
                <div className="flex items-center justify-center my-2 text-xs text-gray-400">
                  <ArrowDown className="w-3 h-3 mr-1" />
                  <span className={isBottleneck ? 'text-orange-600 font-medium' : ''}>
                    -{stage.dropRate.toFixed(1)}% {stage.dropLabel}
                  </span>
                </div>
              )}

              {/* Stage bar */}
              <div className="flex items-center gap-4">
                <div className="w-16 text-right">
                  <span className="text-lg">{stage.icon}</span>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{stage.label}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">
                        {stage.value.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({stage.rate.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  <div className="h-8 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div
                      className={`h-full ${stage.color} rounded-lg transition-all duration-500 flex items-center justify-end pr-2`}
                      style={{ width: `${Math.max(widthPercent, 5)}%` }}
                    >
                      {widthPercent > 20 && (
                        <span className="text-xs text-white font-medium">
                          {stage.rate.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {((funnelData.stages[1].value / funnelData.stages[0].value) * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">送達率</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {((funnelData.stages[2].value / funnelData.stages[0].value) * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">開信率</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {funnelData.stages[2].value > 0
              ? ((funnelData.stages[3].value / funnelData.stages[2].value) * 100).toFixed(1)
              : 0}%
          </div>
          <div className="text-xs text-gray-500">開啟後點擊率</div>
        </div>
      </div>
    </div>
  );
}
