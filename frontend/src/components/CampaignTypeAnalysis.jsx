import React, { useMemo } from 'react';
import { PieChart, BarChart3, Tag } from 'lucide-react';

/**
 * Level 2: Campaign Type Analysis - Campaign 類型分析
 * 分析不同類型 Campaign 的表現
 */
export default function CampaignTypeAnalysis({ data, isMultiRegion = false }) {
  const analysisData = useMemo(() => {
    // Flatten data
    let campaigns = [];
    if (isMultiRegion && typeof data === 'object' && !Array.isArray(data)) {
      campaigns = Object.values(data).flat().filter(Boolean);
    } else if (Array.isArray(data)) {
      campaigns = data;
    }

    if (campaigns.length === 0) return null;

    // Categorize campaigns based on title/subject keywords
    const categories = {
      '促銷活動': { keywords: ['sale', 'discount', 'offer', 'promo', '折扣', '優惠', '特價', 'black friday', 'flash'], icon: '🏷️' },
      '產品發布': { keywords: ['launch', 'new', 'announce', 'introducing', '新品', '發布', 'release'], icon: '🚀' },
      '電子報': { keywords: ['newsletter', 'weekly', 'monthly', 'digest', '電子報', '週報', '月報'], icon: '📰' },
      '活動邀請': { keywords: ['event', 'webinar', 'invite', 'join us', 'register', '活動', '邀請', '報名'], icon: '📅' },
      '會員關懷': { keywords: ['thank', 'welcome', 'birthday', 'anniversary', '感謝', '歡迎', '生日'], icon: '💝' },
      '其他': { keywords: [], icon: '📧' }
    };

    const categoryStats = {};

    // Initialize categories
    Object.keys(categories).forEach(cat => {
      categoryStats[cat] = {
        name: cat,
        icon: categories[cat].icon,
        campaigns: [],
        count: 0,
        totalSent: 0,
        totalOpens: 0,
        totalClicks: 0,
        openRate: 0,
        clickRate: 0
      };
    });

    // Categorize each campaign
    campaigns.forEach(campaign => {
      const text = `${campaign.title || ''} ${campaign.subject_line || ''}`.toLowerCase();

      let matched = false;
      for (const [catName, catConfig] of Object.entries(categories)) {
        if (catName === '其他') continue;

        const isMatch = catConfig.keywords.some(keyword => text.includes(keyword.toLowerCase()));
        if (isMatch) {
          categoryStats[catName].campaigns.push(campaign);
          matched = true;
          break;
        }
      }

      if (!matched) {
        categoryStats['其他'].campaigns.push(campaign);
      }
    });

    // Calculate stats for each category
    Object.values(categoryStats).forEach(cat => {
      cat.count = cat.campaigns.length;
      cat.totalSent = cat.campaigns.reduce((acc, c) => acc + (c.emails_sent || 0), 0);
      cat.totalOpens = cat.campaigns.reduce((acc, c) => acc + (c.opens || 0), 0);
      cat.totalClicks = cat.campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
      cat.openRate = cat.totalSent > 0 ? (cat.totalOpens / cat.totalSent) * 100 : 0;
      cat.clickRate = cat.totalSent > 0 ? (cat.totalClicks / cat.totalSent) * 100 : 0;
    });

    // Sort by count (descending)
    const sortedCategories = Object.values(categoryStats)
      .filter(cat => cat.count > 0)
      .sort((a, b) => b.count - a.count);

    // Find best performing category
    const bestPerforming = [...sortedCategories]
      .filter(cat => cat.count >= 2) // At least 2 campaigns for meaningful data
      .sort((a, b) => b.openRate - a.openRate)[0];

    return {
      categories: sortedCategories,
      total: campaigns.length,
      bestPerforming
    };
  }, [data, isMultiRegion]);

  if (!analysisData || analysisData.categories.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Campaign 類型分析</h2>
        <div className="text-center text-gray-400 py-8">No data available</div>
      </div>
    );
  }

  const maxCount = Math.max(...analysisData.categories.map(c => c.count));

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900">Campaign 類型分析</h2>
        </div>
        <div className="text-xs text-gray-500">
          共 {analysisData.total} 個 Campaigns
        </div>
      </div>

      {/* Best Performing Category */}
      {analysisData.bestPerforming && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xl">{analysisData.bestPerforming.icon}</span>
            <div>
              <div className="text-sm font-medium text-green-800">
                最佳表現類型：{analysisData.bestPerforming.name}
              </div>
              <div className="text-xs text-green-600">
                開信率 {analysisData.bestPerforming.openRate.toFixed(1)}% · 點擊率 {analysisData.bestPerforming.clickRate.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                類型
              </th>
              <th className="text-center py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                數量
              </th>
              <th className="text-right py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                發送數
              </th>
              <th className="text-right py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                開信率
              </th>
              <th className="text-right py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                點擊率
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {analysisData.categories.map((cat, index) => {
              const barWidth = (cat.count / maxCount) * 100;
              const isTop = index === 0;

              return (
                <tr key={cat.name} className={isTop ? 'bg-yellow-50/30' : ''}>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <span className="font-medium text-gray-900">{cat.name}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold text-gray-700 w-8 text-right">
                        {cat.count}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 text-right text-sm text-gray-700">
                    {cat.totalSent.toLocaleString()}
                  </td>
                  <td className="py-3 text-right">
                    <span className={`font-bold ${cat.openRate >= 25 ? 'text-green-600' : cat.openRate >= 20 ? 'text-yellow-600' : 'text-gray-700'}`}>
                      {cat.openRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className={`font-bold ${cat.clickRate >= 3.5 ? 'text-green-600' : cat.clickRate >= 2.5 ? 'text-yellow-600' : 'text-gray-700'}`}>
                      {cat.clickRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Insight */}
      <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        💡 建議：增加「{analysisData.bestPerforming?.name || '產品發布'}」類型的 Campaign，歷史表現較佳
      </div>
    </div>
  );
}
