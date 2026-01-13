import React, { useState, useEffect } from 'react';
import { Check, Loader2, AlertCircle, EyeOff } from 'lucide-react';
import { getExcludedAudiences, setExcludedAudiences, fetchAudiences } from '../api';

export default function ExcludedAudiencesManager() {
  const [allAudiences, setAllAudiences] = useState({});
  const [excludedIds, setExcludedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialExcludedIds, setInitialExcludedIds] = useState(new Set());

  // Load all audiences and excluded audiences
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all audiences from all regions
        const audiencesData = await fetchAudiences();
        if (audiencesData) {
          setAllAudiences(audiencesData);
        }

        // Fetch currently excluded audiences
        const excludedData = await getExcludedAudiences();
        if (excludedData?.excluded_audiences) {
          const ids = new Set(excludedData.excluded_audiences.map(a => a.audience_id));
          setExcludedIds(ids);
          setInitialExcludedIds(new Set(ids));
        }
      } catch (err) {
        setError('Failed to load audiences');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Check for changes
  useEffect(() => {
    const currentIds = Array.from(excludedIds).sort().join(',');
    const initialIds = Array.from(initialExcludedIds).sort().join(',');
    setHasChanges(currentIds !== initialIds);
  }, [excludedIds, initialExcludedIds]);

  // Toggle audience exclusion
  const toggleExclusion = (audienceId, audienceName, region) => {
    setExcludedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(audienceId)) {
        newSet.delete(audienceId);
      } else {
        newSet.add(audienceId);
      }
      return newSet;
    });
    setSuccessMessage(null);
  };

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Build the audiences array with names and regions
    const audiencesToExclude = [];
    Object.entries(allAudiences).forEach(([region, audiences]) => {
      audiences.forEach(aud => {
        if (excludedIds.has(aud.id)) {
          audiencesToExclude.push({
            audience_id: aud.id,
            audience_name: aud.name,
            region: region
          });
        }
      });
    });

    const result = await setExcludedAudiences(audiencesToExclude);

    if (result.status === 'success') {
      setInitialExcludedIds(new Set(excludedIds));
      setSuccessMessage(`${result.count} audience(s) excluded`);
      setHasChanges(false);
    } else {
      setError(result.message || 'Failed to save changes');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading audiences...</span>
      </div>
    );
  }

  const regions = Object.keys(allAudiences);

  if (regions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <EyeOff className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p>No audiences found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Description */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700">
        <p>Excluded audiences will be hidden from "All Audiences" statistics. You can still view them individually.</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm">
          <Check className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      {/* Audience List by Region */}
      <div className="space-y-4">
        {regions.map(region => {
          const audiences = allAudiences[region] || [];
          if (audiences.length === 0) return null;

          return (
            <div key={region} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <span className="font-medium text-gray-700">{region}</span>
                <span className="text-xs text-gray-500 ml-2">
                  ({audiences.filter(a => excludedIds.has(a.id)).length} excluded)
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {audiences.map(audience => {
                  const isExcluded = excludedIds.has(audience.id);
                  return (
                    <label
                      key={audience.id}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        isExcluded ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isExcluded}
                          onChange={() => toggleExclusion(audience.id, audience.name, region)}
                          className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                        />
                        <div className="min-w-0">
                          <span className={`text-sm ${isExcluded ? 'text-red-700 line-through' : 'text-gray-700'}`}>
                            {audience.name}
                          </span>
                          <span className="text-xs text-gray-400 ml-2">
                            ({(audience.member_count || 0).toLocaleString()} subscribers)
                          </span>
                        </div>
                      </div>
                      {isExcluded && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex-shrink-0">
                          Excluded
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasChanges && !saving
              ? 'bg-[#007C89] hover:bg-[#006670] text-white'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
