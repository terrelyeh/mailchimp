import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';

const TIME_RANGES = [
  { value: 30, label: '30 Days' },
  { value: 60, label: '60 Days' },
  { value: 90, label: '90 Days' },
  { value: 180, label: '6 Months' },
  { value: 365, label: '1 Year' },
  { value: 'custom', label: 'Custom Range' }
];

export default function TimeRangeSelector({ selectedDays, onDaysChange, dateRange, onDateRangeChange }) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const handleSelectChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') {
      setShowCustomPicker(true);
      // Set default dates (last 30 days)
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setCustomEnd(end.toISOString().split('T')[0]);
      setCustomStart(start.toISOString().split('T')[0]);
    } else {
      setShowCustomPicker(false);
      onDaysChange(Number(value));
      if (onDateRangeChange) {
        onDateRangeChange(null); // Clear custom date range
      }
    }
  };

  const handleApplyCustomRange = () => {
    if (customStart && customEnd) {
      const startDate = new Date(customStart);
      const endDate = new Date(customEnd);
      const diffTime = Math.abs(endDate - startDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      onDaysChange(diffDays);
      if (onDateRangeChange) {
        onDateRangeChange({ start: customStart, end: customEnd });
      }
      setShowCustomPicker(false);
    }
  };

  const isCustomMode = dateRange && dateRange.start && dateRange.end;

  // Calculate actual date range for display
  const getActualDateRange = () => {
    if (isCustomMode) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      return {
        start: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        end: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - selectedDays);
      return {
        start: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        end: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      };
    }
  };

  const actualRange = getActualDateRange();

  const formatDateDisplay = () => {
    if (isCustomMode) {
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return null;
  };

  return (
    <div className="relative">
      <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-3 py-2 border-r border-gray-200">
          <Calendar className="w-4 h-4 text-gray-400" />
        </div>

        {isCustomMode ? (
        <div className="flex items-center">
          <span className="px-4 py-2 text-sm font-medium text-gray-700">
            {formatDateDisplay()}
          </span>
          <button
            onClick={() => {
              if (onDateRangeChange) onDateRangeChange(null);
              onDaysChange(60);
            }}
            className="px-2 py-2 text-gray-400 hover:text-gray-600"
            title="Clear custom range"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <select
          value={showCustomPicker ? 'custom' : selectedDays}
          onChange={handleSelectChange}
          className="px-4 py-2 bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
        >
          {TIME_RANGES.map((range) => (
            <option key={range.value} value={range.value}>
              {range.value === 'custom' ? range.label : `Last ${range.label}`}
            </option>
          ))}
        </select>
      )}
      </div>

      {/* Custom Date Picker Modal */}
      {showCustomPicker && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 min-w-[300px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900">Select Date Range</h3>
            <button
              onClick={() => setShowCustomPicker(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                max={customEnd || undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                min={customStart || undefined}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCustomPicker(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyCustomRange}
                disabled={!customStart || !customEnd}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
