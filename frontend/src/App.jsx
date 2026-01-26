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
import ShareDialog from './components/ShareDialog';
import LoginPage from './components/LoginPage';
import ChangePasswordModal from './components/ChangePasswordModal';
import UserProfileDropdown from './components/UserProfileDropdown';
import AIAnalysisButton from './components/AIAnalysisButton';
import AIAnalysisModal from './components/AIAnalysisModal';
import { DashboardSkeleton } from './components/Skeleton';
import { ThresholdProvider } from './contexts/ThresholdContext';
import {
  fetchDashboardData, triggerSync, fetchRegions, fetchRegionsActivity, fetchAudiences,
  createShareLink, getShareLink, verifyShareLinkPassword,
  getStoredUser, getStoredToken, logout as apiLogout, setStoredAuth,
  getExcludedAudiences, logActivity
} from './api';
import { RefreshCw, ArrowLeft, Share2, Lock, AlertTriangle } from 'lucide-react';
import { MOCK_REGIONS_DATA, REGIONS, getRegionInfo } from './mockData';

// Helper function to detect share token from URL synchronously (must be outside component)
const getInitialShareToken = () => {
  const pathParts = window.location.pathname.split('/');
  const tokenFromPath = pathParts[1] === 's' ? pathParts[2] : null;
  const tokenFromQuery = new URLSearchParams(window.location.search).get('token');
  return tokenFromPath || tokenFromQuery || null;
};

// Detect share token immediately at module load time
const initialShareToken = getInitialShareToken();

