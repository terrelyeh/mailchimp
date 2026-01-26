import React, { useMemo } from 'react';
import { Trophy, TrendingUp, MousePointer, Mail, Users } from 'lucide-react';

/**
 * Top N Campaigns 表格
 * 顯示表現最好的 campaigns（依綜合評分排序）
 */
export default function TopCampaignsTable({ data, topN = 5 }) {
  // 計算綜合評分並排序
  const topCampaigns = useMemo(() => {
    // 確保 data 是陣列且不為空
    if (!data || !Array.isArray(data) || data.length === 0) return [];

    // 計算每個 campaign 的綜合評分
    // 公式：Open Rate * 60% + Click Rate * 40%
    const scoredCampaigns = data.map(campaign => {
      const openRate = (campaign.open_rate || 0) * 100;
      const clickRate = (campaign.click_rate || 0) * 100;
      const score = openRate * 0.6 + clickRate * 0.4;

      return {
        ...campaign,
        openRate,
        clickRate,
        score
      };
    });

    // 排序並取前 N 個
    return scoredCampaigns
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }, [data, topN]);

  // 獲取排名圖示
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <span className="text-2xl">🥇</span>;
      case 2:
        return <span className="text-2xl">🥈</span>;
      case 3:
        return <span className="text-2xl">🥉</span>;
      default:
        return <span className="text-sm font-bold text-gray-500">{rank}</span>;
    }
  };

  // 如果沒有資料
  if (topCampaigns.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-bold text-gray-900">Top {topN} Campaigns</h2>
        </div>
        <div className="text-center py-8 text-gray-400">
          No campaign data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h2 className="text-lg font-bold text-gray-900">Top {topN} Campaigns</h2>
        <span className="text-xs text-gray-500 ml-auto">Sorted by Engagement Score</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Rank
              </th>
              <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Campaign Name
              </th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="flex items-center justify-end gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Open Rate</span>
                </div>
              </th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="flex items-center justify-end gap-1">
                  <MousePointer className="w-3 h-3" />
                  <span>Click Rate</span>
                </div>
              </th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="flex items-center justify-end gap-1">
                  <Mail className="w-3 h-3" />
                  <span>Sent</span>
                </div>
              </th>
              <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {topCampaigns.map((campaign, index) => {
              const rank = index + 1;
              const isTopThree = rank <= 3;

              return (
                <tr
                  key={campaign.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    isTopThree ? 'bg-yellow-50/30' : ''
                  }`}
                >
                  {/* Rank */}
                  <td className="py-3 px-2 text-center">
                    {getRankIcon(rank)}
                  </td>

                  {/* Campaign Name */}
                  <td className="py-3 px-2">
                    <div className="max-w-xs">
                      <p className="font-semibold text-gray-900 text-sm truncate">
                        {(campaign.title && campaign.title.trim()) ? campaign.title : campaign.subject_line}
                      </p>
                      {campaign.subject_line && campaign.title && campaign.title.trim() && campaign.subject_line !== campaign.title && (
                        <p className="text-xs text-gray-500 truncate">
                          {campaign.subject_line}
                        </p>
                      )}
                      {campaign.segment_text && !campaign.segment_text.startsWith('<') && (
                        <div className="flex items-center gap-1 text-xs text-purple-600 mt-0.5">
                          <Users className="w-3 h-3" />
                          <span className="truncate" title={campaign.segment_text}>
                            {campaign.segment_text}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Open Rate */}
                  <td className="py-3 px-2 text-right">
                    <span className="font-bold text-green-600">
                      {campaign.openRate.toFixed(1)}%
                    </span>
                  </td>

                  {/* Click Rate */}
                  <td className="py-3 px-2 text-right">
                    <span className="font-bold text-blue-600">
                      {campaign.clickRate.toFixed(1)}%
                    </span>
                  </td>

                  {/* Sent */}
                  <td className="py-3 px-2 text-right">
                    <span className="text-gray-700 text-sm">
                      {campaign.emails_sent?.toLocaleString() || 0}
                    </span>
                  </td>

                  {/* Score */}
                  <td className="py-3 px-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(campaign.score, 100)}%` }}
                        />
                      </div>
                      <span className="font-bold text-gray-900 text-sm w-12 text-right">
                        {campaign.score.toFixed(1)}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          💡 Engagement Score = Open Rate × 60% + Click Rate × 40%
        </p>
      </div>
    </div>
  );
}
