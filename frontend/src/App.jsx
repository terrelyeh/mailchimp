import React, { useEffect, useState, useMemo, useRef } from 'react';
import KPICards from './components/KPICards';
import DashboardCharts from './components/DashboardCharts';
import CampaignList from './components/CampaignList';
import RegionSelector from './components/RegionSelector';
import TimeRangeSelector from './components/TimeRangeSelector';
import AudienceSelector from './components/AudienceSelector';
import RegionCards from './components/RegionCards';
import TimeSeriesMetricsChart from './components/TimeSeriesMetricsChart';
import DiagnosticsDrawer from './components/DiagnosticsDrawer';
import ExportButton from './components/ExportButton';
import ExecutiveSummary from './components/ExecutiveSummary';
import SettingsModal from './components/SettingsModal';
import { DashboardSkeleton } from './components/Skeleton';
import { ThresholdProvider } from './contexts/ThresholdContext';
import { fetchDashboardData, triggerSync, fetchRegions, fetchAudiences } from './api';
import { RefreshCw, ArrowLeft, Activity, Settings } from 'lucide-react';
import { MOCK_REGIONS_DATA, REGIONS, getRegionInfo } from './mockData';

function App() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedDays, setSelectedDays] = useState(90);
  const [customDateRange, setCustomDateRange] = useState(null); // Custom date range { start, end }
  const [view, setView] = useState('overview'); // 'overview' or 'region-detail'
  const [availableRegions, setAvailableRegions] = useState(REGIONS); // Dynamic regions from API
  const [audiences, setAudiences] = useState([]); // Available audiences
  const [selectedAudience, setSelectedAudience] = useState(null); // Selected audience for filtering
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false); // Diagnostics drawer state
  const [settingsOpen, setSettingsOpen] = useState(false); // Settings modal state
  const [lastFetchTime, setLastFetchTime] = useState(null); // Last data fetch timestamp

  // Ref for export functionality
  const exportContentRef = useRef(null);

  const loadData = async (force = false) => {
    setLoading(true);
    const result = await fetchDashboardData(selectedDays, selectedRegion, force);

    if (result && result.data) {
      // Check if data is actually populated
      const hasData = selectedRegion
        ? Array.isArray(result.data) && result.data.length > 0
        : Object.values(result.data).some(arr => Array.isArray(arr) && arr.length > 0);

      if (hasData) {
        setData(result.data);
        setUseMock(false);
        setLastFetchTime(new Date()); // Update fetch time on success
      } else {
        // Fallback to mock if API returns empty
        setData(MOCK_REGIONS_DATA);
        setUseMock(true);
      }
    } else {
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
    }
  };

  const loadAudiences = async () => {
    const audiencesData = await fetchAudiences();
    if (audiencesData) {
      setAudiences(audiencesData);
    }
  };

  useEffect(() => {
    // Load available regions and audiences on mount
    loadRegions();
    loadAudiences();
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
    setSelectedAudience(null); // Clear audience filter when region changes
    if (region) {
      setView('region-detail');
    } else {
      setView('overview');
    }
  };

  const handleRegionClick = (regionCode) => {
    setSelectedRegion(regionCode);
    setSelectedAudience(null); // Clear audience filter when region changes
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
  let displayData = selectedRegion
    ? (Array.isArray(data)
        ? data // Single region data (already an array)
        : (typeof data === 'object' && data[selectedRegion])
          ? data[selectedRegion] // Extract from multi-region object
          : [] // Empty array if no data
      )
    : (typeof data === 'object' && !Array.isArray(data))
      ? data // Multi-region object
      : {}; // Empty object

  // Filter by selected audience
  if (selectedAudience) {
    if (Array.isArray(displayData)) {
      // Single region view - filter the array
      displayData = displayData.filter(campaign => campaign.audience_id === selectedAudience);
    } else if (typeof displayData === 'object') {
      // Multi-region view - filter each region's campaigns
      const filteredData = {};
      Object.entries(displayData).forEach(([region, campaigns]) => {
        if (Array.isArray(campaigns)) {
          filteredData[region] = campaigns.filter(campaign => campaign.audience_id === selectedAudience);
        } else {
          filteredData[region] = campaigns;
        }
      });
      displayData = filteredData;
    }
  }

  // Convert audiences to a flat list for use across components
  const audienceList = useMemo(() => {
    if (!audiences) return [];
    if (Array.isArray(audiences)) return audiences;
    if (typeof audiences === 'object') {
      return Object.values(audiences).flat().filter(Boolean);
    }
    return [];
  }, [audiences]);

  // Calculate total subscribers (based on selected audience or all)
  const totalSubscribers = useMemo(() => {
    if (audienceList.length === 0) {
      return null;
    }

    // If a specific audience is selected, show only that audience's subscribers
    if (selectedAudience) {
      const selected = audienceList.find(aud => aud.id === selectedAudience);
      return selected ? selected.member_count : null;
    }

    // Otherwise show total across all audiences
    const total = audienceList.reduce((sum, aud) => {
      return sum + (aud.member_count || 0);
    }, 0);

    return total > 0 ? total : null;
  }, [audienceList, selectedAudience]);

  return (
    <div className="min-h-screen bg-[#F6F6F4] p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6 md:mb-8">
          {/* Title Row */}
          <div className="flex items-start justify-between">
            <div>
              {view === 'region-detail' && currentRegion ? (
                <div className="flex items-center gap-4 md:gap-5">
                  <img src="/logo.png" alt="EnGenius" className="h-10 md:h-12 w-auto" />
                  <div className="w-px h-10 bg-gray-200 hidden md:block" />
                  <div>
                    <button
                      onClick={handleBackToOverview}
                      className="flex items-center text-gray-600 hover:text-gray-900 mb-1 text-sm"
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" />
                      Back to Overview
                    </button>
                    <h1 className="text-lg md:text-2xl font-bold text-[#241C15] tracking-tight">
                      {currentRegion.flag} {currentRegion.name}
                    </h1>
                    <p className="text-gray-500 text-xs md:text-sm">EDM Campaign Analytics</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 md:gap-5">
                  <img src="/logo.png" alt="EnGenius" className="h-10 md:h-12 w-auto" />
                  <div className="w-px h-10 bg-gray-200 hidden md:block" />
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-[#241C15] tracking-tight">
                      EDM Analytic Dashboard
                    </h1>
                    <p className="text-gray-500 text-xs md:text-sm">Multi-Region Campaign Analytics</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons - Always visible */}
            <div className="flex items-center gap-2">
              {/* Last Sync Time */}
              {lastFetchTime && !useMock && (
                <span
                  className="text-xs text-gray-400 hidden md:block"
                  title={lastFetchTime.toLocaleString()}
                >
                  {lastFetchTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center bg-[#FFE01B] hover:bg-[#FFE01B]/80 text-[#241C15] px-3 md:px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-xs md:text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''} md:mr-2`} />
                <span className="hidden md:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
              </button>

              <ExportButton
                targetRef={exportContentRef}
                fileName="EnGenius_EDM_Dashboard"
                view={view}
                selectedRegion={selectedRegion}
                selectedDays={selectedDays}
                customDateRange={customDateRange}
                selectedAudience={selectedAudience}
                audienceList={audienceList}
              />

              <button
                onClick={() => setDiagnosticsOpen(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Open API Diagnostics"
              >
                <Activity className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSettingsOpen(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Alert Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <TimeRangeSelector
              selectedDays={selectedDays}
              onDaysChange={setSelectedDays}
              dateRange={customDateRange}
              onDateRangeChange={setCustomDateRange}
            />

            <RegionSelector
              regions={availableRegions}
              selectedRegion={selectedRegion}
              onRegionChange={handleRegionChange}
            />

            {/* 只在選擇特定 region 時顯示 Audience 篩選器 */}
            {selectedRegion && (
              <AudienceSelector
                audiences={audiences}
                selectedAudience={selectedAudience}
                onAudienceChange={setSelectedAudience}
                selectedRegion={selectedRegion}
              />
            )}
          </div>
        </div>

        {useMock && (
          <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg mb-6 text-sm border border-blue-100">
            ℹ️ Displaying <strong>Mock Data</strong>. Configure your <code>.env</code> in backend for real data.
          </div>
        )}

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <div ref={exportContentRef} data-export-content>
            {/* Date Range Display */}
            <div className="mb-4 text-sm text-gray-600">
              <span className="font-medium">Data Range:</span>{' '}
              {customDateRange ? (
                <>
                  {new Date(customDateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' - '}
                  {new Date(customDateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </>
              ) : (
                <>
                  {new Date(Date.now() - selectedDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' - '}
                  {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </>
              )}
            </div>

            {view === 'overview' ? (
              <>
                {/* Overview Page - All Regions */}
                <ExecutiveSummary
                  data={displayData}
                  isOverview={true}
                  regions={availableRegions}
                />
                <KPICards data={displayData} isMultiRegion={true} totalSubscribers={totalSubscribers} />
                <TimeSeriesMetricsChart regionsData={displayData} regions={availableRegions} />
                <RegionCards
                  regionsData={displayData}
                  regions={availableRegions}
                  onRegionClick={handleRegionClick}
                />
              </>
            ) : (
              <>
                {/* Region Detail Page */}
                <ExecutiveSummary
                  data={displayData}
                  isOverview={false}
                  currentRegion={currentRegion}
                  selectedAudience={selectedAudience}
                  audienceList={audienceList}
                />
                <KPICards
                  data={displayData}
                  isMultiRegion={false}
                  totalSubscribers={totalSubscribers}
                />

                {/* Performance Chart */}
                <DashboardCharts data={displayData} />

                <CampaignList data={Array.isArray(displayData) ? displayData : []} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Diagnostics Drawer */}
      <DiagnosticsDrawer
        isOpen={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        selectedDays={selectedDays}
        onForceRefresh={() => loadData(true)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

function AppWithProviders() {
  return (
    <ThresholdProvider>
      <App />
    </ThresholdProvider>
  );
}

export default AppWithProviders;
