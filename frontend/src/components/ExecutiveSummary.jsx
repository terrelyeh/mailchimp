import React, { useMemo } from 'react';
import {
  TrendingUp, Award, AlertTriangle, Send, Users,
  Target, Crown, ThumbsDown, BarChart3, Info, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { getRegionInfo } from '../mockData';
import { useThresholds } from '../contexts/ThresholdContext';

// Minimum thresholds for statistical significance
// Home Dashboard: Region-level comparison (higher threshold)
const MIN_SENT_THRESHOLD = 100;
const MIN_CAMPAIGNS_THRESHOLD = 3;
// Second Level: Individual campaign comparison (lower threshold)
const MIN_CAMPAIGN_SENT_THRESHOLD = 50;

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
  // Get thresholds from context
  const { getThresholdsForCalculation } = useThresholds();
  const alertThresholds = getThresholdsForCalculation();

  // Calculate metrics for all views
  const metrics = useMemo(() => {
    if (!data) return null;

    if (isOverview) {
      // Overview mode - compare regions
      return calculateOverviewMetrics(data, regions, alertThresholds);
    } else {
      // Region detail mode - analyze single region
      return calculateRegionMetrics(data, currentRegion, alertThresholds);
    }
  }, [data, isOverview, regions, currentRegion, alertThresholds]);

  if (!metrics) {
    return null;
  }

  // Get audience name for display
  const audienceName = selectedAudience
    ? audienceList.find(a => a.id === selectedAudience)?.name || 'Selected Audience'
    : 'All Audiences';

  return (
    <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 rounded-xl p-4 md:p-6 mb-6 text-white shadow-xl ring-1 ring-white/10">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-yellow-400" />
        <h2 className="section-title-light">Executive Summary</h2>
        <span className="text-xs text-slate-400 ml-auto">
          {isOverview ? 'Multi-Region Overview' : `${currentRegion?.name || 'Region'} Analysis`}
        </span>
      </div>

      {isOverview ? (
        <OverviewContent metrics={metrics} />
      ) : (
        <RegionContent metrics={metrics} currentRegion={currentRegion} audienceName={audienceName} reviewThresholds={alertThresholds} />
      )}
    </div>
  );
}

// Calculate metrics for overview (all regions)
function calculateOverviewMetrics(data, regions, alertThresholds) {
  const regionStats = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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

    // Count campaigns in last 30 days
    const recentCampaigns = campaigns.filter(c => new Date(c.send_time) >= thirtyDaysAgo);
    const campaignsLast30Days = recentCampaigns.length;

    // Find best campaign in this region
    const bestCampaign = campaigns.reduce((best, curr) =>
      (curr.open_rate || 0) > (best.open_rate || 0) ? curr : best
    , campaigns[0]);

    // Find last campaign date
    const sortedByDate = [...campaigns].sort((a, b) => new Date(b.send_time) - new Date(a.send_time));
    const lastCampaignDate = new Date(sortedByDate[0].send_time);
    const daysSinceLastCampaign = Math.floor((Date.now() - lastCampaignDate.getTime()) / (1000 * 60 * 60 * 24));

    regionStats.push({
      code: regionCode,
      info: getRegionInfo(regionCode),
      campaigns: campaigns.length,
      campaignsLast30Days,
      totalSent,
      avgOpenRate,
      avgClickRate,
      deliveryRate,
      bounceRate: totalSent > 0 ? totalBounces / totalSent : 0,
      unsubRate: totalSent > 0 ? totalUnsubs / totalSent : 0,
      bestCampaign,
      lastCampaignDate,
      daysSinceLastCampaign,
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
    // High bounce rate
    if (r.bounceRate > alertThresholds.bounceRate) {
      alerts.push({ region: r.info.name, type: 'bounce', value: r.bounceRate, severity: 'high' });
    }
    // High unsub rate
    if (r.unsubRate > alertThresholds.unsubRate) {
      alerts.push({ region: r.info.name, type: 'unsub', value: r.unsubRate, severity: 'high' });
    }
    // Low activity (< X campaigns in last 30 days)
    if (r.campaignsLast30Days < alertThresholds.lowActivityCampaigns) {
      alerts.push({ region: r.info.name, type: 'lowActivity', value: r.campaignsLast30Days, severity: 'medium' });
    }
    // Low engagement (open < X% OR click < X%)
    if (r.avgOpenRate < alertThresholds.lowOpenRate || r.avgClickRate < alertThresholds.lowClickRate) {
      const reason = r.avgOpenRate < alertThresholds.lowOpenRate ? 'open' : 'click';
      const value = reason === 'open' ? r.avgOpenRate : r.avgClickRate;
      alerts.push({ region: r.info.name, type: 'lowEngagement', reason, value, severity: 'medium' });
    }
  });

  // Sort alerts by severity (high first)
  alerts.sort((a, b) => {
    if (a.severity === 'high' && b.severity !== 'high') return -1;
    if (a.severity !== 'high' && b.severity === 'high') return 1;
    return 0;
  });

  // Find inactive regions (>30 days since last campaign)
  const inactiveRegions = regionStats
    .filter(r => r.daysSinceLastCampaign > 30)
    .sort((a, b) => b.daysSinceLastCampaign - a.daysSinceLastCampaign);

  return {
    bestRegion,
    worstRegion,
    topCampaign,
    topCampaignRegion: getRegionInfo(topCampaignRegion),
    regionStats,
    overallAvgOpenRate,
    overallAvgClickRate,
    alerts,
    inactiveRegions,
    totalCampaigns: allCampaigns.length,
    totalSent: allCampaigns.reduce((acc, c) => acc + (c.emails_sent || 0), 0)
  };
}

