import React from 'react';
import { TrendingUp, TrendingDown, Mail, MousePointer, UserX, FileText, Users, CheckCircle, AlertTriangle } from 'lucide-react';

const Card = ({ title, value, subValue, trend, icon: Icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-gray-50 rounded-lg">
                <Icon className="w-5 h-5 text-gray-500" />
            </div>
            {trend && (
                <div className={`flex items-center text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {trend > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
        <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {subValue && <div className="text-xs text-gray-400 mt-1">{subValue}</div>}
    </div>
);

export default function KPICards({ data, isMultiRegion = false, totalSubscribers = null }) {
    // 防護檢查：確保 data 存在
    if (!data) {
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

    // Flatten data if it's multi-region (object with region keys)
    let flatData = Array.isArray(data) ? data : [];
    if (isMultiRegion && typeof data === 'object' && !Array.isArray(data)) {
        flatData = Object.values(data).flat().filter(Boolean);
    }

    // Calculate metrics from local data
    const totalSent = flatData.reduce((acc, curr) => acc + (curr.emails_sent || 0), 0);
    const totalBounces = flatData.reduce((acc, curr) => acc + (curr.bounces || 0), 0);
    const totalDelivered = totalSent - totalBounces;
    const totalUnsub = flatData.reduce((acc, curr) => acc + (curr.unsubscribed || 0), 0);
    const totalCampaigns = flatData.length;

    // Calculate rates
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent * 100) : 0;
    const bounceRate = totalSent > 0 ? (totalBounces / totalSent * 100) : 0;
    const unsubRate = totalSent > 0 ? (totalUnsub / totalSent * 100) : 0;

    const avgOpenRate = flatData.length ? (
        flatData.reduce((acc, curr) => acc + (curr.open_rate || 0), 0) / flatData.length
    ) : 0;

    const avgClickRate = flatData.length ? (
        flatData.reduce((acc, curr) => acc + (curr.click_rate || 0), 0) / flatData.length
    ) : 0;

    return (
        <div className="space-y-6 mb-8">
            {/* Row 1: Campaign & Email Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card
                    title="Total Campaigns"
                    value={totalCampaigns.toLocaleString()}
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
                    value={totalSent.toLocaleString()}
                    icon={Mail}
                />
                <Card
                    title="Delivery Rate"
                    value={`${deliveryRate.toFixed(1)}%`}
                    subValue={`${totalDelivered.toLocaleString()} delivered`}
                    icon={CheckCircle}
                />
            </div>

            {/* Row 2: Engagement & Health Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card
                    title="Avg. Open Rate"
                    value={`${(avgOpenRate * 100).toFixed(1)}%`}
                    icon={TrendingUp}
                />
                <Card
                    title="Avg. Click Rate"
                    value={`${(avgClickRate * 100).toFixed(1)}%`}
                    icon={MousePointer}
                />
                <Card
                    title="Bounce Rate"
                    value={`${bounceRate.toFixed(2)}%`}
                    subValue={`${totalBounces.toLocaleString()} bounced`}
                    icon={AlertTriangle}
                />
                <Card
                    title="Unsubscribe Rate"
                    value={`${unsubRate.toFixed(2)}%`}
                    subValue={`${totalUnsub.toLocaleString()} unsubscribed`}
                    icon={UserX}
                />
            </div>
        </div>
    );
}
