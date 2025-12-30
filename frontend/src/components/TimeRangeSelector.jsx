import React from 'react';
import { Calendar } from 'lucide-react';

const TIME_RANGES = [
  { value: 7, label: '7 Days' },
  { value: 30, label: '30 Days' },
  { value: 90, label: '90 Days' }
];

export default function TimeRangeSelector({ selectedDays, onDaysChange }) {
  return (
    <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-3 py-2 border-r border-gray-200">
        <Calendar className="w-4 h-4 text-gray-400" />
      </div>
      <select
        value={selectedDays}
        onChange={(e) => onDaysChange(Number(e.target.value))}
        className="px-4 py-2 bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
      >
        {TIME_RANGES.map((range) => (
          <option key={range.value} value={range.value}>
            Last {range.label}
          </option>
        ))}
      </select>
    </div>
  );
}