// Calculate metrics for single region detail
function calculateRegionMetrics(data, currentRegion, thresholds) {
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

  // Find top performer (highest open rate)
  const sortedByOpenRate = [...campaigns].sort((a, b) => (b.open_rate || 0) - (a.open_rate || 0));
  const topCampaign = sortedByOpenRate[0];

  // Find last campaign date
  const sortedByDate = [...campaigns].sort((a, b) => new Date(b.send_time) - new Date(a.send_time));
  const lastCampaignDate = new Date(sortedByDate[0].send_time);
  const daysSinceLastCampaign = Math.floor((Date.now() - lastCampaignDate.getTime()) / (1000 * 60 * 60 * 24));

  // Find "Needs Review" campaign using configurable thresholds
  const campaignsNeedingReview = campaigns.filter(c => {
    const deliveryRate = c.emails_sent > 0
      ? (c.emails_sent - (c.bounces || 0)) / c.emails_sent
      : 1;
    return (
      (c.open_rate || 0) < thresholds.reviewOpenRate ||
      (c.click_rate || 0) < thresholds.reviewClickRate ||
      deliveryRate < thresholds.reviewDeliveryRate
    );
  });

  // Pick the worst one (lowest composite score) from campaigns needing review
  const bottomCampaign = campaignsNeedingReview.length > 0
    ? campaignsNeedingReview.sort((a, b) => {
        const aDelivery = a.emails_sent > 0 ? (a.emails_sent - (a.bounces || 0)) / a.emails_sent : 1;
        const bDelivery = b.emails_sent > 0 ? (b.emails_sent - (b.bounces || 0)) / b.emails_sent : 1;
        const aScore = (a.open_rate || 0) * 0.4 + (a.click_rate || 0) * 0.3 + aDelivery * 0.3;
        const bScore = (b.open_rate || 0) * 0.4 + (b.click_rate || 0) * 0.3 + bDelivery * 0.3;
        return aScore - bScore; // ascending, worst first
      })[0]
    : null; // No campaign needs review - all performing well!

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
    totalSent,
    lastCampaignDate,
    daysSinceLastCampaign
  };
}

// Helper to check if region has sufficient data
function hasInsufficientData(region) {
  return region.totalSent < MIN_SENT_THRESHOLD || region.campaigns < MIN_CAMPAIGNS_THRESHOLD;
}

