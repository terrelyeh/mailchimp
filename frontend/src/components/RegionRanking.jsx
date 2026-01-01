import React, { useMemo } from 'react';
import { Globe, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';

/**
 * Level 1: Region Ranking - 區域績效排名
 * 一眼看出哪個區域表現最好/最差
 */
export default function RegionRanking({ regionsData, regions, onRegionClick }) {
  const rankings = useMemo(() => {
    if (!regionsData || !regions || regions.length === 0) return [];

    return regions.map(region => {
      const campaigns = regionsData[region.code] || [];
      if (!Array.isArray(campaigns) || campaigns.length === 0) {
        return {
          ...region,
          openRate: 0,
          clickRate: 0,
          totalSent: 0,
          campaigns: 0,
          hasData: false
        };
      }

      const totalSent = campaigns.reduce((acc, c) => acc + (c.emails_sent || 0), 0);
      const totalOpens = campaigns.reduce((acc, c) => acc + (c.opens || 0), 0);
      const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);

      return {
        ...region,
        openRate: totalSent > 0 ? (totalOpens / totalSent) * 100 : 0,
        clickRate: totalSent > 0 ? (totalClicks / totalSent) * 100 : 0,
        totalSent,
        campaigns: campaigns.length,
        hasData: true
      };
    })
    .filter(r => r.hasData)
    .sort((a, b) => b.openRate - a.openRate);
  }, [regionsData, regions]);

  if (rankings.length === 0) {
    return null;
  }

  const maxOpenRate = Math.max(...rankings.map(r => r.openRate), 1);
  const target = 25; // Target open rate

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900">區域績效排名</h2>
        </div>
        <div className="text-xs text-gray-500">
          依開信率排序 · 目標: {target}%
        </div>
      </div>

      <div className="space-y-4">
        {rankings.map((region, index) => {
          const rank = index + 1;
          const barWidth = (region.openRate / maxOpenRate) * 100;
          const isAboveTarget = region.openRate >= target;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

          return (
            <div
              key={region.code}
              className="group cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
              onClick={() => onRegionClick && onRegionClick(region.code)}
            >
              <div className="flex items-center gap-3 mb-2">
                {/* Rank */}
                <div className="w-8 text-center">
                  {medal ? (
                    <span className="text-xl">{medal}</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-400">{rank}</span>
                  )}
                </div>

                {/* Region info */}
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-2xl">{region.flag}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{region.name}</div>
                    <div className="text-xs text-gray-500">
                      {region.campaigns} campaigns · {region.totalSent.toLocaleString()} sent
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-bold ${isAboveTarget ? 'text-green-600' : 'text-gray-900'}`}>
                      {region.openRate.toFixed(1)}%
                    </span>
                    {isAboveTarget ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : region.openRate >= target * 0.8 ? (
                      <TrendingUp className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    點擊率: {region.clickRate.toFixed(1)}%
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-3">
                <div className="w-8" /> {/* Spacer for rank */}
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                  {/* Target line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10"
                    style={{ left: `${(target / maxOpenRate) * 100}%` }}
                  />
                  {/* Progress */}
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isAboveTarget
                        ? 'bg-gradient-to-r from-green-400 to-green-500'
                        : region.openRate >= target * 0.8
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                        : 'bg-gradient-to-r from-red-400 to-red-500'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="w-20" /> {/* Spacer for metrics */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>達標 (≥{target}%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>接近 (≥{target * 0.8}%)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>需加強</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-gray-400" />
          <span>目標線</span>
        </div>
      </div>
    </div>
  );
}
