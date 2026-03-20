import React, { useState } from 'react';
import { TrendingUp, Mail, MousePointer, ArrowRight, AlertTriangle, UserMinus, FileText, Clock, LayoutGrid, Table2, ChevronRight } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

// Helper to get last campaign info
const getLastCampaignInfo = (data) => {
  if (!data || data.length === 0) return null;

  // Sort by send_time descending and get the most recent
  const sorted = [...data].sort((a, b) => new Date(b.send_time) - new Date(a.send_time));
  const lastCampaign = sorted[0];
  const lastDate = new Date(lastCampaign.send_time);
  const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  return {
    date: lastDate,
    daysSince,
    isInactive: daysSince > 30,
    formatted: daysSince <= 7
      ? formatDistanceToNow(lastDate, { addSuffix: true })
      : format(lastDate, 'MMM d')
  };
};

// Helper to compute region metrics (shared between card and table views)
const computeRegionMetrics = (data, regionActivity) => {
  const lastCampaign = getLastCampaignInfo(data);
  const hasData = data && data.length > 0;

  const totalSent = hasData ? data.reduce((acc, curr) => acc + (curr.emails_sent || 0), 0) : 0;
  const avgOpenRate = hasData ? data.reduce((acc, curr) => acc + (curr.open_rate || 0), 0) / data.length : 0;
  const avgClickRate = hasData ? data.reduce((acc, curr) => acc + (curr.click_rate || 0), 0) / data.length : 0;
  const totalBounces = hasData ? data.reduce((acc, curr) => acc + (curr.bounces || 0), 0) : 0;
  const bounceRate = totalSent > 0 ? (totalBounces / totalSent) * 100 : 0;
  const totalUnsubscribes = hasData ? data.reduce((acc, curr) => acc + (curr.unsubscribed || 0), 0) : 0;
  const campaignCount = hasData ? data.length : 0;

  // Last campaign display
  const hasActivityInfo = regionActivity && regionActivity.last_campaign_date;
  const daysSince = hasActivityInfo ? regionActivity.days_since : lastCampaign?.daysSince;
  const isInactive = daysSince > 30;
  const displayDate = hasActivityInfo
    ? (daysSince <= 7
        ? formatDistanceToNow(new Date(regionActivity.last_campaign_date), { addSuffix: true })
        : format(new Date(regionActivity.last_campaign_date), 'MMM d'))
    : lastCampaign?.formatted;

  return {
    hasData,
    totalSent,
    avgOpenRate,
    avgClickRate,
    bounceRate,
    totalUnsubscribes,
    campaignCount,
    daysSince,
    isInactive,
    displayDate,
    hasActivityInfo,
    lastCampaign
  };
};

