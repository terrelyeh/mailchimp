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
  const [isExporting, setIsExporting] = useState(false); // Export mode state

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
    <div className="min-h-screen bg-[#F6F6F4] bg-textured p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 md:gap-4 mb-4 md:mb-6 pb-3 md:pb-4 border-b border-gray-300">
          {/* Title Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 md:gap-5 min-w-0 flex-1">
              {/* Logo - hidden on mobile */}
              <img
                src="/logo.png"
                alt="EnGenius"
                className="h-8 md:h-12 w-auto flex-shrink-0 hidden md:block"
              />
              <div className="w-px h-8 md:h-10 bg-gray-200 hidden md:block flex-shrink-0" />

              {view === 'region-detail' && currentRegion ? (
                <div className="min-w-0">
                  <button
                    onClick={handleBackToOverview}
                    className="flex items-center text-gray-500 hover:text-gray-900 text-xs md:text-sm mb-0.5"
                  >
                    <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 mr-1 flex-shrink-0" />
                    <span className="hidden sm:inline">Back to Overview</span>
                    <span className="sm:hidden">Back</span>
                  </button>
                  <h1 className="page-title">
                    {currentRegion.flag} {currentRegion.name}
                  </h1>
                </div>
              ) : (
                <div className="min-w-0">
                  <h1 className="page-title">
                    EDM Dashboard
                  </h1>
                  <p className="text-gray-500 text-xs md:text-sm hidden sm:block">Campaign Analytics</p>
                </div>
              )}
            </div>

            {/* Action Buttons - Always visible */}
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              {/* Last Sync Time */}
              {lastFetchTime && !useMock && (
                <span
                  className="text-xs text-gray-400 hidden lg:flex items-center gap-1.5 mr-2"
                  title={lastFetchTime.toLocaleString()}
                >
                  <span className="text-gray-500">Synced</span>
                  {lastFetchTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center bg-[#FFE01B] hover:bg-[#FFE01B]/80 text-[#241C15] px-2 md:px-4 py-1.5 md:py-2 rounded-lg font-bold shadow-sm transition-colors text-xs md:text-sm"
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
                onExportStart={() => setIsExporting(true)}
                onExportEnd={() => setIsExporting(false)}
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
            {view === 'overview' ? (
              <>
                {/* Section 1: Summary (Executive Summary only) */}
                <div data-export-section="summary">
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
                  <ExecutiveSummary
                    data={displayData}
                    isOverview={true}
                    regions={availableRegions}
                  />
                </div>

                {/* Section 2: KPI Cards (keep together, don't split) */}
                <div data-export-section="kpi">
                  <KPICards data={displayData} isMultiRegion={true} totalSubscribers={totalSubscribers} selectedDays={selectedDays} />
                </div>

                {/* Section 3: Chart */}
                <div data-export-section="chart">
                  <TimeSeriesMetricsChart regionsData={displayData} regions={availableRegions} />
                </div>

                {/* Section 4: Region Cards */}
                <div data-export-section="details">
                  <RegionCards
                    regionsData={displayData}
                    regions={availableRegions}
                    onRegionClick={handleRegionClick}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Section 1: Summary (Executive Summary only) */}
                <div data-export-section="summary">
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
                  <ExecutiveSummary
                    data={displayData}
                    isOverview={false}
                    currentRegion={currentRegion}
                    selectedAudience={selectedAudience}
                    audienceList={audienceList}
                  />
                </div>

                {/* Section 2: KPI Cards (keep together, don't split) */}
                <div data-export-section="kpi">
                  <KPICards
                    data={displayData}
                    isMultiRegion={false}
                    totalSubscribers={totalSubscribers}
                    selectedDays={selectedDays}
                  />
                </div>

                {/* Section 3: Chart */}
                <div data-export-section="chart">
                  <DashboardCharts data={displayData} />
                </div>

                {/* Section 4: Campaign List */}
                <div data-export-section="details">
                  <CampaignList data={Array.isArray(displayData) ? displayData : []} isExporting={isExporting} />
                </div>
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
