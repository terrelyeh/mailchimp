import React, { useMemo } from 'react';
import {
  TrendingUp, Award, AlertTriangle,
  Target, Crown, ThumbsDown, BarChart3, Info
} from 'lucide-react';
import { getRegionInfo } from '../mockData';

// Minimum thresholds for statistical significance
const MIN_SENT_THRESHOLD = 100;
const MIN_CAMPAIGNS_THRESHOLD = 3;

/**
 * ExecutiveSummary - Management-level insights
 * Works for both Overview (all regions) and Region Detail views
 */
export default function ExecutiveSummary({
  data,
  isOverview = true,
  regions = [],
  currentRegion = null,
  selectedAudience = null,
  audienceList = []
}) {
  // Calculate metrics for all views
  const metrics = useMemo(() => {
    if (!data) return null;

    if (isOverview) {
      // Overview mode - compare regions
      return calculateOverviewMetrics(data, regions);
    } else {
      // Region detail mode - analyze single region
      return calculateRegionMetrics(data, currentRegion);
    }
  }, [data, isOverview, regions, currentRegion]);

  if (!metrics) {
    return null;
  }

  // Get audience name for display
  const audienceName = selectedAudience
    ? audienceList.find(a => a.id === selectedAudience)?.name || 'Selected Audience'
    : 'All Audiences';

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-4 md:p-6 mb-6 text-white">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-yellow-400" />
        <h2 className="font-bold text-base md:text-lg">Executive Summary</h2>
        <span className="text-xs text-slate-400 ml-auto">
          {isOverview ? 'Multi-Region Overview' : `${currentRegion?.name || 'Region'} Analysis`}
        </span>
      </div>

      {isOverview ? (
        <OverviewContent metrics={metrics} />
      ) : (
        <RegionContent metrics={metrics} currentRegion={currentRegion} audienceName={audienceName} />
      )}
    </div>
  );
}

// Calculate metrics for overview (all regions)
function calculateOverviewMetrics(data, regions) {
  const regionStats = [];

  // Calculate stats for each region
  Object.entries(data).forEach(([regionCode, campaigns]) => {
    if (!Array.isArray(campaigns) || campaigns.length === 0) return;

    const totalSent = campaigns.reduce((acc, c) => acc + (c.emails_sent || 0), 0);
    const totalOpens = campaigns.reduce((acc, c) => acc + (c.opens || 0), 0);
    const totalClicks = campaigns.reduce((acc, c) => acc + (c.clicks || 0), 0);
    const totalBounces = campaigns.reduce((acc, c) => acc + (c.bounces || 0), 0);
    const totalUnsubs = campaigns.reduce((acc, c) => acc + (c.unsubscribed || 0), 0);

    const avgOpenRate = campaigns.reduce((acc, c) => acc + (c.open_rate || 0), 0) / campaigns.length;
    const avgClickRate = campaigns.reduce((acc, c) => acc + (c.click_rate || 0), 0) / campaigns.length;
    const deliveryRate = totalSent > 0 ? (totalSent - totalBounces) / totalSent : 0;

    // Find best campaign in this region
    const bestCampaign = campaigns.reduce((best, curr) =>
      (curr.open_rate || 0) > (best.open_rate || 0) ? curr : best
    , campaigns[0]);

    regionStats.push({
      code: regionCode,
      info: getRegionInfo(regionCode),
      campaigns: campaigns.length,
      totalSent,
      avgOpenRate,
      avgClickRate,
      deliveryRate,
      bounceRate: totalSent > 0 ? totalBounces / totalSent : 0,
      unsubRate: totalSent > 0 ? totalUnsubs / totalSent : 0,
      bestCampaign,
      // Composite score for ranking (weighted)
      score: avgOpenRate * 0.4 + avgClickRate * 0.3 + deliveryRate * 0.3
    });
  });

  if (regionStats.length === 0) return null;

  // Sort by score
  regionStats.sort((a, b) => b.score - a.score);

  // Find best and worst
  const bestRegion = regionStats[0];
  const worstRegion = regionStats[regionStats.length - 1];

  // Find top campaign across all regions
  let topCampaign = null;
  let topCampaignRegion = null;
  Object.entries(data).forEach(([regionCode, campaigns]) => {
    if (!Array.isArray(campaigns)) return;
    campaigns.forEach(c => {
      if (!topCampaign || (c.open_rate || 0) > (topCampaign.open_rate || 0)) {
        topCampaign = c;
        topCampaignRegion = regionCode;
      }
    });
  });

  // Calculate overall averages
  const allCampaigns = Object.values(data).flat().filter(Boolean);
  const overallAvgOpenRate = allCampaigns.length > 0
    ? allCampaigns.reduce((acc, c) => acc + (c.open_rate || 0), 0) / allCampaigns.length
    : 0;
  const overallAvgClickRate = allCampaigns.length > 0
    ? allCampaigns.reduce((acc, c) => acc + (c.click_rate || 0), 0) / allCampaigns.length
    : 0;

  // Identify alerts
  const alerts = [];
  regionStats.forEach(r => {
    if (r.bounceRate > 0.05) {
      alerts.push({ region: r.info.name, type: 'bounce', value: r.bounceRate });
    }
    if (r.unsubRate > 0.01) {
      alerts.push({ region: r.info.name, type: 'unsub', value: r.unsubRate });
    }
  });

  return {
    bestRegion,
    worstRegion,
    topCampaign,
    topCampaignRegion: getRegionInfo(topCampaignRegion),
    regionStats,
    overallAvgOpenRate,
    overallAvgClickRate,
    alerts,
    totalCampaigns: allCampaigns.length,
    totalSent: allCampaigns.reduce((acc, c) => acc + (c.emails_sent || 0), 0)
  };
}