function App() {
  // Authentication state
  const [user, setUser] = useState(() => getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getStoredToken());
  const [showChangePassword, setShowChangePassword] = useState(false);

  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [useMock, setUseMock] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [selectedDays, setSelectedDays] = useState(90);
  const [customDateRange, setCustomDateRange] = useState(null); // Custom date range { start, end }
  const [view, setView] = useState('overview'); // 'overview' or 'region-detail'
  const [availableRegions, setAvailableRegions] = useState(REGIONS); // Dynamic regions from API
  const [regionsActivity, setRegionsActivity] = useState({}); // Last activity for each region
  const [audiences, setAudiences] = useState([]); // Available audiences
  const [selectedAudience, setSelectedAudience] = useState(null); // Selected audience for filtering
  const [excludedAudienceIds, setExcludedAudienceIds] = useState(new Set()); // Excluded audience IDs
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false); // Diagnostics drawer state
  const [settingsOpen, setSettingsOpen] = useState(false); // Settings modal state
  const [shareDialogOpen, setShareDialogOpen] = useState(false); // Share dialog state
  const [lastFetchTime, setLastFetchTime] = useState(null); // Last data fetch timestamp
  const [isExporting, setIsExporting] = useState(false); // Export mode state
  const [initialUrlParsed, setInitialUrlParsed] = useState(false); // Track if URL was parsed

  // AI Analysis states
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiContext, setAiContext] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [aiScreenshot, setAiScreenshot] = useState(null);

  // Share link access states - use pre-detected token to prevent login flash
  const [shareToken, setShareToken] = useState(initialShareToken);
  const [sharePasswordRequired, setSharePasswordRequired] = useState(false); // Password prompt state
  const [sharePassword, setSharePassword] = useState(''); // Password input value
  const [shareError, setShareError] = useState(null); // Share link error
  const [shareVerifying, setShareVerifying] = useState(false); // Verifying password state
  const [shareAccessVerified, setShareAccessVerified] = useState(false); // True once share link is verified

  // Ref for export functionality
  const exportContentRef = useRef(null);

  // Handle login success
  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    // Check if user must change password
    if (userData.must_change_password) {
      setShowChangePassword(true);
    }
  };

  // Handle logout
  const handleLogout = () => {
    apiLogout();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Handle password change success
  const handlePasswordChangeSuccess = () => {
    setShowChangePassword(false);
    // Update user state to reflect password change
    if (user) {
      const updatedUser = { ...user, must_change_password: false };
      setUser(updatedUser);
      setStoredAuth(getStoredToken(), updatedUser);
    }
  };

  // Listen for auth-expired event
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  // Read URL parameters on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Check for share token first (format: /s/TOKEN or ?token=TOKEN)
    const pathParts = window.location.pathname.split('/');
    const tokenFromPath = pathParts[1] === 's' ? pathParts[2] : null;
    const tokenFromQuery = params.get('token');
    const token = tokenFromPath || tokenFromQuery;

    if (token) {
      // Handle share link access
      setShareToken(token);
      handleShareLinkAccess(token);
      return; // Don't parse other params, they'll come from the share link
    }

    // Parse days
    const daysParam = params.get('days');
    if (daysParam) {
      const days = parseInt(daysParam, 10);
      if ([7, 30, 60, 90, 180, 365].includes(days)) {
        setSelectedDays(days);
      }
    }

    // Parse custom date range
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    if (startDate && endDate) {
      setCustomDateRange({ start: startDate, end: endDate });
    }

    // Parse region
    const regionParam = params.get('region');
    if (regionParam) {
      setSelectedRegion(regionParam);
      setView('region-detail');
    }

    // Parse audience
    const audienceParam = params.get('audience');
    if (audienceParam) {
      setSelectedAudience(audienceParam);
    }

    // Parse view
    const viewParam = params.get('view');
    if (viewParam === 'overview' || viewParam === 'region-detail') {
      setView(viewParam);
    }

    setInitialUrlParsed(true);
  }, []);

  // Update URL when filters change (after initial parse)
  useEffect(() => {
    if (!initialUrlParsed) return;

    const params = new URLSearchParams();

    // Add days (only if not default)
    if (selectedDays !== 90) {
      params.set('days', selectedDays.toString());
    }

    // Add custom date range
    if (customDateRange) {
      params.set('startDate', customDateRange.start);
      params.set('endDate', customDateRange.end);
    }

    // Add region
    if (selectedRegion) {
      params.set('region', selectedRegion);
    }

    // Add audience
    if (selectedAudience) {
      params.set('audience', selectedAudience);
    }

    // Add view (only if region-detail)
    if (view === 'region-detail') {
      params.set('view', view);
    }

    // Update URL without page reload
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
  }, [selectedDays, customDateRange, selectedRegion, selectedAudience, view, initialUrlParsed]);

  // Handle share link access (called on mount if token present)
  const handleShareLinkAccess = async (token) => {
    setLoading(true);
    setShareError(null);

    const result = await getShareLink(token);

    if (result.status === 'error') {
      if (result.error === 'not_found') {
        setShareError('This share link does not exist or has been removed.');
      } else {
        setShareError('Failed to load share link.');
      }
      setLoading(false);
      setInitialUrlParsed(true);
      return;
    }

    if (result.status === 'password_required') {
      setSharePasswordRequired(true);
      setLoading(false);
      return;
    }

    if (result.error === 'expired') {
      setShareError('This share link has expired.');
      setLoading(false);
      setInitialUrlParsed(true);
      return;
    }

    if (result.status === 'success' && result.filter_state) {
      applyFilterState(result.filter_state);
    }
  };

  // Verify password for protected share link
  const handleVerifySharePassword = async () => {
    if (!shareToken || !sharePassword) return;

    setShareVerifying(true);
    setShareError(null);

    const result = await verifyShareLinkPassword(shareToken, sharePassword);

    if (result.status === 'error') {
      if (result.error === 'invalid_password') {
        setShareError('Incorrect password. Please try again.');
      } else if (result.error === 'expired') {
        setShareError('This share link has expired.');
        setSharePasswordRequired(false);
      } else {
        setShareError('Failed to verify password.');
      }
      setShareVerifying(false);
      return;
    }

    if (result.status === 'success' && result.filter_state) {
      setSharePasswordRequired(false);
      applyFilterState(result.filter_state);
    }

    setShareVerifying(false);
  };

  // Apply filter state from share link
  const applyFilterState = (filterState) => {
    if (filterState.days) {
      setSelectedDays(filterState.days);
    }
    if (filterState.customDateRange) {
      setCustomDateRange(filterState.customDateRange);
    }
    if (filterState.region) {
      setSelectedRegion(filterState.region);
      setView('region-detail');
    }
    if (filterState.audience) {
      setSelectedAudience(filterState.audience);
    }
    if (filterState.view) {
      setView(filterState.view);
    }

    // Mark share access as verified BEFORE clearing the token
    setShareAccessVerified(true);

    // Clear the share token from URL and show clean URL
    const cleanUrl = window.location.origin + window.location.pathname.replace(/\/s\/[^/]+/, '');
    window.history.replaceState({}, '', cleanUrl);

    setShareToken(null);
    setInitialUrlParsed(true);
  };

  // Create share link with options
  const handleCreateShareLink = async ({ name, password, expiresDays }) => {
    const filterState = {
      days: selectedDays,
      customDateRange: customDateRange,
      region: selectedRegion,
      audience: selectedAudience,
      view: view
    };

    const result = await createShareLink(filterState, password, expiresDays, name);

    if (result.status === 'success') {
      // Build share URL
      const shareUrl = `${window.location.origin}/s/${result.token}`;
      return { success: true, url: shareUrl };
    }

    return { success: false, error: result.error || 'Failed to create share link' };
  };

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
      // Map region codes to full region info (API returns {code, name} objects)
      const regionsWithMetadata = regions.map(region => {
        const code = typeof region === 'string' ? region : region.code;
        return getRegionInfo(code);
      });
      setAvailableRegions(regionsWithMetadata);
    }

    // Also load region activity on initial load
    await loadRegionsActivity();
  };

  // Separate function to load/refresh regionsActivity
  // Called on: initial load, after Sync, and when time range changes
  const loadRegionsActivity = async () => {
    const activity = await fetchRegionsActivity();
    if (activity) {
      setRegionsActivity(activity);
    }
  };

  const loadAudiences = async () => {
    const audiencesData = await fetchAudiences();
    if (audiencesData) {
      setAudiences(audiencesData);
    }
  };

  const loadExcludedAudiences = async () => {
    const result = await getExcludedAudiences();
    if (result?.excluded_audiences) {
      setExcludedAudienceIds(new Set(result.excluded_audiences.map(a => a.audience_id)));
    }
  };

  useEffect(() => {
    // Load available regions, audiences, and excluded audiences on mount
    loadRegions();
    loadAudiences();
    loadExcludedAudiences();

    // Log session start (user opened the app)
    if (isAuthenticated && !shareToken) {
      logActivity('session_start', { timestamp: new Date().toISOString() });
    }
  }, []);

  useEffect(() => {
    loadData();
    // Refresh regionsActivity when time range changes to ensure consistency
    loadRegionsActivity();
  }, [selectedDays, selectedRegion]);

  const handleSync = async () => {
    setIsSyncing(true);
    await triggerSync(selectedDays);
    setTimeout(async () => {
      loadData(false);
      // Refresh regionsActivity after sync to ensure Last Campaign dates are accurate
      await loadRegionsActivity();
      setIsSyncing(false);
    }, 2000);
  };

  const handleRegionChange = (region) => {
    setSelectedRegion(region);
    setSelectedAudience(null); // Clear audience filter when region changes
    if (region) {
      setView('region-detail');
      logActivity('view_region', { region });
    } else {
      setView('overview');
      logActivity('view_dashboard', { view: 'overview' });
    }
  };

  const handleRegionClick = (regionCode) => {
    setSelectedRegion(regionCode);
    setSelectedAudience(null); // Clear audience filter when region changes
    setView('region-detail');
    // Log activity
    logActivity('view_region', { region: regionCode });
  };

  const handleBackToOverview = () => {
    setSelectedRegion(null);
    setView('overview');
    // Log activity
    logActivity('view_dashboard', { view: 'overview' });
  };

  // Handle AI analysis completion
  const handleAIAnalysisComplete = (result) => {
    if (result.success) {
      setAiAnalysis(result.analysis);
      setAiContext(result.context);
      setAiScreenshot(result.screenshot);
      setAiError(null);
    } else {
      setAiAnalysis(null);
      setAiContext(null);
      setAiScreenshot(null);
      setAiError(result.error);
    }
    setAiModalOpen(true);
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

  // Filter out excluded audiences (when viewing "All Audiences")
  if (!selectedAudience && excludedAudienceIds.size > 0) {
    if (Array.isArray(displayData)) {
      // Single region view - filter out excluded audiences
      displayData = displayData.filter(campaign => !excludedAudienceIds.has(campaign.audience_id));
    } else if (typeof displayData === 'object') {
      // Multi-region view - filter out excluded audiences from each region
      const filteredData = {};
      Object.entries(displayData).forEach(([region, campaigns]) => {
        if (Array.isArray(campaigns)) {
          filteredData[region] = campaigns.filter(campaign => !excludedAudienceIds.has(campaign.audience_id));
        } else {
          filteredData[region] = campaigns;
        }
      });
      displayData = filteredData;
    }
  }

  // Filter out campaigns from deleted audiences (audiences that no longer exist in Mailchimp)
  // IMPORTANT: Each region has its own Mailchimp account with independent audience IDs
  // So we must filter per-region, comparing campaigns only against that region's audiences
  if (!selectedAudience && audiences && typeof audiences === 'object' && !Array.isArray(audiences)) {
    if (Array.isArray(displayData)) {
      // Single region view - filter using that region's audiences only
      const regionAudiences = selectedRegion ? audiences[selectedRegion] : null;
      if (regionAudiences && Array.isArray(regionAudiences) && regionAudiences.length > 0) {
        const validIds = new Set(regionAudiences.map(a => a.id));
        const filtered = displayData.filter(campaign => validIds.has(campaign.audience_id));
        // Only apply if it doesn't remove everything
        if (filtered.length > 0 || displayData.length === 0) {
          displayData = filtered;
        }
      }
    } else if (typeof displayData === 'object') {
      // Multi-region view - filter each region using its OWN audiences only
      const filteredData = {};
      Object.entries(displayData).forEach(([region, campaigns]) => {
        if (Array.isArray(campaigns)) {
          const regionAudiences = audiences[region];
          if (regionAudiences && Array.isArray(regionAudiences) && regionAudiences.length > 0) {
            const validIds = new Set(regionAudiences.map(a => a.id));
            const filtered = campaigns.filter(campaign => validIds.has(campaign.audience_id));
            // Only apply if it doesn't remove everything (safety check)
            if (filtered.length > 0 || campaigns.length === 0) {
              filteredData[region] = filtered;
            } else {
              filteredData[region] = campaigns;
            }
          } else {
            // No audiences loaded for this region, keep all campaigns
            filteredData[region] = campaigns;
          }
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

  // Get audiences filtered by selected region
  const regionAudienceList = useMemo(() => {
    if (!audiences) return [];

    // If a specific region is selected, only return audiences from that region
    if (selectedRegion && typeof audiences === 'object' && !Array.isArray(audiences)) {
      return audiences[selectedRegion] || [];
    }

    // Otherwise return all audiences
    return audienceList;
  }, [audiences, selectedRegion, audienceList]);

  // Calculate total subscribers (based on selected region, audience, excluding excluded audiences)
  const totalSubscribers = useMemo(() => {
    if (regionAudienceList.length === 0) {
      return null;
    }

    // If a specific audience is selected, show only that audience's subscribers
    if (selectedAudience) {
      const selected = regionAudienceList.find(aud => aud.id === selectedAudience);
      return selected ? selected.member_count : null;
    }

    // Otherwise show total across all non-excluded audiences in the selected region
    const total = regionAudienceList
      .filter(aud => !excludedAudienceIds.has(aud.id))
      .reduce((sum, aud) => {
        return sum + (aud.member_count || 0);
      }, 0);

    return total > 0 ? total : null;
  }, [regionAudienceList, selectedAudience, excludedAudienceIds]);

  // Check if accessing via share link (allow without auth)
  // Also check URL directly as a fallback in case state hasn't updated yet
  const hasShareTokenInUrl = () => {
    const pathParts = window.location.pathname.split('/');
    return pathParts[1] === 's' && pathParts[2];
  };
  const isShareLinkAccess = shareToken || sharePasswordRequired || shareAccessVerified || hasShareTokenInUrl();

  // Show login page if not authenticated (unless accessing share link)
  if (!isAuthenticated && !isShareLinkAccess) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

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

              {/* Only show Sync button for authenticated users (not share link access) */}
              {isAuthenticated && !isShareLinkAccess && (
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="flex items-center bg-[#FFE01B] hover:bg-[#FFE01B]/80 text-[#241C15] px-2 md:px-4 py-1.5 md:py-2 rounded-lg font-bold shadow-sm transition-colors text-xs md:text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''} md:mr-2`} />
                  <span className="hidden md:inline">{isSyncing ? 'Syncing...' : 'Sync'}</span>
                </button>
              )}

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

              {/* Share Link Button - only show if authenticated and not accessing via share link */}
              {isAuthenticated && !isShareLinkAccess && (
                <button
                  onClick={() => setShareDialogOpen(true)}
                  className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 md:px-4 py-1.5 md:py-2 rounded-lg font-medium shadow-sm transition-colors text-xs md:text-sm"
                  title="Share dashboard with current filters"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="hidden md:inline">Share</span>
                </button>
              )}

              {/* User Profile Dropdown - only show for authenticated users (not share link access) */}
              {isAuthenticated && user && !isShareLinkAccess && (
                <UserProfileDropdown
                  user={user}
                  onOpenSettings={() => setSettingsOpen(true)}
                  onOpenDiagnostics={() => setDiagnosticsOpen(true)}
                  onChangePassword={() => setShowChangePassword(true)}
                  onLogout={handleLogout}
                />
              )}
            </div>
          </div>

          {/* Filters Row - hide for share link access (read-only mode) */}
          {!isShareLinkAccess && (
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
                  excludedAudienceIds={excludedAudienceIds}
                />
              )}
            </div>
          )}

          {/* Share Link Info Banner */}
          {isShareLinkAccess && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
              <Share2 className="w-4 h-4" />
              <span>You are viewing a shared report</span>
            </div>
          )}
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
                    regionsActivity={regionsActivity}
                    onRegionClick={handleRegionClick}
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
                    regionsActivity={regionsActivity}
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
                    regionsActivity={regionsActivity}
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
                  <CampaignList data={Array.isArray(displayData) ? displayData : []} isExporting={isExporting} audiences={regionAudienceList} />
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
        onClose={() => {
          setSettingsOpen(false);
          // Reload excluded audiences in case they were changed
          loadExcludedAudiences();
        }}
        user={user}
        onChangePassword={() => setShowChangePassword(true)}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        mustChange={user?.must_change_password}
        onSuccess={handlePasswordChangeSuccess}
      />

      {/* Share Dialog */}
      <ShareDialog
        isOpen={shareDialogOpen}
        onClose={() => setShareDialogOpen(false)}
        onCreateLink={handleCreateShareLink}
        currentUrl={window.location.href}
      />

      {/* AI Analysis Button - Admin/Manager only, not for share link access */}
      {isAuthenticated && (user?.role === 'admin' || user?.role === 'manager') && !isShareLinkAccess && (
        <AIAnalysisButton
          targetRef={exportContentRef}
          view={view}
          selectedRegion={selectedRegion}
          selectedDays={selectedDays}
          customDateRange={customDateRange}
          selectedAudience={selectedAudience}
          audienceList={audienceList}
          onAnalysisComplete={handleAIAnalysisComplete}
          isAdmin={user?.role === 'admin' || user?.role === 'manager'}
        />
      )}

      {/* AI Analysis Modal */}
      <AIAnalysisModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        analysis={aiAnalysis}
        context={aiContext}
        error={aiError}
        screenshot={aiScreenshot}
      />

      {/* Password Prompt for Protected Share Links */}
      {sharePasswordRequired && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Password Required</h2>
                <p className="text-xs text-gray-500">This share link is password protected</p>
              </div>
            </div>

            <div className="space-y-4">
              <input
                type="password"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifySharePassword()}
                placeholder="Enter password"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007C89] focus:border-transparent"
                autoFocus
              />

              {shareError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {shareError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSharePasswordRequired(false);
                    setShareToken(null);
                    setShareError(null);
                    setInitialUrlParsed(true);
                    window.history.replaceState({}, '', window.location.origin);
                  }}
                  className="flex-1 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifySharePassword}
                  disabled={shareVerifying || !sharePassword}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    shareVerifying || !sharePassword
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-[#007C89] text-white hover:bg-[#006670]'
                  }`}
                >
                  {shareVerifying ? 'Verifying...' : 'Continue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Link Error */}
      {shareError && !sharePasswordRequired && shareToken && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Share Link Error</h2>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">{shareError}</p>

            <button
              onClick={() => {
                setShareToken(null);
                setShareError(null);
                window.history.replaceState({}, '', window.location.origin);
              }}
              className="w-full px-4 py-2 bg-[#007C89] hover:bg-[#006670] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
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
