import React from 'react';

// Base skeleton element
function SkeletonBase({ className = '', style = {} }) {
  return (
    <div
      className={`skeleton rounded-lg bg-gray-200 ${className}`}
      style={style}
    />
  );
}

// KPI Card skeleton
export function KPICardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-layered">
      <div className="flex items-center justify-between mb-4">
        <SkeletonBase className="h-4 w-24" />
        <SkeletonBase className="h-8 w-8 rounded-full" />
      </div>
      <SkeletonBase className="h-8 w-32 mb-2" />
      <SkeletonBase className="h-3 w-20" />
    </div>
  );
}

// Executive Summary skeleton
export function ExecutiveSummarySkeleton() {
  return (
    <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 rounded-xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <SkeletonBase className="h-5 w-5 rounded-full bg-slate-600" />
        <SkeletonBase className="h-5 w-40 bg-slate-600" />
      </div>
      {/* Stats bar */}
      <div className="flex gap-4 mb-4 pb-3 border-b border-slate-600">
        <SkeletonBase className="h-4 w-28 bg-slate-600" />
        <SkeletonBase className="h-4 w-28 bg-slate-600" />
        <SkeletonBase className="h-4 w-20 bg-slate-600" />
      </div>
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/10 rounded-lg p-4">
            <SkeletonBase className="h-3 w-20 bg-slate-600 mb-3" />
            <SkeletonBase className="h-6 w-32 bg-slate-600 mb-2" />
            <div className="grid grid-cols-3 gap-2">
              <SkeletonBase className="h-10 bg-slate-600" />
              <SkeletonBase className="h-10 bg-slate-600" />
              <SkeletonBase className="h-10 bg-slate-600" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ height = 'h-80' }) {
  return (
    <div className={`bg-white rounded-xl p-6 shadow-layered ${height}`}>
      <div className="flex items-center justify-between mb-4">
        <SkeletonBase className="h-5 w-48" />
        <div className="flex gap-2">
          <SkeletonBase className="h-8 w-20 rounded-md" />
          <SkeletonBase className="h-8 w-20 rounded-md" />
        </div>
      </div>
      <div className="flex items-end justify-between h-48 gap-2 mt-8">
        {[40, 65, 45, 80, 55, 70, 50, 85, 60, 75, 45, 90].map((h, i) => (
          <SkeletonBase
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// Region card skeleton
export function RegionCardSkeleton() {
  return (
    <div className="bg-white rounded-xl p-6 shadow-layered">
      <div className="flex items-center gap-3 mb-4">
        <SkeletonBase className="h-10 w-10 rounded-full" />
        <div>
          <SkeletonBase className="h-5 w-24 mb-1" />
          <SkeletonBase className="h-3 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SkeletonBase className="h-16 rounded-lg" />
        <SkeletonBase className="h-16 rounded-lg" />
        <SkeletonBase className="h-16 rounded-lg" />
        <SkeletonBase className="h-16 rounded-lg" />
      </div>
    </div>
  );
}

// Full dashboard skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Executive Summary */}
      <ExecutiveSummarySkeleton />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <KPICardSkeleton key={i} />
        ))}
      </div>

      {/* Chart */}
      <ChartSkeleton />

      {/* Region Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {[1, 2, 3].map((i) => (
          <RegionCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default DashboardSkeleton;
