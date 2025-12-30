import React from 'react';
import { TrendingUp, TrendingDown, Mail, MousePointer, UserX } from 'lucide-react';

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

export default function KPICards({ data }) {
    // Calculate metrics from local data
    const totalSent = data.reduce((acc, curr) => acc + (curr.emails_sent || 0), 0);

    const avgOpenRate = data.length ? (
        data.reduce((acc, curr) => acc + (curr.open_rate || 0), 0) / data.length
    ) : 0;

    const avgClickRate = data.length ? (
        data.reduce((acc, curr) => acc + (curr.click_rate || 0), 0) / data.length
    ) : 0;

    const totalUnsub = data.reduce((acc, curr) => acc + (curr.unsubscribed || 0), 0);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card
                title="Total Emails Sent"
                value={totalSent.toLocaleString()}
                icon={Mail}
            />
            <Card
                title="Avg. Open Rate"
                value={`${(avgOpenRate * 100).toFixed(1)}%`}
                trend={2.5}
                icon={TrendingUp}
            />
            <Card
                title="Avg. Click Rate"
                value={`${(avgClickRate * 100).toFixed(1)}%`}
                trend={-0.4}
                icon={MousePointer}
            />
            <Card
                title="Unsubscribes"
                value={totalUnsub.toLocaleString()}
                subValue="0.1% of total"
                icon={UserX}
            />
        </div>
    );
}
