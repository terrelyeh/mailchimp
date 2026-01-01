import React, { useMemo } from 'react';
import { Clock, Star } from 'lucide-react';

/**
 * Level 2: Send Time Heatmap - 發送時段熱力圖
 * 找出最佳發送時機
 */
export default function SendTimeHeatmap({ data, isMultiRegion = false }) {
  const heatmapData = useMemo(() => {
    // Flatten data
    let campaigns = [];
    if (isMultiRegion && typeof data === 'object' && !Array.isArray(data)) {
      campaigns = Object.values(data).flat().filter(Boolean);
    } else if (Array.isArray(data)) {
      campaigns = data;
    }

    if (campaigns.length === 0) return null;

    // Days of week
    const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Time slots (4-hour blocks)
    const timeSlots = [
      { label: '00-06', start: 0, end: 6 },
      { label: '06-10', start: 6, end: 10 },
      { label: '10-14', start: 10, end: 14 },
      { label: '14-18', start: 14, end: 18 },
      { label: '18-22', start: 18, end: 22 },
      { label: '22-24', start: 22, end: 24 }
    ];

    // Initialize grid
    const grid = {};
    days.forEach((day, dayIndex) => {
      grid[dayIndex] = {};
      timeSlots.forEach((slot, slotIndex) => {
        grid[dayIndex][slotIndex] = {
          campaigns: 0,
          totalSent: 0,
          totalOpens: 0,
          openRate: 0
        };
      });
    });

    // Populate grid
    campaigns.forEach(campaign => {
      if (!campaign.send_time) return;

      const date = new Date(campaign.send_time);
      const dayOfWeek = date.getDay(); // 0-6
      const hour = date.getHours();

      // Find time slot
      const slotIndex = timeSlots.findIndex(slot => hour >= slot.start && hour < slot.end);
      if (slotIndex === -1) return;

      const cell = grid[dayOfWeek][slotIndex];
      cell.campaigns++;
      cell.totalSent += campaign.emails_sent || 0;
      cell.totalOpens += campaign.opens || 0;
    });

    // Calculate open rates
    let maxOpenRate = 0;
    let bestSlot = { day: 0, slot: 0, openRate: 0 };

    Object.keys(grid).forEach(dayIndex => {
      Object.keys(grid[dayIndex]).forEach(slotIndex => {
        const cell = grid[dayIndex][slotIndex];
        if (cell.totalSent > 0) {
          cell.openRate = (cell.totalOpens / cell.totalSent) * 100;
          if (cell.openRate > maxOpenRate && cell.campaigns >= 1) {
            maxOpenRate = cell.openRate;
            bestSlot = {
              day: parseInt(dayIndex),
              slot: parseInt(slotIndex),
              openRate: cell.openRate
            };
          }
        }
      });
    });

    return {
      grid,
      days,
      dayLabels,
      timeSlots,
      maxOpenRate,
      bestSlot
    };
  }, [data, isMultiRegion]);

  if (!heatmapData) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">發送時段分析</h2>
        <div className="text-center text-gray-400 py-8">No data available</div>
      </div>
    );
  }

  const getHeatColor = (openRate) => {
    if (openRate === 0) return 'bg-gray-100';
    const intensity = Math.min(openRate / heatmapData.maxOpenRate, 1);
    if (intensity >= 0.8) return 'bg-green-500';
    if (intensity >= 0.6) return 'bg-green-400';
    if (intensity >= 0.4) return 'bg-yellow-400';
    if (intensity >= 0.2) return 'bg-yellow-300';
    return 'bg-orange-200';
  };

  const getTextColor = (openRate) => {
    if (openRate === 0) return 'text-gray-400';
    const intensity = Math.min(openRate / heatmapData.maxOpenRate, 1);
    if (intensity >= 0.6) return 'text-white';
    return 'text-gray-700';
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900">發送時段分析</h2>
        </div>
        <div className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-1 rounded-full">
          <Star className="w-3 h-3" />
          最佳: {heatmapData.days[heatmapData.bestSlot.day]} {heatmapData.timeSlots[heatmapData.bestSlot.slot].label}
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-xs text-gray-500 font-medium p-2 text-left w-16"></th>
              {heatmapData.timeSlots.map((slot, idx) => (
                <th key={idx} className="text-xs text-gray-500 font-medium p-2 text-center">
                  {slot.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {heatmapData.dayLabels.map((dayLabel, dayIndex) => (
              <tr key={dayIndex}>
                <td className="text-xs font-medium text-gray-600 p-2">
                  {dayLabel}
                </td>
                {heatmapData.timeSlots.map((slot, slotIndex) => {
                  const cell = heatmapData.grid[dayIndex][slotIndex];
                  const isBest = dayIndex === heatmapData.bestSlot.day && slotIndex === heatmapData.bestSlot.slot;

                  return (
                    <td key={slotIndex} className="p-1">
                      <div
                        className={`
                          relative h-12 rounded-md flex flex-col items-center justify-center
                          ${getHeatColor(cell.openRate)}
                          ${isBest ? 'ring-2 ring-green-600 ring-offset-1' : ''}
                          transition-all hover:scale-105 cursor-pointer
                        `}
                        title={`${heatmapData.days[dayIndex]} ${slot.label}\n開信率: ${cell.openRate.toFixed(1)}%\nCampaigns: ${cell.campaigns}`}
                      >
                        {cell.campaigns > 0 ? (
                          <>
                            <span className={`text-sm font-bold ${getTextColor(cell.openRate)}`}>
                              {cell.openRate.toFixed(0)}%
                            </span>
                            <span className={`text-xs ${getTextColor(cell.openRate)} opacity-75`}>
                              {cell.campaigns}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                        {isBest && (
                          <Star className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>開信率:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-orange-200 rounded" />
              <span>低</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-yellow-400 rounded" />
              <span>中</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-500 rounded" />
              <span>高</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            數字 = Campaign 數量
          </div>
        </div>
      </div>

      {/* Recommendation */}
      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-sm text-blue-800">
          <span className="font-medium">💡 建議：</span>
          優先在 <strong>{heatmapData.days[heatmapData.bestSlot.day]} {heatmapData.timeSlots[heatmapData.bestSlot.slot].label}</strong> 發送郵件，
          歷史開信率達 <strong>{heatmapData.bestSlot.openRate.toFixed(1)}%</strong>
        </div>
      </div>
    </div>
  );
}