// Calculate metrics for single region detail
function calculateRegionMetrics(data, currentRegion) {
  if (!Array.isArray(data) || data.length === 0) return null;

  const campaigns = data;
  const totalSent = campaigns.reduce((acc, c) => acc + (c.emails_sent || 0), 0);
  const totalBounces = campaigns.reduce((acc, c) => acc + (c.bounces || 0), 0);
  const totalUnsubs = campaigns.reduce((acc, c) => acc + (c.unsubscribed || 0), 0);

  const avgOpenRate = campaigns.reduce((acc, c) => acc + (c.open_rate || 0), 0) / campaigns.length;
  const avgClickRate = campaigns.reduce((acc, c) => acc + (c.click_rate || 0), 0) / campaigns.length;
  const deliveryRate = totalSent > 0 ? (totalSent - totalBounces) / totalSent : 0;
  const bounceRate = totalSent > 0 ? totalBounces / totalSent : 0;
  const unsubRate = totalSent > 0 ? totalUnsubs / totalSent : 0;

  // Sort campaigns by open rate
  const sortedByOpenRate = [...campaigns].sort((a, b) => (b.open_rate || 0) - (a.open_rate || 0));
  const topCampaign = sortedByOpenRate[0];
  const bottomCampaign = sortedByOpenRate[sortedByOpenRate.length - 1];

  // Identify issues (based on absolute thresholds, not industry benchmarks)
  const issues = [];
  if (bounceRate > 0.05) {
    issues.push({ type: 'bounce', message: `High bounce rate (${(bounceRate * 100).toFixed(1)}%)` });
  }
  if (unsubRate > 0.01) {
    issues.push({ type: 'unsub', message: `Elevated unsubscribe rate (${(unsubRate * 100).toFixed(1)}%)` });
  }

  return {
    avgOpenRate,
    avgClickRate,
    deliveryRate,
    bounceRate,
    unsubRate,
    topCampaign,
    bottomCampaign,
    issues,
    campaignCount: campaigns.length,
    totalSent
  };
}

// Helper to check if region has sufficient data
function hasInsufficientData(region) {
  return region.totalSent < MIN_SENT_THRESHOLD || region.campaigns < MIN_CAMPAIGNS_THRESHOLD;
}

// Insufficient data card component
function InsufficientDataCard({ title, icon: Icon, iconColor }) {
  return (
    <div className="bg-white/10 rounded-lg p-4 opacity-60">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-xs text-slate-300 uppercase tracking-wide">{title}</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-5 h-5 text-slate-400" />
        <span className="font-semibold text-slate-400">Insufficient Data</span>
      </div>
      <div className="text-xs text-slate-500 mt-2">
        Requires ≥{MIN_SENT_THRESHOLD} sent or ≥{MIN_CAMPAIGNS_THRESHOLD} campaigns
      </div>
    </div>
  );
}

