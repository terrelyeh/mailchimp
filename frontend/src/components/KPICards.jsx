import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Mail, MousePointer, UserX, FileText, Users, CheckCircle, AlertTriangle } from 'lucide-react';

const Card = ({ title, value, subValue, trend, trendLabel, icon: Icon }) => (
    <div className="bg-white p-4 md:p-5 rounded-xl shadow-layered border border-gray-100/50 card-hover">
        <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                <Icon className="w-4 h-4 text-gray-500" />
            </div>
            <h3 className="text-gray-500 text-xs font-medium tracking-wide uppercase truncate">{title}</h3>
        </div>
        <div className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight tabular-nums">{value}</div>
        {subValue && <div className="text-xs text-gray-400 mt-1 tabular-nums">{subValue}</div>}
        {trend !== null && trend !== undefined && (
            <div className={`flex items-center text-xs font-medium mt-2 tabular-nums ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : trend < 0 ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}% {trendLabel || 'vs prev period'}
            </div>
        )}
    </div>
);

// Calculate metrics from a data array
function calculateMetrics(dataArray) {
    if (!dataArray || dataArray.length === 0) {
        return null;
    }

    const totalSent = dataArray.reduce((acc, curr) => acc + (curr.emails_sent || 0), 0);
    const totalBounces = dataArray.reduce((acc, curr) => acc + (curr.bounces || 0), 0);
    const totalDelivered = totalSent - totalBounces;
    const totalUnsub = dataArray.reduce((acc, curr) => acc + (curr.unsubscribed || 0), 0);
    const totalOpens = dataArray.reduce((acc, curr) => acc + (curr.opens || 0), 0);
    const totalClicks = dataArray.reduce((acc, curr) => acc + (curr.clicks || 0), 0);

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent * 100) : 0;
    const bounceRate = totalSent > 0 ? (totalBounces / totalSent * 100) : 0;
    const unsubRate = totalSent > 0 ? (totalUnsub / totalSent * 100) : 0;

    const avgOpenRate = dataArray.length > 0
        ? dataArray.reduce((acc, curr) => acc + (curr.open_rate || 0), 0) / dataArray.length
        : 0;
    const avgClickRate = dataArray.length > 0
        ? dataArray.reduce((acc, curr) => acc + (curr.click_rate || 0), 0) / dataArray.length
        : 0;

    return {
        totalCampaigns: dataArray.length,
        totalSent,
        totalBounces,
        totalDelivered,
        totalUnsub,
        totalOpens,
        totalClicks,
        deliveryRate,
        bounceRate,
        unsubRate,
        avgOpenRate,
        avgClickRate
    };
}

// Calculate % change between two values
function calcChange(current, previous) {
    if (previous === 0 || previous === null || previous === undefined) return null;
    return ((current - previous) / previous) * 100;
}

export default function KPICards({ data, isMultiRegion = false, totalSubscribers = null, selectedDays = 30 }) {
    // Calculate period comparison metrics
    const { current, previous, trendLabel, hasSufficientData } = useMemo(() => {
        // Flatten data if it's multi-region
        let flatData = Array.isArray(data) ? data : [];
        if (isMultiRegion && typeof data === 'object' && !Array.isArray(data)) {
            flatData = Object.values(data).flat().filter(Boolean);
        }

        if (!flatData || flatData.length === 0) {
            return { current: null, previous: null, trendLabel: '', hasSufficientData: false };
        }

        // Sort by send_time
        const sortedData = [...flatData].sort((a, b) =>
            new Date(b.send_time) - new Date(a.send_time)
        );

        // Calculate period midpoint
        const now = new Date();
        const periodMs = selectedDays * 24 * 60 * 60 * 1000;
        const midpoint = new Date(now.getTime() - periodMs / 2);

        // Split data into current and previous periods
        const currentPeriodData = sortedData.filter(c => new Date(c.send_time) >= midpoint);
        const previousPeriodData = sortedData.filter(c => new Date(c.send_time) < midpoint);

        // Determine trend label based on period length
        let label = '';
        if (selectedDays >= 90) {
            label = 'vs prev quarter';
        } else if (selectedDays >= 30) {
            label = 'vs prev month';
        } else {
            label = 'vs prev period';
        }

        // Need at least 1 campaign in each period for comparison
        const sufficient = currentPeriodData.length >= 1 && previousPeriodData.length >= 1;

        return {
            current: calculateMetrics(currentPeriodData),
            previous: calculateMetrics(previousPeriodData),
            trendLabel: label,
            hasSufficientData: sufficient
        };
    }, [data, isMultiRegion, selectedDays]);

    // 防護檢查：確保 data 存在
    if (!data || !current) {
        return (
            <div className="space-y-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card title="Total Campaigns" value="0" subValue="loading..." icon={FileText} />
                    <Card title="Total Emails Sent" value="0" icon={Mail} />
                    <Card title="Delivery Rate" value="0%" icon={CheckCircle} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card title="Avg. Open Rate" value="0%" icon={TrendingUp} />
                    <Card title="Avg. Click Rate" value="0%" icon={MousePointer} />
                    <Card title="Bounce Rate" value="0%" icon={AlertTriangle} />
                    <Card title="Unsubscribe Rate" value="0%" icon={UserX} />
                </div>
            </div>
        );
    }

    // Calculate all metrics from full dataset for display
    let flatData = Array.isArray(data) ? data : [];
    if (isMultiRegion && typeof data === 'object' && !Array.isArray(data)) {
        flatData = Object.values(data).flat().filter(Boolean);
    }
    const fullMetrics = calculateMetrics(flatData) || current;

    // Calculate trends (only if sufficient data)
    const trends = hasSufficientData && previous ? {
        openRate: calcChange(current.avgOpenRate, previous.avgOpenRate),
        clickRate: calcChange(current.avgClickRate, previous.avgClickRate),
        deliveryRate: calcChange(current.deliveryRate, previous.deliveryRate),
        bounceRate: calcChange(current.bounceRate, previous.bounceRate),
    } : {};

    return (
        <div className="space-y-4 md:space-y-6 mb-6">
            {/* Row 1: Campaign & Email Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <Card
                    title="Total Campaigns"
                    value={fullMetrics.totalCampaigns.toLocaleString()}
                    subValue="in this period"
                    icon={FileText}
                />
                {totalSubscribers !== null && (
                    <Card
                        title="Total Subscribers"
                        value={totalSubscribers.toLocaleString()}
                        subValue="active members"
                        icon={Users}
                    />
                )}
                <Card
                    title="Total Emails Sent"
                    value={fullMetrics.totalSent.toLocaleString()}
                    icon={Mail}
                />
                <Card
                    title="Delivery Rate"
                    value={`${fullMetrics.deliveryRate.toFixed(1)}%`}
                    subValue={`${fullMetrics.totalDelivered.toLocaleString()} delivered`}
                    trend={trends.deliveryRate}
                    trendLabel={trendLabel}
                    icon={CheckCircle}
                />
            </div>

            {/* Row 2: Engagement & Health Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <Card
                    title="Avg. Open Rate"
                    value={`${(fullMetrics.avgOpenRate * 100).toFixed(1)}%`}
                    subValue={`${fullMetrics.totalOpens.toLocaleString()} opens`}
                    trend={trends.openRate}
                    trendLabel={trendLabel}
                    icon={TrendingUp}
                />
                <Card
                    title="Avg. Click Rate"
                    value={`${(fullMetrics.avgClickRate * 100).toFixed(1)}%`}
                    subValue={`${fullMetrics.totalClicks.toLocaleString()} clicks`}
                    trend={trends.clickRate}
                    trendLabel={trendLabel}
                    icon={MousePointer}
                />
                <Card
                    title="Bounce Rate"
                    value={`${fullMetrics.bounceRate.toFixed(2)}%`}
                    subValue={`${fullMetrics.totalBounces.toLocaleString()} bounced`}
                    trend={trends.bounceRate}
                    trendLabel={trendLabel}
                    icon={AlertTriangle}
                />
                <Card
                    title="Unsubscribe Rate"
                    value={`${fullMetrics.unsubRate.toFixed(2)}%`}
                    subValue={`${fullMetrics.totalUnsub.toLocaleString()} unsubscribed`}
                    icon={UserX}
                />
            </div>
        </div>
    );
}