const RegionCard = ({ region, data, regionActivity, onClick }) => {
  const lastCampaign = getLastCampaignInfo(data);

  // When no data in current date range, but we have activity info
  if (!data || data.length === 0) {
    const hasActivityInfo = regionActivity && regionActivity.last_campaign_date;
    const daysSince = regionActivity?.days_since;
    const isInactive = daysSince > 30;

    return (
      <div
        className={`bg-white p-6 rounded-xl shadow-md border ring-1 transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-1 ${
          hasActivityInfo && isInactive
            ? 'border-amber-200 ring-amber-200/50 bg-amber-50/30'
            : 'border-gray-100/80 ring-gray-900/5'
        }`}
        onClick={onClick}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{region.flag}</span>
            <div>
              <h3 className="font-bold text-gray-900">{region.name}</h3>
              <p className="text-xs text-gray-500">{region.code}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </div>

        {hasActivityInfo ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-600 bg-amber-100/50 rounded-lg px-3 py-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">
                No campaigns in selected date range
              </span>
            </div>

            <div className={`flex items-center justify-between pt-2 ${isInactive ? 'text-red-600' : 'text-gray-500'}`}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Last Campaign</span>
              </div>
              <span className={`text-xs font-medium ${isInactive ? 'text-red-600' : 'text-gray-600'}`}>
                {daysSince} days ago
                {isInactive && ' ⚠️'}
              </span>
            </div>

            <p className="text-xs text-gray-400 pt-1">
              Last activity: {format(new Date(regionActivity.last_campaign_date), 'MMM d, yyyy')}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No data available</p>
        )}
      </div>
    );
  }

  // Calculate metrics
  const totalSent = data.reduce((acc, curr) => acc + (curr.emails_sent || 0), 0);
  const avgOpenRate = data.length ? (
    data.reduce((acc, curr) => acc + (curr.open_rate || 0), 0) / data.length
  ) : 0;
  const avgClickRate = data.length ? (
    data.reduce((acc, curr) => acc + (curr.click_rate || 0), 0) / data.length
  ) : 0;

  // Calculate bounce rate (bounces / emails_sent)
  const totalBounces = data.reduce((acc, curr) => acc + (curr.bounces || 0), 0);
  const bounceRate = totalSent > 0 ? (totalBounces / totalSent) * 100 : 0;

  // Calculate total unsubscribes
  const totalUnsubscribes = data.reduce((acc, curr) => acc + (curr.unsubscribed || 0), 0);

  return (
    <div
      className="bg-white p-6 rounded-xl shadow-md border border-gray-100/80 ring-1 ring-gray-900/5 hover:shadow-xl hover:-translate-y-1 hover:ring-yellow-400/30 transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{region.flag}</span>
          <div>
            <h3 className="font-bold text-gray-900">{region.name}</h3>
            <p className="text-xs text-gray-500">{region.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
            <FileText className="w-3 h-3" />
            {data.length}
          </span>
          <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#FFE01B] transition-colors" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="w-4 h-4" />
            <span className="text-xs">Total Sent</span>
          </div>
          <span className="font-bold text-gray-900">{totalSent.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Open Rate</span>
          </div>
          <span className="font-bold text-gray-900">{(avgOpenRate * 100).toFixed(1)}%</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <MousePointer className="w-4 h-4" />
            <span className="text-xs">Click Rate</span>
          </div>
          <span className="font-bold text-gray-900">{(avgClickRate * 100).toFixed(1)}%</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">Bounce Rate</span>
          </div>
          <span className={`font-bold ${bounceRate > 5 ? 'text-red-600' : 'text-gray-900'}`}>
            {bounceRate.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-600">
            <UserMinus className="w-4 h-4" />
            <span className="text-xs">Unsubscribes</span>
          </div>
          <span className={`font-bold ${totalUnsubscribes > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            {totalUnsubscribes.toLocaleString()}
          </span>
        </div>

        {/* Last Campaign - use regionActivity for accurate date (not affected by date filter) */}
        {(() => {
          // Prefer regionActivity over filtered data for Last Campaign
          const hasActivityInfo = regionActivity && regionActivity.last_campaign_date;
          const daysSince = hasActivityInfo ? regionActivity.days_since : lastCampaign?.daysSince;
          const isInactive = daysSince > 30;
          const displayDate = hasActivityInfo
            ? (daysSince <= 7
                ? formatDistanceToNow(new Date(regionActivity.last_campaign_date), { addSuffix: true })
                : format(new Date(regionActivity.last_campaign_date), 'MMM d'))
            : lastCampaign?.formatted;

          if (!hasActivityInfo && !lastCampaign) return null;

          return (
            <div className={`flex items-center justify-between pt-3 mt-3 border-t border-gray-100 ${isInactive ? 'text-red-600' : 'text-gray-500'}`}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Last Campaign</span>
              </div>
              <span className={`text-xs font-medium ${isInactive ? 'text-red-600' : 'text-gray-600'}`}>
                {displayDate}
                {isInactive && ' ⚠️'}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// Table view for cross-region comparison
const RegionTable = ({ regions, regionsData, regionsActivity, onRegionClick }) => {
  // Pre-compute metrics for all regions
  const regionMetrics = regions.map(region => ({
    region,
    metrics: computeRegionMetrics(
      regionsData[region.code] || [],
      regionsActivity[region.code]
    )
  }));

  // Find best values for highlighting
  const withData = regionMetrics.filter(r => r.metrics.hasData);
  const bestOpen = withData.length > 0 ? Math.max(...withData.map(r => r.metrics.avgOpenRate)) : 0;
  const bestClick = withData.length > 0 ? Math.max(...withData.map(r => r.metrics.avgClickRate)) : 0;
  const bestBounce = withData.length > 0 ? Math.min(...withData.map(r => r.metrics.bounceRate)) : 0;

  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100/80 ring-1 ring-gray-900/5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Region</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaigns</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sent</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Open Rate</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Click Rate</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bounce Rate</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unsubs</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Campaign</th>
              <th className="w-10 px-3 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {regionMetrics.map(({ region, metrics }) => {
              const isBestOpen = metrics.hasData && metrics.avgOpenRate === bestOpen && withData.length > 1;
              const isBestClick = metrics.hasData && metrics.avgClickRate === bestClick && withData.length > 1;
              const isBestBounce = metrics.hasData && metrics.bounceRate === bestBounce && withData.length > 1;

              return (
                <tr
                  key={region.code}
                  className="hover:bg-amber-50/40 cursor-pointer transition-colors group"
                  onClick={() => onRegionClick(region.code)}
                >
                  {/* Region */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{region.flag}</span>
                      <div>
                        <span className="font-semibold text-sm text-gray-900">{region.name}</span>
                        <span className="text-xs text-gray-400 ml-1.5">{region.code}</span>
                      </div>
                    </div>
                  </td>

                  {/* Campaigns */}
                  <td className="px-4 py-3.5 text-right">
                    {metrics.hasData ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        {metrics.campaignCount}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Total Sent */}
                  <td className="px-4 py-3.5 text-right">
                    {metrics.hasData ? (
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">{metrics.totalSent.toLocaleString()}</span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Open Rate */}
                  <td className="px-4 py-3.5 text-right">
                    {metrics.hasData ? (
                      <span className={`text-sm font-semibold tabular-nums ${isBestOpen ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {(metrics.avgOpenRate * 100).toFixed(1)}%
                        {isBestOpen && <span className="ml-1 text-[10px]">★</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Click Rate */}
                  <td className="px-4 py-3.5 text-right">
                    {metrics.hasData ? (
                      <span className={`text-sm font-semibold tabular-nums ${isBestClick ? 'text-emerald-600' : 'text-gray-900'}`}>
                        {(metrics.avgClickRate * 100).toFixed(1)}%
                        {isBestClick && <span className="ml-1 text-[10px]">★</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Bounce Rate */}
                  <td className="px-4 py-3.5 text-right">
                    {metrics.hasData ? (
                      <span className={`text-sm font-semibold tabular-nums ${
                        metrics.bounceRate > 5 ? 'text-red-600' : isBestBounce ? 'text-emerald-600' : 'text-gray-900'
                      }`}>
                        {metrics.bounceRate.toFixed(1)}%
                        {isBestBounce && metrics.bounceRate <= 5 && <span className="ml-1 text-[10px]">★</span>}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Unsubscribes */}
                  <td className="px-4 py-3.5 text-right">
                    {metrics.hasData ? (
                      <span className={`text-sm font-semibold tabular-nums ${metrics.totalUnsubscribes > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                        {metrics.totalUnsubscribes.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Last Campaign */}
                  <td className="px-4 py-3.5 text-right">
                    {metrics.displayDate ? (
                      <span className={`text-xs font-medium ${metrics.isInactive ? 'text-red-600' : 'text-gray-600'}`}>
                        {metrics.displayDate}
                        {metrics.isInactive && ' ⚠️'}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>

                  {/* Arrow */}
                  <td className="px-3 py-3.5">
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#FFE01B] transition-colors" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend for star markers */}
      {withData.length > 1 && (
        <div className="px-4 py-2.5 bg-gray-50/50 border-t border-gray-100 flex items-center gap-1.5">
          <span className="text-emerald-600 text-[10px]">★</span>
          <span className="text-[11px] text-gray-400">Best performing in category</span>
        </div>
      )}
    </div>
  );
};

export default function RegionCards({ regionsData, regions, regionsActivity = {}, onRegionClick }) {
  const [viewMode, setViewMode] = useState('cards');

  // 防護檢查
  if (!regions || regions.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">Regional Performance</h2>
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1 border border-gray-200">
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'cards'
                ? 'bg-[#007C89] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              viewMode === 'table'
                ? 'bg-[#007C89] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Table2 className="w-3.5 h-3.5" />
            Table
          </button>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {regions.map((region) => (
            <RegionCard
              key={region.code}
              region={region}
              data={regionsData[region.code] || []}
              regionActivity={regionsActivity[region.code]}
              onClick={() => onRegionClick(region.code)}
            />
          ))}
        </div>
      ) : (
        <RegionTable
          regions={regions}
          regionsData={regionsData}
          regionsActivity={regionsActivity}
          onRegionClick={onRegionClick}
        />
      )}
    </div>
  );
}
