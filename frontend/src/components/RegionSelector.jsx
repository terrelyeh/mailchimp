import React from 'react';
import { Globe } from 'lucide-react';

export default function RegionSelector({ regions, selectedRegion, onRegionChange }) {
  return (
    <div className="relative inline-block">
      <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-3 py-2 border-r border-gray-200">
          <Globe className="w-4 h-4 text-gray-400" />
        </div>
        <select
          value={selectedRegion || 'all'}
          onChange={(e) => onRegionChange(e.target.value === 'all' ? null : e.target.value)}
          className="px-4 py-2 bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
        >
          <option value="all">All Regions</option>
          {regions.map((region) => (
            <option key={region.code} value={region.code}>
              {region.flag} {region.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
