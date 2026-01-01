import React from 'react';
import { Users } from 'lucide-react';

export default function AudienceSelector({ audiences, selectedAudience, onAudienceChange, selectedRegion }) {
  // Filter audiences based on selected region
  let filteredAudiences = [];

  if (typeof audiences === 'object' && !Array.isArray(audiences)) {
    // audiences is an object with region keys
    if (selectedRegion) {
      // Only show audiences from the selected region
      const regionAudiences = audiences[selectedRegion] || [];
      if (Array.isArray(regionAudiences)) {
        filteredAudiences = regionAudiences.map(aud => ({
          ...aud,
          region: selectedRegion
        }));
      }
    } else {
      // Show all audiences from all regions
      Object.entries(audiences).forEach(([region, regionAudiences]) => {
        if (Array.isArray(regionAudiences)) {
          regionAudiences.forEach(aud => {
            filteredAudiences.push({
              ...aud,
              region: region
            });
          });
        }
      });
    }
  } else if (Array.isArray(audiences)) {
    // audiences is already an array
    filteredAudiences = audiences;
  }

  // Remove duplicates based on audience ID
  const uniqueAudiences = filteredAudiences.reduce((acc, current) => {
    const existing = acc.find(item => item.id === current.id);
    if (!existing) {
      acc.push(current);
    }
    return acc;
  }, []);

  return (
    <div className="flex items-center bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-3 py-2 border-r border-gray-200">
        <Users className="w-4 h-4 text-gray-400" />
      </div>
      <select
        value={selectedAudience || ''}
        onChange={(e) => onAudienceChange(e.target.value || null)}
        className="px-4 py-2 bg-transparent text-sm font-medium text-gray-700 focus:outline-none cursor-pointer"
      >
        <option value="">All Audiences</option>
        {uniqueAudiences.map((audience) => (
          <option key={audience.id} value={audience.id}>
            {audience.name}
          </option>
        ))}
      </select>
    </div>
  );
}