// Overview content component
function OverviewContent({ metrics }) {
  // Check if best/worst regions have sufficient data
  const bestHasData = metrics.bestRegion && !hasInsufficientData(metrics.bestRegion);
  const worstHasData = metrics.worstRegion && !hasInsufficientData(metrics.worstRegion);

  return (
    <div className="space-y-4">
      {/* Overall Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 pb-3 border-b border-slate-600">
        <div>
          <span className="text-slate-400">Total Campaigns:</span>{' '}
          <span className="font-semibold text-white">{metrics.totalCampaigns}</span>
        </div>
        <div>
          <span className="text-slate-400">Total Sent:</span>{' '}
          <span className="font-semibold text-white">{metrics.totalSent.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-slate-400">Regions:</span>{' '}
          <span className="font-semibold text-white">{metrics.regionStats.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Best Performing Region */}
        {bestHasData ? (
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-slate-300 uppercase tracking-wide">Top Region</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{metrics.bestRegion.info.flag}</span>
              <span className="font-bold text-lg">{metrics.bestRegion.info.name}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
              <div>
                <span className="text-slate-400">Open Rate</span>
                <div className="font-semibold text-green-400">
                  {(metrics.bestRegion.avgOpenRate * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-slate-400">Click Rate</span>
                <div className="font-semibold text-green-400">
                  {(metrics.bestRegion.avgClickRate * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-400 pt-2 border-t border-slate-600">
              {metrics.bestRegion.campaigns} campaigns · {metrics.bestRegion.totalSent.toLocaleString()} sent
            </div>
          </div>
        ) : (
          <InsufficientDataCard title="Top Region" icon={Crown} iconColor="text-yellow-400" />
        )}

        {/* Needs Attention Region */}
        {metrics.regionStats.length > 1 && (
          worstHasData ? (
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-slate-300 uppercase tracking-wide">Needs Attention</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{metrics.worstRegion.info.flag}</span>
                <span className="font-bold text-lg">{metrics.worstRegion.info.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                <div>
                  <span className="text-slate-400">Open Rate</span>
                  <div className="font-semibold text-orange-400">
                    {(metrics.worstRegion.avgOpenRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Click Rate</span>
                  <div className="font-semibold text-orange-400">
                    {(metrics.worstRegion.avgClickRate * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-400 pt-2 border-t border-slate-600">
                {metrics.worstRegion.campaigns} campaigns · {metrics.worstRegion.totalSent.toLocaleString()} sent
              </div>
            </div>
          ) : (
            <InsufficientDataCard title="Needs Attention" icon={Target} iconColor="text-orange-400" />
          )
        )}

        {/* Top Campaign */}
        {metrics.topCampaign && (metrics.topCampaign.emails_sent || 0) >= MIN_SENT_THRESHOLD ? (
          <div className="bg-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-300 uppercase tracking-wide">Best Campaign</span>
            </div>
            <div className="mb-2">
              <div className="font-semibold text-sm line-clamp-2">
                {metrics.topCampaign.title}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {metrics.topCampaignRegion?.flag} {metrics.topCampaignRegion?.name}
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm mb-2">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span className="font-semibold text-green-400">
                  {((metrics.topCampaign.open_rate || 0) * 100).toFixed(1)}%
                </span>
                <span className="text-slate-400 text-xs">open</span>
              </div>
            </div>
            <div className="text-xs text-slate-400 pt-2 border-t border-slate-600">
              {(metrics.topCampaign.emails_sent || 0).toLocaleString()} emails sent
            </div>
          </div>
        ) : (
          <InsufficientDataCard title="Best Campaign" icon={Award} iconColor="text-blue-400" />
        )}
      </div>

      {/* Alerts Section - Full Width */}
      {metrics.alerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-red-300">Alerts</span>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {metrics.alerts.slice(0, 3).map((alert, i) => (
              <span key={i} className="text-red-200">
                {alert.region}: {alert.type === 'bounce' ? 'High bounce' : 'High unsub'} ({(alert.value * 100).toFixed(1)}%)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Region detail content component
function RegionContent({ metrics, currentRegion, audienceName }) {
  // Check if region has sufficient data
  const regionHasData = metrics.totalSent >= MIN_SENT_THRESHOLD || metrics.campaignCount >= MIN_CAMPAIGNS_THRESHOLD;
  const topCampaignHasData = metrics.topCampaign && (metrics.topCampaign.emails_sent || 0) >= MIN_SENT_THRESHOLD;
  const bottomCampaignHasData = metrics.bottomCampaign && (metrics.bottomCampaign.emails_sent || 0) >= MIN_SENT_THRESHOLD;

  return (
    <div className="space-y-4">
      {/* Sample Size Bar */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 pb-3 border-b border-slate-600">
        <div>
          <span className="text-slate-400">Campaigns Analyzed:</span>{' '}
          <span className="font-semibold text-white">{metrics.campaignCount}</span>
        </div>
        <div>
          <span className="text-slate-400">Total Emails Sent:</span>{' '}
          <span className="font-semibold text-white">{metrics.totalSent.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-slate-400">Audience:</span>{' '}
          <span className="font-semibold text-white">{audienceName}</span>
        </div>
      </div>

      {/* Insufficient Data Warning */}
      {!regionHasData && (
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-3 flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-400">
            Limited data available. Requires ≥{MIN_SENT_THRESHOLD} sent or ≥{MIN_CAMPAIGNS_THRESHOLD} campaigns for reliable insights.
          </span>
        </div>
      )}

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <SimpleMetricCard
          label="Open Rate"
          value={`${(metrics.avgOpenRate * 100).toFixed(1)}%`}
          dimmed={!regionHasData}
        />
        <SimpleMetricCard
          label="Click Rate"
          value={`${(metrics.avgClickRate * 100).toFixed(1)}%`}
          dimmed={!regionHasData}
        />
        <SimpleMetricCard
          label="Delivery Rate"
          value={`${(metrics.deliveryRate * 100).toFixed(1)}%`}
          dimmed={!regionHasData}
        />
        <SimpleMetricCard
          label="Avg per Campaign"
          value={metrics.campaignCount > 0
            ? Math.round(metrics.totalSent / metrics.campaignCount).toLocaleString()
            : '0'}
          subLabel="emails"
          dimmed={!regionHasData}
        />
      </div>

      {/* Top & Bottom Campaigns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best Campaign */}
        {topCampaignHasData ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-300 uppercase tracking-wide">Top Performer</span>
            </div>
            <div className="font-semibold text-sm line-clamp-1 mb-2">
              {metrics.topCampaign.title}
            </div>
            <div className="flex gap-4 text-sm">
              <div>
                <span className="text-slate-400 text-xs">Open</span>
                <div className="font-semibold text-green-400">
                  {((metrics.topCampaign.open_rate || 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-xs">Click</span>
                <div className="font-semibold text-green-400">
                  {((metrics.topCampaign.click_rate || 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-xs">Sent</span>
                <div className="font-semibold">
                  {(metrics.topCampaign.emails_sent || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-4 opacity-60">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-green-400/50" />
              <span className="text-xs text-green-300/50 uppercase tracking-wide">Top Performer</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-500">Insufficient Data</span>
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Requires ≥{MIN_SENT_THRESHOLD} emails sent
            </div>
          </div>
        )}

        {/* Worst Campaign */}
        {metrics.campaignCount > 1 && (
          bottomCampaignHasData ? (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsDown className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-orange-300 uppercase tracking-wide">Needs Review</span>
              </div>
              <div className="font-semibold text-sm line-clamp-1 mb-2">
                {metrics.bottomCampaign.title}
              </div>
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-slate-400 text-xs">Open</span>
                  <div className="font-semibold text-orange-400">
                    {((metrics.bottomCampaign.open_rate || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Click</span>
                  <div className="font-semibold text-orange-400">
                    {((metrics.bottomCampaign.click_rate || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Sent</span>
                  <div className="font-semibold">
                    {(metrics.bottomCampaign.emails_sent || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-4 opacity-60">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsDown className="w-4 h-4 text-orange-400/50" />
                <span className="text-xs text-orange-300/50 uppercase tracking-wide">Needs Review</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-500">Insufficient Data</span>
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Requires ≥{MIN_SENT_THRESHOLD} emails sent
              </div>
            </div>
          )
        )}
      </div>

      {/* Issues Alert */}
      {metrics.issues.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-300 uppercase tracking-wide">Attention Required</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {metrics.issues.map((issue, i) => (
              <span key={i} className="text-sm text-red-200">
                {issue.message}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple metric card without benchmark comparison
function SimpleMetricCard({ label, value, subLabel, dimmed = false }) {
  return (
    <div className={`bg-white/10 rounded-lg p-3 ${dimmed ? 'opacity-50' : ''}`}>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${dimmed ? 'text-slate-400' : ''}`}>{value}</div>
      {subLabel && (
        <div className="text-xs text-slate-400">{subLabel}</div>
      )}
    </div>
  );
}
