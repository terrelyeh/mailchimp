import React from 'react';
import { TrendingUp, Mail, MousePointer, ArrowRight, AlertTriangle, UserMinus, FileText } from 'lucide-react';

const RegionCard = ({ region, data, onClick }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
        onClick={onClick}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{region.flag}</span>
            <div>
              <h3 className="font-bold text-gray-900">{region.name}</h3>
              <p className="text-xs text-gray-500">{region.code}</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-400">No data available</p>
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
      className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-300 transition-all cursor-pointer group"
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
      </div>
    </div>
  );
};

export default function RegionCards({ regionsData, regions, onRegionClick }) {
  // 防護檢查
  if (!regions || regions.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Regional Performance</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {regions.map((region) => (
          <RegionCard
            key={region.code}
            region={region}
            data={regionsData[region.code] || []}
            onClick={() => onRegionClick(region.code)}
          />
        ))}
      </div>
    </div>
  );
}
