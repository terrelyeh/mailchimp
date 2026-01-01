import React, { useEffect, useState } from 'react';
import KPICards from './components/KPICards';
import DashboardCharts from './components/DashboardCharts';
import CampaignList from './components/CampaignList';
import RegionSelector from './components/RegionSelector';
import TimeRangeSelector from './components/TimeRangeSelector';
import RegionCards from './components/RegionCards';
import RegionComparisonCharts from './components/RegionComparisonCharts';
import { fetchDashboardData, triggerSync, fetchRegions } from './api';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { MOCK_REGIONS_DATA, REGIONS, getRegionInfo } from './mockData';

function App() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedDays, setSelectedDays] = useState(60);
  const [view, setView] = useState('overview'); // 'overview' or 'region-detail'
  const [availableRegions, setAvailableRegions] = useState(REGIONS); // Dynamic regions from API

  const loadData = async (force = false) => {
    setLoading(true);
    const result = await fetchDashboardData(selectedDays, selectedRegion, force);

    console.log('loadData - selectedRegion:', selectedRegion);
    console.log('loadData - API result:', result);

    if (result && result.data) {
      // Check if data is actually populated
      const hasData = selectedRegion
        ? Array.isArray(result.data) && result.data.length > 0
        : Object.values(result.data).some(arr => Array.isArray(arr) && arr.length > 0);

      console.log('loadData - hasData:', hasData);
      console.log('loadData - result.data:', result.data);

      if (hasData) {
        setData(result.data);
        setUseMock(false);
      } else {
        // Fallback to mock if API returns empty
        console.log("Using Mock Data");
        setData(MOCK_REGIONS_DATA);
        setUseMock(true);
      }
    } else {
      console.log("Using Mock Data");
      setData(MOCK_REGIONS_DATA);
      setUseMock(true);
    }
    setLoading(false);
  };

  const loadRegions = async () => {
    const regions = await fetchRegions();
    if (regions && regions.length > 0) {
      // Map region codes to full region info
      const regionsWithMetadata = regions.map(code => getRegionInfo(code));
      setAvailableRegions(regionsWithMetadata);
      console.log("Loaded available regions:", regions);
    }
  };

  useEffect(() => {
    // Load available regions on mount
    loadRegions();
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedDays, selectedRegion]);

  const handleSync = async () => {
    setIsSyncing(true);
    await triggerSync(selectedDays);
    setTimeout(() => {
      loadData(false);
      setIsSyncing(false);
    }, 2000);
  };

  const handleRegionChange = (region) => {
    setSelectedRegion(region);
    if (region) {
      setView('region-detail');
    } else {
      setView('overview');
    }
  };

  const handleRegionClick = (regionCode) => {
    setSelectedRegion(regionCode);
    setView('region-detail');
  };

  const handleBackToOverview = () => {
    setSelectedRegion(null);
    setView('overview');
  };

  // Get current region info
  const currentRegion = selectedRegion
    ? availableRegions.find(r => r.code === selectedRegion)
    : null;

  // Get display data based on view
  const displayData = selectedRegion
    ? (Array.isArray(data)
        ? data // Single region data (already an array)
        : (typeof data === 'object' && data[selectedRegion])
          ? data[selectedRegion] // Extract from multi-region object
          : [] // Empty array if no data
      )
    : (typeof data === 'object' && !Array.isArray(data))
      ? data // Multi-region object
      : {}; // Empty object

  console.log('Render - selectedRegion:', selectedRegion);
  console.log('Render - data type:', typeof data, 'isArray:', Array.isArray(data));
  console.log('Render - data:', data);
  console.log('Render - displayData:', displayData);

  return (
    <div className="min-h-screen bg-[#F6F6F4] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            {view === 'region-detail' && currentRegion ? (
              <div>
                <button
                  onClick={handleBackToOverview}
                  className="flex items-center text-gray-600 hover:text-gray-900 mb-2 text-sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Overview
                </button>
                <h1 className="text-3xl font-bold text-[#241C15] tracking-tight">
                  {currentRegion.flag} {currentRegion.name}
                </h1>
                <p className="text-gray-500 mt-1">Regional campaign performance details</p>
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-bold text-[#241C15] tracking-tight">
                  Multi-Region Dashboard
                </h1>
                <p className="text-gray-500 mt-1">Monitor MailChimp performance across all regions</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <TimeRangeSelector
              selectedDays={selectedDays}
              onDaysChange={setSelectedDays}
            />

            <RegionSelector
              regions={availableRegions}
              selectedRegion={selectedRegion}
              onRegionChange={handleRegionChange}
            />

            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center bg-[#FFE01B] hover:bg-[#FFE01B]/80 text-[#241C15] px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync'}
            </button>
          </div>
        </div>

        {useMock && (
          <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg mb-6 text-sm border border-blue-100">
            ℹ️ Displaying <strong>Mock Data</strong>. Configure your <code>.env</code> in backend for real data.
          </div>
        )}

        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">Loading dashboard...</div>
        ) : view === 'overview' ? (
          <>
            {/* Overview Page - All Regions */}
            <KPICards data={displayData} isMultiRegion={true} />
            <RegionComparisonCharts regionsData={displayData} regions={availableRegions} />
            <RegionCards
              regionsData={displayData}
              regions={availableRegions}
              onRegionClick={handleRegionClick}
            />
          </>
        ) : (
          <>
            {/* Region Detail Page */}
            <KPICards data={displayData} isMultiRegion={false} />
            <DashboardCharts data={displayData} />
            <CampaignList data={displayData.slice(0, 10)} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