// Insufficient data card component
// type: 'region' for region-level (uses both thresholds), 'campaign' for single campaign (only sent threshold)
function InsufficientDataCard({ title, icon: Icon, iconColor, type = 'region' }) {
  return (
    <div className="bg-white/5 rounded-lg p-4 opacity-50 shadow-lg ring-1 ring-white/5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${iconColor} opacity-60`} />
        <span className="text-xs text-slate-400 uppercase tracking-wide">{title}</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-5 h-5 text-slate-400" />
        <span className="font-semibold text-slate-400">Insufficient Data</span>
      </div>
      <div className="text-xs text-slate-500 mt-2">
        {type === 'region'
          ? `Requires ≥${MIN_SENT_THRESHOLD} sent or ≥${MIN_CAMPAIGNS_THRESHOLD} campaigns`
          : `Requires ≥${MIN_SENT_THRESHOLD} emails sent`
        }
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
          <div className="bg-white/10 rounded-lg p-4 shadow-lg ring-1 ring-white/10 hover:bg-white/15 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-slate-300 uppercase tracking-wide">Top Region</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">{metrics.bestRegion.info.flag}</span>
              <span className="font-bold text-lg">{metrics.bestRegion.info.name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mb-2">
              <div>
                <span className="text-slate-400 text-xs">Open</span>
                <div className="font-semibold text-green-400">
                  {(metrics.bestRegion.avgOpenRate * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-xs">Click</span>
                <div className="font-semibold text-green-400">
                  {(metrics.bestRegion.avgClickRate * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <span className="text-slate-400 text-xs">Delivery</span>
                <div className="font-semibold text-green-400">
                  {(metrics.bestRegion.deliveryRate * 100).toFixed(1)}%
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
            <div className="bg-white/10 rounded-lg p-4 shadow-lg ring-1 ring-white/10 hover:bg-white/15 transition-colors">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-slate-300 uppercase tracking-wide">Needs Attention</span>
                <div className="relative group ml-auto">
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                  <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-slate-900 rounded-lg shadow-xl text-xs text-slate-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <div className="font-medium text-white mb-1">Why this region?</div>
                    Lowest composite score based on Open Rate, Click Rate, and Delivery Rate.
                    <div className="absolute bottom-0 right-3 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900"></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{metrics.worstRegion.info.flag}</span>
                <span className="font-bold text-lg">{metrics.worstRegion.info.name}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm mb-2">
                <div>
                  <span className="text-slate-400 text-xs">Open</span>
                  <div className="font-semibold text-orange-400">
                    {(metrics.worstRegion.avgOpenRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Click</span>
                  <div className="font-semibold text-orange-400">
                    {(metrics.worstRegion.avgClickRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Delivery</span>
                  <div className="font-semibold text-orange-400">
                    {(metrics.worstRegion.deliveryRate * 100).toFixed(1)}%
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
          <div className="bg-white/10 rounded-lg p-4 shadow-lg ring-1 ring-white/10 hover:bg-white/15 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-300 uppercase tracking-wide">Best Campaign</span>
            </div>
            <div className="mb-2">
              <div className="font-semibold text-sm line-clamp-1">
                {metrics.topCampaign.title || metrics.topCampaign.subject_line || 'Untitled Campaign'}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {metrics.topCampaignRegion?.flag} {metrics.topCampaignRegion?.name}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mb-2">
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
                <span className="text-slate-400 text-xs">Delivery</span>
                <div className="font-semibold text-green-400">
                  {((metrics.topCampaign.emails_sent - (metrics.topCampaign.bounces || 0)) / metrics.topCampaign.emails_sent * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-400 pt-2 border-t border-slate-600">
              {(metrics.topCampaign.emails_sent || 0).toLocaleString()} emails sent
            </div>
          </div>
        ) : (
          <InsufficientDataCard title="Best Campaign" icon={Award} iconColor="text-blue-400" type="campaign" />
        )}
      </div>

      {/* Inactive Regions & Alerts - Side by Side */}
      {(metrics.inactiveRegions?.length > 0 || metrics.alerts.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Inactive Regions */}
          {metrics.inactiveRegions && metrics.inactiveRegions.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">Inactive Regions</span>
                <span className="text-xs text-amber-400/60 ml-1">(&gt;30 days)</span>
              </div>
              <div className="space-y-2">
                {metrics.inactiveRegions.map((region, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{region.info.flag}</span>
                      <span className="text-sm text-white">{region.info.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-amber-400 font-medium">
                        {region.daysSinceLastCampaign} days ago
                      </div>
                      <div className="text-xs text-slate-500">
                        {format(region.lastCampaignDate, 'MMM d')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alerts */}
          {metrics.alerts.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-300">Alerts</span>
                <span className="text-xs text-red-400/60 ml-1">({metrics.alerts.length})</span>
              </div>
              <div className="space-y-2">
                {metrics.alerts.slice(0, 6).map((alert, i) => {
                  // Format alert message based on type
                  let message = '';
                  let colorClass = alert.severity === 'high' ? 'text-red-300' : 'text-orange-300';

                  switch (alert.type) {
                    case 'bounce':
                      message = `High bounce (${(alert.value * 100).toFixed(1)}%)`;
                      break;
                    case 'unsub':
                      message = `High unsub (${(alert.value * 100).toFixed(1)}%)`;
                      break;
                    case 'lowActivity':
                      message = `Low activity (${alert.value} campaigns/30d)`;
                      break;
                    case 'lowEngagement':
                      message = alert.reason === 'open'
                        ? `Low open (${(alert.value * 100).toFixed(1)}%)`
                        : `Low click (${(alert.value * 100).toFixed(1)}%)`;
                      break;
                    default:
                      message = 'Unknown alert';
                  }

                  return (
                    <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-sm text-white">{alert.region}</span>
                      <span className={`text-xs ${colorClass}`}>{message}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Region detail content component
function RegionContent({ metrics, currentRegion, audienceName, reviewThresholds }) {
  // Check if region has sufficient data (uses region-level threshold)
  const regionHasData = metrics.totalSent >= MIN_SENT_THRESHOLD || metrics.campaignCount >= MIN_CAMPAIGNS_THRESHOLD;
  // Individual campaign comparison uses lower threshold (50 vs 100)
  const topCampaignHasData = metrics.topCampaign && (metrics.topCampaign.emails_sent || 0) >= MIN_CAMPAIGN_SENT_THRESHOLD;
  const bottomCampaignHasData = metrics.bottomCampaign && (metrics.bottomCampaign.emails_sent || 0) >= MIN_CAMPAIGN_SENT_THRESHOLD;

  return (
    <div className="space-y-4">
      {/* Key Summary Stats - Prominent Display */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {/* Total Emails Sent */}
        <div className="bg-white/10 rounded-lg p-3 md:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Send className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Total Sent</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-white tabular-nums">
            {metrics.totalSent.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {metrics.campaignCount} campaign{metrics.campaignCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Audience */}
        <div className="bg-white/10 rounded-lg p-3 md:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Audience</span>
          </div>
          <div className="text-sm md:text-base font-bold text-white line-clamp-2" title={audienceName}>
            {audienceName}
          </div>
        </div>

        {/* Last Campaign */}
        <div className="bg-white/10 rounded-lg p-3 md:p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400 uppercase tracking-wide">Last Campaign</span>
          </div>
          <div className={`text-xl md:text-2xl font-bold ${metrics.daysSinceLastCampaign > 30 ? 'text-amber-400' : 'text-white'}`}>
            {metrics.daysSinceLastCampaign <= 7
              ? `${metrics.daysSinceLastCampaign}d ago`
              : format(metrics.lastCampaignDate, 'MMM d')}
          </div>
          {metrics.daysSinceLastCampaign > 30 && (
            <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Over 30 days
            </div>
          )}
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

      {/* Top & Bottom Campaigns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best Campaign */}
        {topCampaignHasData ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 shadow-lg ring-1 ring-green-500/20 hover:bg-green-500/15 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-300 uppercase tracking-wide">Top Performer</span>
            </div>
            <div className="font-semibold text-sm line-clamp-1 mb-2">
              {metrics.topCampaign.title || metrics.topCampaign.subject_line || 'Untitled Campaign'}
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm">
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
                <span className="text-slate-400 text-xs">Delivery</span>
                <div className="font-semibold text-green-400">
                  {((metrics.topCampaign.emails_sent - (metrics.topCampaign.bounces || 0)) / metrics.topCampaign.emails_sent * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-400 pt-2 mt-2 border-t border-green-500/20">
              {(metrics.topCampaign.emails_sent || 0).toLocaleString()} emails sent
            </div>
          </div>
        ) : (
          <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-4 opacity-70 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-green-400/60" />
              <span className="text-xs text-green-300/60 uppercase tracking-wide">Top Performer</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-300" />
              <span className="text-sm text-slate-300">Insufficient Data</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Requires ≥{MIN_CAMPAIGN_SENT_THRESHOLD} emails sent
            </div>
          </div>
        )}

        {/* Needs Review Campaign */}
        {metrics.campaignCount > 1 && (
          !metrics.bottomCampaign ? (
            // All campaigns performing well - no one needs review!
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-300 uppercase tracking-wide">All Performing Well</span>
              </div>
              <div className="text-sm text-green-300">
                No campaigns below threshold
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Open ≥{(reviewThresholds.reviewOpenRate * 100).toFixed(0)}%, Click ≥{(reviewThresholds.reviewClickRate * 100).toFixed(0)}%, Delivery ≥{(reviewThresholds.reviewDeliveryRate * 100).toFixed(0)}%
              </div>
            </div>
          ) : bottomCampaignHasData ? (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 shadow-lg ring-1 ring-orange-500/20 hover:bg-orange-500/15 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsDown className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-orange-300 uppercase tracking-wide">Needs Review</span>
                <span className="text-xs text-slate-500 ml-auto">Open &lt;{(reviewThresholds.reviewOpenRate * 100).toFixed(0)}% / Click &lt;{(reviewThresholds.reviewClickRate * 100).toFixed(0)}% / Delivery &lt;{(reviewThresholds.reviewDeliveryRate * 100).toFixed(0)}%</span>
              </div>
              <div className="font-semibold text-sm line-clamp-1 mb-2">
                {metrics.bottomCampaign.title || metrics.bottomCampaign.subject_line || 'Untitled Campaign'}
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-slate-400 text-xs">Open</span>
                  <div className={`font-semibold ${(metrics.bottomCampaign.open_rate || 0) < reviewThresholds.reviewOpenRate ? 'text-red-400' : 'text-orange-400'}`}>
                    {((metrics.bottomCampaign.open_rate || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Click</span>
                  <div className={`font-semibold ${(metrics.bottomCampaign.click_rate || 0) < reviewThresholds.reviewClickRate ? 'text-red-400' : 'text-orange-400'}`}>
                    {((metrics.bottomCampaign.click_rate || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-xs">Delivery</span>
                  <div className={`font-semibold ${((metrics.bottomCampaign.emails_sent - (metrics.bottomCampaign.bounces || 0)) / metrics.bottomCampaign.emails_sent) < reviewThresholds.reviewDeliveryRate ? 'text-red-400' : 'text-orange-400'}`}>
                    {((metrics.bottomCampaign.emails_sent - (metrics.bottomCampaign.bounces || 0)) / metrics.bottomCampaign.emails_sent * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-400 pt-2 mt-2 border-t border-orange-500/20">
                {(metrics.bottomCampaign.emails_sent || 0).toLocaleString()} emails sent
              </div>
            </div>
          ) : (
            <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-4 opacity-70 shadow-lg">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsDown className="w-4 h-4 text-orange-400/60" />
                <span className="text-xs text-orange-300/60 uppercase tracking-wide">Needs Review</span>
              </div>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-300" />
                <span className="text-sm text-slate-300">Insufficient Data</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Requires ≥{MIN_CAMPAIGN_SENT_THRESHOLD} emails sent
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
    <div className={`bg-white/10 rounded-lg p-3 shadow-lg ring-1 ring-white/10 ${dimmed ? 'opacity-50' : 'hover:bg-white/15'} transition-colors`}>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${dimmed ? 'text-slate-400' : ''}`}>{value}</div>
      {subLabel && (
        <div className="text-xs text-slate-400">{subLabel}</div>
      )}
    </div>
  );
}
