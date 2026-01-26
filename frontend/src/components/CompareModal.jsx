import React, { useState, useEffect, useCallback } from 'react';
import { X, Search, Plus, Trash2, Save, ChevronRight, ChevronLeft, ArrowLeft, Clock, Layers, BarChart3, Check, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { searchCampaigns, createComparisonGroup, listComparisonGroups, getComparisonGroup, deleteComparisonGroup } from '../api';
import { getRegionInfo } from '../mockData';

// Strip HTML tags from segment text
function cleanSegmentText(text) {
  if (!text) return '';
  // If it starts with HTML tag, it's raw HTML from Mailchimp API - skip it
  if (text.startsWith('<')) return '';
  // Also clean any inline HTML tags
  return text.replace(/<[^>]*>/g, '').trim();
}

export default function CompareModal({ isOpen, onClose, regions }) {
  // Tab state: 'new' or 'saved'
  const [activeTab, setActiveTab] = useState('new');

  // Step 1: Search & Select
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState([]);

  // Step 2: Compare table + save
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Saved tab
  const [savedGroups, setSavedGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [viewingGroup, setViewingGroup] = useState(null);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setSelectedCampaigns([]);
      setStep(1);
      setGroupName('');
      setGroupDescription('');
      setSaveSuccess(false);
      setViewingGroup(null);
    }
  }, [isOpen]);

  // Load saved groups when Saved tab is active
  useEffect(() => {
    if (isOpen && activeTab === 'saved') {
      loadSavedGroups();
    }
  }, [isOpen, activeTab]);

  const loadSavedGroups = async () => {
    setLoadingGroups(true);
    const result = await listComparisonGroups();
    if (result.status === 'success') {
      setSavedGroups(result.groups || []);
    }
    setLoadingGroups(false);
  };

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const result = await searchCampaigns(searchQuery);
      if (result.status === 'success') {
        setSearchResults(result.campaigns || []);
      }
      setSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleCampaign = useCallback((campaign) => {
    setSelectedCampaigns(prev => {
      const exists = prev.find(c => c.id === campaign.id && c.region === campaign.region);
      if (exists) {
        return prev.filter(c => !(c.id === campaign.id && c.region === campaign.region));
      }
      return [...prev, campaign];
    });
  }, []);

  const isSelected = useCallback((campaign) => {
    return selectedCampaigns.some(c => c.id === campaign.id && c.region === campaign.region);
  }, [selectedCampaigns]);

  const handleSave = async () => {
    if (!groupName.trim() || selectedCampaigns.length === 0) return;

    setSaving(true);
    const items = selectedCampaigns.map(c => ({
      campaign_id: c.id,
      region: c.region
    }));

    const result = await createComparisonGroup(groupName.trim(), items, groupDescription.trim() || null);
    if (result.status === 'success') {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setSaving(false);
  };

  const handleViewGroup = async (groupId) => {
    setLoadingGroup(true);
    const result = await getComparisonGroup(groupId);
    if (result.status === 'success') {
      setViewingGroup(result.group);
    }
    setLoadingGroup(false);
  };

  const handleDeleteGroup = async (groupId) => {
    setDeletingId(groupId);
    const result = await deleteComparisonGroup(groupId);
    if (result.status === 'success') {
      setSavedGroups(prev => prev.filter(g => g.id !== groupId));
      if (viewingGroup?.id === groupId) {
        setViewingGroup(null);
      }
    }
    setDeletingId(null);
  };

  const handleReselect = () => {
    setStep(1);
  };

  const handleClearAndRestart = () => {
    setSelectedCampaigns([]);
    setSearchQuery('');
    setSearchResults([]);
    setGroupName('');
    setGroupDescription('');
    setSaveSuccess(false);
    setStep(1);
  };

  const formatRate = (rate) => {
    if (rate == null) return '-';
    return (rate * 100).toFixed(2) + '%';
  };

  const formatRateValue = (rate) => {
    if (rate == null) return 0;
    return rate * 100;
  };

  const formatNumber = (num) => {
    if (num == null) return '-';
    return num.toLocaleString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Group search results by region
  const groupedResults = searchResults.reduce((acc, campaign) => {
    if (!acc[campaign.region]) acc[campaign.region] = [];
    acc[campaign.region].push(campaign);
    return acc;
  }, {});

  // Group selected campaigns by region
  const selectedByRegion = selectedCampaigns.reduce((acc, campaign) => {
    if (!acc[campaign.region]) acc[campaign.region] = [];
    acc[campaign.region].push(campaign);
    return acc;
  }, {});

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Redesigned comparison table with better readability
  const renderComparisonTable = (items) => {
    if (!items || items.length === 0) {
      return <p className="text-gray-500 text-sm text-center py-8">No campaigns to compare.</p>;
    }

    // Compute stats for relative bars and highlighting
    const openRates = items.map(i => i.open_rate || 0);
    const clickRates = items.map(i => i.click_rate || 0);
    const sentCounts = items.map(i => i.emails_sent || 0);
    const maxOpenRate = Math.max(...openRates);
    const maxClickRate = Math.max(...clickRates);
    const maxSent = Math.max(...sentCounts);

    return (
      <div className="space-y-0">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-0 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-3">Campaign</div>
          <div className="col-span-2 text-center">Delivery</div>
          <div className="col-span-2 text-center">Open Rate</div>
          <div className="col-span-2 text-center">Click Rate</div>
          <div className="col-span-1 text-center">Unsubs</div>
          <div className="col-span-2">Audience / Segment</div>
        </div>

        {/* Table Rows */}
        {items.map((item, idx) => {
          const regionInfo = getRegionInfo(item.region);
          const isBestOpen = items.length > 1 && item.open_rate && item.open_rate === maxOpenRate;
          const isBestClick = items.length > 1 && item.click_rate && item.click_rate === maxClickRate;
          const openPct = maxOpenRate > 0 ? ((item.open_rate || 0) / maxOpenRate) * 100 : 0;
          const clickPct = maxClickRate > 0 ? ((item.click_rate || 0) / maxClickRate) * 100 : 0;

          const segmentClean = cleanSegmentText(item.segment_text);

          return (
            <div
              key={`${item.campaign_id || item.id}-${item.region}-${idx}`}
              className={`grid grid-cols-12 gap-0 px-4 py-3 border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
            >
              {/* Campaign + Region */}
              <div className="col-span-3 min-w-0 pr-3">
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold mb-1"
                  style={{ backgroundColor: regionInfo.color + '15', color: regionInfo.color }}
                >
                  {regionInfo.flag} {regionInfo.code}
                </span>
                <p className="text-sm font-medium text-gray-900 truncate leading-tight" title={item.title || item.subject_line}>
                  {item.title || item.subject_line || '-'}
                </p>
                {item.subject_line && item.title && item.subject_line !== item.title && (
                  <p className="text-[11px] text-gray-400 truncate" title={item.subject_line}>
                    {item.subject_line}
                  </p>
                )}
                <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(item.send_time)}</p>
              </div>

              {/* Delivery */}
              <div className="col-span-2 flex flex-col items-center justify-center">
                <span className="text-sm font-semibold text-gray-800">{formatNumber(item.emails_sent)}</span>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  {item.unique_opens != null ? `${formatNumber(item.unique_opens)} opened` : ''}
                </span>
              </div>

              {/* Open Rate with bar */}
              <div className="col-span-2 flex flex-col items-center justify-center px-2">
                <span className={`text-sm font-bold tabular-nums ${isBestOpen ? 'text-emerald-600' : 'text-gray-800'}`}>
                  {formatRate(item.open_rate)}
                  {isBestOpen && <span className="ml-1 text-[10px] font-medium text-emerald-500">Best</span>}
                </span>
                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isBestOpen ? 'bg-emerald-400' : 'bg-[#007C89]/40'}`}
                    style={{ width: `${openPct}%` }}
                  />
                </div>
              </div>

              {/* Click Rate with bar */}
              <div className="col-span-2 flex flex-col items-center justify-center px-2">
                <span className={`text-sm font-bold tabular-nums ${isBestClick ? 'text-emerald-600' : 'text-gray-800'}`}>
                  {formatRate(item.click_rate)}
                  {isBestClick && <span className="ml-1 text-[10px] font-medium text-emerald-500">Best</span>}
                </span>
                <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isBestClick ? 'bg-emerald-400' : 'bg-amber-400/50'}`}
                    style={{ width: `${clickPct}%` }}
                  />
                </div>
              </div>

              {/* Unsubs */}
              <div className="col-span-1 flex items-center justify-center">
                <span className={`text-sm tabular-nums ${(item.unsubscribed || 0) > 5 ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                  {formatNumber(item.unsubscribed)}
                </span>
              </div>

              {/* Audience / Segment */}
              <div className="col-span-2 flex flex-col justify-center min-w-0">
                {item.audience_name && (
                  <p className="text-xs text-gray-600 truncate" title={item.audience_name}>
                    {item.audience_name}
                  </p>
                )}
                {segmentClean ? (
                  <p className="text-[11px] text-gray-400 truncate mt-0.5" title={segmentClean}>
                    {segmentClean}
                  </p>
                ) : null}
                {item.segment_member_count != null && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {formatNumber(item.segment_member_count)} members
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Summary row */}
        {items.length > 1 && (
          <div className="grid grid-cols-12 gap-0 px-4 py-3 bg-gray-50 border-t-2 border-gray-200">
            <div className="col-span-3">
              <span className="text-xs font-semibold text-gray-500 uppercase">Average</span>
            </div>
            <div className="col-span-2 flex flex-col items-center justify-center">
              <span className="text-sm font-semibold text-gray-700">
                {formatNumber(Math.round(sentCounts.reduce((a, b) => a + b, 0) / items.length))}
              </span>
              <span className="text-[10px] text-gray-400">avg sent</span>
            </div>
            <div className="col-span-2 flex flex-col items-center justify-center">
              <span className="text-sm font-semibold text-gray-700">
                {(openRates.reduce((a, b) => a + b, 0) / items.length * 100).toFixed(2)}%
              </span>
              <span className="text-[10px] text-gray-400">avg open</span>
            </div>
            <div className="col-span-2 flex flex-col items-center justify-center">
              <span className="text-sm font-semibold text-gray-700">
                {(clickRates.reduce((a, b) => a + b, 0) / items.length * 100).toFixed(2)}%
              </span>
              <span className="text-[10px] text-gray-400">avg click</span>
            </div>
            <div className="col-span-1 flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-700">
                {formatNumber(Math.round(items.reduce((a, b) => a + (b.unsubscribed || 0), 0) / items.length))}
              </span>
            </div>
            <div className="col-span-2" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Layers className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Campaign Comparison</h2>
              <p className="text-xs text-gray-500">Compare campaigns across regions for product launches</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button
            onClick={() => { setActiveTab('new'); setViewingGroup(null); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'new'
                ? 'border-[#007C89] text-[#007C89]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              New Comparison
            </div>
          </button>
          <button
            onClick={() => { setActiveTab('saved'); setViewingGroup(null); }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'saved'
                ? 'border-[#007C89] text-[#007C89]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Saved ({savedGroups.length})
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'new' ? (
            step === 1 ? (
              /* Step 1: Search & Select */
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700">Step 1: Search & Select Campaigns</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Search by keyword to find campaigns across all regions</p>
                  </div>
                  {selectedCampaigns.length > 0 && (
                    <button
                      onClick={() => setStep(2)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#007C89] hover:bg-[#006670] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                      Compare ({selectedCampaigns.length})
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Search Input */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search campaigns by title (e.g., product name, event)..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007C89] focus:border-transparent"
                    autoFocus
                  />
                  {searching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                  )}
                </div>

                {/* Selected campaigns summary */}
                {selectedCampaigns.length > 0 && (
                  <div className="mb-4 p-3 bg-[#007C89]/5 border border-[#007C89]/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#007C89]">
                        {selectedCampaigns.length} campaign{selectedCampaigns.length > 1 ? 's' : ''} selected
                      </span>
                      <button
                        onClick={() => setSelectedCampaigns([])}
                        className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCampaigns.map((c) => {
                        const rInfo = getRegionInfo(c.region);
                        return (
                          <span
                            key={`${c.id}-${c.region}`}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md text-xs border border-gray-200"
                          >
                            <span style={{ color: rInfo.color }}>{rInfo.flag}</span>
                            <span className="max-w-[120px] truncate">{c.title}</span>
                            <button
                              onClick={() => toggleCampaign(c)}
                              className="ml-0.5 text-gray-400 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Search Results */}
                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No campaigns found for &ldquo;{searchQuery}&rdquo;
                  </div>
                )}

                {searchQuery.length < 2 && searchResults.length === 0 && !searching && (
                  <div className="text-center py-12 text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Enter a keyword to search campaigns</p>
                    <p className="text-xs mt-1">e.g., product name, event, or campaign topic</p>
                  </div>
                )}

                {Object.keys(groupedResults).length > 0 && (
                  <div className="space-y-4">
                    {Object.entries(groupedResults).map(([region, campaigns]) => {
                      const regionInfo = getRegionInfo(region);
                      return (
                        <div key={region} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div
                            className="px-3 py-2 flex items-center gap-2"
                            style={{ backgroundColor: regionInfo.color + '10' }}
                          >
                            <span className="text-sm">{regionInfo.flag}</span>
                            <span className="text-sm font-medium" style={{ color: regionInfo.color }}>
                              {regionInfo.name}
                            </span>
                            <span className="text-xs text-gray-400">({campaigns.length})</span>
                          </div>
                          <div className="divide-y divide-gray-100">
                            {campaigns.map((campaign) => {
                              const selected = isSelected(campaign);
                              return (
                                <button
                                  key={`${campaign.id}-${campaign.region}`}
                                  onClick={() => toggleCampaign(campaign)}
                                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                                    selected ? 'bg-[#007C89]/5' : ''
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                    selected
                                      ? 'bg-[#007C89] border-[#007C89]'
                                      : 'border-gray-300'
                                  }`}>
                                    {selected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 truncate">{campaign.title || campaign.subject_line}</p>
                                    {campaign.subject_line && campaign.title && campaign.subject_line !== campaign.title && (
                                      <p className="text-xs text-gray-400 truncate">{campaign.subject_line}</p>
                                    )}
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                      <span>{formatDate(campaign.send_time)}</span>
                                      <span>Sent: {formatNumber(campaign.emails_sent)}</span>
                                      <span>Open: {formatRate(campaign.open_rate)}</span>
                                      <span>Click: {formatRate(campaign.click_rate)}</span>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Step 2: Comparison Table + Save */
              <div>
                {/* Step 2 Header with action buttons */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReselect}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-[#007C89] hover:bg-[#007C89]/5 border border-gray-200 hover:border-[#007C89]/30 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back to Search
                    </button>
                    <div className="ml-2">
                      <h3 className="text-sm font-semibold text-gray-700">Comparison Results</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedCampaigns.length} campaigns across {Object.keys(selectedByRegion).length} region{Object.keys(selectedByRegion).length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReselect}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-[#007C89] hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors"
                      title="Go back and modify selection"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Re-select
                    </button>
                    <button
                      onClick={handleClearAndRestart}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 border border-gray-200 rounded-lg transition-colors"
                      title="Clear all and start over"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Comparison Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                  {renderComparisonTable(selectedCampaigns)}
                </div>

                {/* Save Form */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                    <Save className="w-4 h-4 text-[#007C89]" />
                    Save This Comparison
                  </h4>
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Comparison name (e.g., Product X Launch Q1 2025)"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007C89] focus:border-transparent"
                      />
                      <input
                        type="text"
                        value={groupDescription}
                        onChange={(e) => setGroupDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007C89] focus:border-transparent"
                      />
                    </div>
                    <button
                      onClick={handleSave}
                      disabled={saving || !groupName.trim() || saveSuccess}
                      className={`flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap h-[38px] ${
                        saveSuccess
                          ? 'bg-green-500 text-white'
                          : saving || !groupName.trim()
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-[#007C89] hover:bg-[#006670] text-white shadow-sm'
                      }`}
                    >
                      {saveSuccess ? (
                        <>
                          <Check className="w-4 h-4" />
                          Saved!
                        </>
                      ) : saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            /* Saved Tab */
            <div>
              {viewingGroup ? (
                /* Viewing a saved group */
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => setViewingGroup(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-[#007C89] hover:bg-[#007C89]/5 border border-gray-200 hover:border-[#007C89]/30 rounded-lg transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to List
                    </button>
                    <div className="ml-2">
                      <h3 className="text-sm font-semibold text-gray-700">{viewingGroup.name}</h3>
                      {viewingGroup.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{viewingGroup.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-400 mb-3">
                    Created: {formatDate(viewingGroup.created_at)} &middot; {viewingGroup.items?.length || 0} campaigns
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    {renderComparisonTable(viewingGroup.items || [])}
                  </div>
                </div>
              ) : (
                /* List of saved groups */
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Saved Comparisons</h3>

                  {loadingGroups ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    </div>
                  ) : savedGroups.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No saved comparisons yet</p>
                      <p className="text-xs mt-1">Create a new comparison to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {savedGroups.map((group) => (
                        <div
                          key={group.id}
                          className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleViewGroup(group.id)}
                              className="flex-1 text-left"
                              disabled={loadingGroup}
                            >
                              <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">{group.name}</span>
                                <span className="text-xs text-gray-400">{group.item_count} campaigns</span>
                              </div>
                              {group.description && (
                                <p className="text-xs text-gray-500 mt-0.5 ml-6">{group.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-0.5 ml-6">
                                {formatDate(group.created_at)}
                              </p>
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              disabled={deletingId === group.id}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                              title="Delete comparison"
                            >
                              {deletingId === group.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {loadingGroup && (
                <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-10">
                  <Loader2 className="w-6 h-6 text-[#007C89] animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
