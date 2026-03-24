import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { ExternalLink, ChevronLeft, ChevronRight, Users, ChevronUp, ChevronDown, ChevronsUpDown, Mail, Tag, Filter, Search, X, Download, Clock, FileEdit, Pause, Send, CircleDot, Settings2, Eye, EyeOff, Archive } from 'lucide-react';
import { fetchCampaignList } from '../api';


// Status config for display
const STATUS_CONFIG = {
    sent: { label: 'Sent', color: 'bg-green-50 text-green-700 border-green-200', icon: Send },
    schedule: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
    save: { label: 'Draft', color: 'bg-gray-50 text-gray-600 border-gray-200', icon: FileEdit },
    paused: { label: 'Paused', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Pause },
    sending: { label: 'Sending', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', icon: CircleDot },
};

const STATUS_FILTERS = [
    { value: 'sent', label: 'Sent' },
    { value: 'schedule', label: 'Scheduled' },
    { value: 'save', label: 'Draft' },
    { value: 'paused', label: 'Paused' },
    { value: 'all', label: 'All Statuses' },
];


// Column definitions for visibility toggle
const COLUMN_DEFS = [
    { key: 'campaign', label: 'Campaign', required: true },
    { key: 'status', label: 'Status', default: true },
    { key: 'audience', label: 'Audience', default: true },
    { key: 'segment', label: 'Segment / Tag', default: true },
    { key: 'send_time', label: 'Sent / Scheduled', default: true },
    { key: 'emails_sent', label: 'Emails Sent', default: true },
    { key: 'delivery', label: 'Delivery Rate', default: true },
    { key: 'opens', label: 'Open Rate', default: true },
    { key: 'clicks', label: 'Click Rate', default: true },
    { key: 'bounce', label: 'Bounce Rate', default: false },
    { key: 'unsubs', label: 'Unsubscribes', default: false },
    { key: 'archive', label: 'Archive', default: true },
    { key: 'region', label: 'Region', default: false },
];

const DEFAULT_VISIBLE = COLUMN_DEFS.filter(c => c.required || c.default).map(c => c.key);

// Sortable column header component
const SortableHeader = ({ label, field, currentSort, onSort, align = 'left' }) => {
    const isActive = currentSort.field === field;
    const Icon = isActive
        ? (currentSort.direction === 'asc' ? ChevronUp : ChevronDown)
        : ChevronsUpDown;

    return (
        <th
            className={`px-3 md:px-4 py-3 cursor-pointer hover:bg-gray-100/80 transition-colors select-none whitespace-nowrap text-xs font-semibold text-gray-500 uppercase tracking-wider ${align === 'right' ? 'text-right' : ''}`}
            onClick={() => onSort(field)}
        >
            <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
                <span>{label}</span>
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#007C89]' : 'text-gray-300'}`} />
            </div>
        </th>
    );
};


export default function CampaignList({ data, isExporting = false, audiences = [], selectedDays = 90, selectedRegion = null }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sort, setSort] = useState({ field: 'send_time', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('sent');
    const [visibleColumns, setVisibleColumns] = useState(() => {
        try {
            const saved = localStorage.getItem('campaign_visible_columns');
            if (saved) return JSON.parse(saved);
        } catch {}
        return DEFAULT_VISIBLE;
    });
    const [showColumnPicker, setShowColumnPicker] = useState(false);
    const columnPickerRef = React.useRef(null);
    const [extraCampaigns, setExtraCampaigns] = useState(null); // Non-sent campaigns loaded on demand
    const [loadingExtra, setLoadingExtra] = useState(false);
    const itemsPerPage = isExporting ? 9999 : 15;

    // Toggle column visibility
    const toggleColumn = (key) => {
        setVisibleColumns(prev => {
            const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
            localStorage.setItem('campaign_visible_columns', JSON.stringify(next));
            return next;
        });
    };

    const resetColumns = () => {
        setVisibleColumns(DEFAULT_VISIBLE);
        localStorage.setItem('campaign_visible_columns', JSON.stringify(DEFAULT_VISIBLE));
    };

    const isColVisible = (key) => visibleColumns.includes(key);

    // Close column picker on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (columnPickerRef.current && !columnPickerRef.current.contains(e.target)) {
                setShowColumnPicker(false);
            }
        };
        if (showColumnPicker) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showColumnPicker]);

    // Create a map of audience_id → member_count for quick lookup
    const audienceMemberMap = useMemo(() => {
        const map = {};
        audiences.forEach(aud => {
            if (aud && aud.id) {
                map[aud.id] = aud.member_count || 0;
            }
        });
        return map;
    }, [audiences]);

    // Reset to page 1 when data or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [data.length, searchTerm, statusFilter]);

    // Clear extra campaigns when region/days change
    useEffect(() => {
        setExtraCampaigns(null);
        if (statusFilter !== 'sent') {
            setStatusFilter('sent');
        }
    }, [selectedRegion, selectedDays]);

    // Fetch non-sent campaigns when status filter changes
    const loadCampaignsForStatus = useCallback(async (status) => {
        if (status === 'sent') {
            setExtraCampaigns(null);
            return;
        }
        setLoadingExtra(true);
        try {
            const result = await fetchCampaignList(selectedDays, selectedRegion, status);
            setExtraCampaigns(result.campaigns || []);
        } catch (e) {
            console.error('Failed to load campaigns:', e);
            setExtraCampaigns([]);
        } finally {
            setLoadingExtra(false);
        }
    }, [selectedDays, selectedRegion]);

    const handleStatusChange = (newStatus) => {
        setStatusFilter(newStatus);
        if (newStatus !== 'sent') {
            loadCampaignsForStatus(newStatus);
        } else {
            setExtraCampaigns(null);
        }
    };

    // Determine which dataset to use
    const baseData = useMemo(() => {
        if (statusFilter === 'sent') {
            // Add status field to existing dashboard data
            return data.map(c => ({ ...c, status: c.status || 'sent' }));
        }
        if (extraCampaigns !== null) {
            return extraCampaigns;
        }
        return [];
    }, [data, statusFilter, extraCampaigns]);

    // Handle sort
    const handleSort = (field) => {
        setSort(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
        setCurrentPage(1);
    };

    // Filter by search term
    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) return baseData;
        const term = searchTerm.toLowerCase().trim();
        return baseData.filter(c =>
            (c.title || '').toLowerCase().includes(term) ||
            (c.subject_line || '').toLowerCase().includes(term)
        );
    }, [baseData, searchTerm]);

    // Sort data
    const sortedData = useMemo(() => {
        return [...filteredData].sort((a, b) => {
            let aVal, bVal;

            switch (sort.field) {
                case 'send_time':
                    aVal = new Date(a.send_time || 0);
                    bVal = new Date(b.send_time || 0);
                    break;
                case 'title':
                    aVal = (a.title || '').toLowerCase();
                    bVal = (b.title || '').toLowerCase();
                    break;
                case 'emails_sent':
                    aVal = a.emails_sent || 0;
                    bVal = b.emails_sent || 0;
                    break;
                case 'open_rate':
                    aVal = a.open_rate || 0;
                    bVal = b.open_rate || 0;
                    break;
                case 'click_rate':
                    aVal = a.click_rate || 0;
                    bVal = b.click_rate || 0;
                    break;
                case 'bounce_rate':
                    aVal = a.emails_sent > 0 ? (a.bounces || 0) / a.emails_sent : 0;
                    bVal = b.emails_sent > 0 ? (b.bounces || 0) / b.emails_sent : 0;
                    break;
                case 'delivery_rate':
                    aVal = a.emails_sent > 0 ? (a.emails_sent - (a.bounces || 0)) / a.emails_sent : 0;
                    bVal = b.emails_sent > 0 ? (b.emails_sent - (b.bounces || 0)) / b.emails_sent : 0;
                    break;
                case 'unsubscribed':
                    aVal = a.unsubscribed || 0;
                    bVal = b.unsubscribed || 0;
                    break;
                case 'status':
                    aVal = a.status || '';
                    bVal = b.status || '';
                    break;
                default:
                    aVal = a[sort.field];
                    bVal = b[sort.field];
            }

            if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sort]);

    // Calculate pagination
    const totalItems = sortedData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = sortedData.slice(startIndex, endIndex);

    const goToPage = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    // CSV Export
    const handleExportCSV = () => {
        const headers = [
            'Campaign Title', 'Subject Line', 'Status', 'Audience', 'Segment/Tag',
            'Send Date', 'Emails Sent', 'Delivery Rate %', 'Open Rate %',
            'Click Rate %', 'Bounce Rate %', 'Unsubscribes', 'Archive URL', 'Region'
        ];

        const rows = sortedData.map(c => {
            const bounceRate = c.emails_sent > 0 ? ((c.bounces || 0) / c.emails_sent * 100) : 0;
            const deliveryRate = c.emails_sent > 0 ? ((c.emails_sent - (c.bounces || 0)) / c.emails_sent * 100) : 0;
            const statusLabel = STATUS_CONFIG[c.status]?.label || c.status || 'Sent';

            return [
                `"${(c.title || '').replace(/"/g, '""')}"`,
                `"${(c.subject_line || '').replace(/"/g, '""')}"`,
                statusLabel,
                `"${(c.audience_name || '').replace(/"/g, '""')}"`,
                `"${(c.segment_label || 'Full Audience').replace(/"/g, '""')}"`,
                c.send_time ? format(new Date(c.send_time), 'yyyy-MM-dd HH:mm') : '',
                c.emails_sent || 0,
                deliveryRate.toFixed(1),
                c.status === 'sent' ? ((c.open_rate || 0) * 100).toFixed(1) : '',
                c.status === 'sent' ? ((c.click_rate || 0) * 100).toFixed(1) : '',
                c.status === 'sent' ? bounceRate.toFixed(1) : '',
                c.status === 'sent' ? (c.unsubscribed || 0) : '',
                c.archive_url || '',
                c.region || ''
            ];
        });

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `campaigns_${statusFilter}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Check if we're showing non-sent campaigns (metrics will be N/A)
    const showMetrics = statusFilter === 'sent' || statusFilter === 'all';

    if (!data || data.length === 0) {
        if (statusFilter === 'sent') {
            return (
                <div className="bg-white rounded-xl shadow-layered border border-gray-100/50 p-8 text-center">
                    <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No campaigns found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or date range</p>
                </div>
            );
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-layered border border-gray-100/50 overflow-hidden">
            {/* Header with filters */}
            <div className="px-4 md:px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                            <Mail className="w-4 h-4 text-gray-500" />
                        </div>
                        <h3 className="section-title">Campaign List</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 tabular-nums">
                            {totalItems} campaign{totalItems !== 1 ? 's' : ''}
                            {totalPages > 1 && <span className="text-gray-400"> · Page {currentPage}/{totalPages}</span>}
                        </span>
                        {/* Export Button */}
                        <button
                            onClick={handleExportCSV}
                            disabled={totalItems === 0}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Export to CSV"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>

                        {/* Column Picker */}
                        <div className="relative" ref={columnPickerRef}>
                            <button
                                onClick={() => setShowColumnPicker(prev => !prev)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                                    showColumnPicker
                                        ? 'text-[#007C89] bg-[#007C89]/5 border-[#007C89]/30'
                                        : 'text-gray-600 bg-gray-50 hover:bg-gray-100 border-gray-200'
                                }`}
                                title="Choose columns"
                            >
                                <Settings2 className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Columns</span>
                                <span className="inline-flex items-center justify-center w-4.5 h-4.5 min-w-[18px] px-1 rounded-full bg-[#007C89] text-white text-[10px] font-bold leading-none tabular-nums">
                                    {visibleColumns.length}
                                </span>
                            </button>
                            {showColumnPicker && (
                                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                                    <div className="px-3 py-1.5 flex items-center justify-between border-b border-gray-100 mb-1">
                                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Show Columns</span>
                                        <button
                                            onClick={resetColumns}
                                            className="text-[10px] text-[#007C89] hover:underline font-medium"
                                        >
                                            Reset
                                        </button>
                                    </div>
                                    {COLUMN_DEFS.map(col => (
                                        <label
                                            key={col.key}
                                            className={`flex items-center gap-2.5 px-3 py-1.5 text-sm cursor-pointer transition-colors ${
                                                col.required ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={visibleColumns.includes(col.key)}
                                                disabled={col.required}
                                                onChange={() => !col.required && toggleColumn(col.key)}
                                                className="w-3.5 h-3.5 rounded border-gray-300 text-[#007C89] focus:ring-[#007C89]/20 accent-[#007C89]"
                                            />
                                            <span className="text-gray-700">{col.label}</span>
                                            {col.required && <span className="text-[10px] text-gray-400 ml-auto">Always on</span>}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter Row */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search campaigns..."
                            className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#007C89]/20 focus:border-[#007C89] transition-all outline-none"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                        {STATUS_FILTERS.map(sf => (
                            <button
                                key={sf.value}
                                onClick={() => handleStatusChange(sf.value)}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                    statusFilter === sf.value
                                        ? 'bg-[#007C89] text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                {sf.label}
                            </button>
                        ))}
                    </div>

                    <span className="text-xs text-gray-400 md:hidden bg-gray-100 px-2 py-1 rounded">← Scroll →</span>
                </div>
            </div>

            {/* Loading state for non-sent campaigns */}
            {loadingExtra && (
                <div className="px-6 py-8 text-center">
                    <div className="w-6 h-6 border-2 border-[#007C89] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Loading {STATUS_FILTERS.find(f => f.value === statusFilter)?.label || ''} campaigns...</p>
                </div>
            )}

            {/* Empty state */}
            {!loadingExtra && totalItems === 0 && (
                <div className="px-6 py-8 text-center">
                    <Mail className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                        {searchTerm
                            ? `No campaigns matching "${searchTerm}"`
                            : `No ${STATUS_FILTERS.find(f => f.value === statusFilter)?.label || ''} campaigns found`
                        }
                    </p>
                </div>
            )}

            {/* Table */}
            {!loadingExtra && totalItems > 0 && (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[1100px]">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <SortableHeader label="Campaign" field="title" currentSort={sort} onSort={handleSort} />
                                    {isColVisible('status') && <SortableHeader label="Status" field="status" currentSort={sort} onSort={handleSort} />}
                                    {isColVisible('audience') && <th className="px-3 md:px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-500 uppercase tracking-wider">Audience</th>}
                                    {isColVisible('segment') && <th className="px-3 md:px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-500 uppercase tracking-wider">Segment / Tag</th>}
                                    {isColVisible('send_time') && <SortableHeader label={statusFilter === 'schedule' ? 'Scheduled' : 'Sent'} field="send_time" currentSort={sort} onSort={handleSort} />}
                                    {isColVisible('emails_sent') && <SortableHeader label="Emails" field="emails_sent" currentSort={sort} onSort={handleSort} align="right" />}
                                    {isColVisible('delivery') && <SortableHeader label="Delivery" field="delivery_rate" currentSort={sort} onSort={handleSort} align="right" />}
                                    {isColVisible('opens') && <SortableHeader label="Opens" field="open_rate" currentSort={sort} onSort={handleSort} align="right" />}
                                    {isColVisible('clicks') && <SortableHeader label="Clicks" field="click_rate" currentSort={sort} onSort={handleSort} align="right" />}
                                    {isColVisible('bounce') && <SortableHeader label="Bounce" field="bounce_rate" currentSort={sort} onSort={handleSort} align="right" />}
                                    {isColVisible('unsubs') && <SortableHeader label="Unsubs" field="unsubscribed" currentSort={sort} onSort={handleSort} align="right" />}
                                    {isColVisible('archive') && <th className="px-3 md:px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-500 uppercase tracking-wider">Archive</th>}
                                    {isColVisible('region') && <th className="px-3 md:px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-500 uppercase tracking-wider">Region</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {currentData.map((campaign) => {
                                    const isSent = campaign.status === 'sent';
                                    const bounceRate = campaign.emails_sent > 0
                                        ? ((campaign.bounces || 0) / campaign.emails_sent * 100)
                                        : 0;
                                    const delivered = campaign.emails_sent - (campaign.bounces || 0);
                                    const deliveryRate = campaign.emails_sent > 0
                                        ? (delivered / campaign.emails_sent * 100)
                                        : 0;

                                    const segmentLabel = campaign.segment_label || null;
                                    const segmentMemberCount = campaign.segment_member_count || null;
                                    const audienceMemberCount = campaign.audience_id ? audienceMemberMap[campaign.audience_id] : null;
                                    const totalForCoverage = segmentMemberCount || audienceMemberCount;
                                    const coveragePercent = totalForCoverage && totalForCoverage > 0
                                        ? ((campaign.emails_sent / totalForCoverage) * 100)
                                        : null;
                                    const hasSegmentCoverage = (segmentMemberCount && segmentMemberCount > 0) ||
                                        (audienceMemberCount && audienceMemberCount > 0 && coveragePercent && coveragePercent < 95);

                                    const statusInfo = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.sent;
                                    const StatusIcon = statusInfo.icon;

                                    return (
                                        <tr
                                            key={`${campaign.id}-${campaign.region || ''}`}
                                            className="hover:bg-blue-50/50 transition-colors bg-white"
                                        >
                                            {/* Campaign Title */}
                                            <td className="px-3 md:px-4 py-3">
                                                {(() => {
                                                    const displayTitle = (campaign.title && campaign.title.trim()) ? campaign.title : campaign.subject_line;
                                                    const showSubject = campaign.subject_line && campaign.title && campaign.title.trim() && campaign.subject_line !== campaign.title;
                                                    return (
                                                        <div className="min-w-0 flex-1">
                                                            {campaign.archive_url ? (
                                                                <a
                                                                    href={campaign.archive_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="group block"
                                                                    title={`${displayTitle} - Click to view campaign`}
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-semibold text-gray-900 group-hover:text-[#007C89] text-sm truncate max-w-[200px] transition-colors">
                                                                            {displayTitle}
                                                                        </span>
                                                                        <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-[#007C89] transition-colors flex-shrink-0" />
                                                                    </div>
                                                                    {showSubject && (
                                                                        <div className="text-xs text-gray-400 truncate max-w-[220px]" title={campaign.subject_line}>
                                                                            {campaign.subject_line}
                                                                        </div>
                                                                    )}
                                                                </a>
                                                            ) : (
                                                                <div>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="font-semibold text-gray-900 text-sm truncate max-w-[200px]" title={displayTitle}>
                                                                            {displayTitle}
                                                                        </span>
                                                                    </div>
                                                                    {showSubject && (
                                                                        <div className="text-xs text-gray-400 truncate max-w-[220px]" title={campaign.subject_line}>
                                                                            {campaign.subject_line}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>

                                            {/* Status */}
                                            {isColVisible('status') && (
                                            <td className="px-3 md:px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${statusInfo.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {statusInfo.label}
                                                </span>
                                            </td>
                                            )}

                                            {/* Audience */}
                                            {isColVisible('audience') && (
                                            <td className="px-3 md:px-4 py-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                    {campaign.audience_name || 'N/A'}
                                                </span>
                                            </td>
                                            )}

                                            {/* Segment / Tag */}
                                            {isColVisible('segment') && (
                                            <td className="px-3 md:px-4 py-3">
                                                {segmentLabel ? (() => {
                                                    const isTag = campaign.segment_type === 'static';
                                                    return (
                                                        <div>
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                                                                isTag
                                                                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                                                    : 'bg-purple-50 text-purple-700 border border-purple-100'
                                                            }`}>
                                                                {isTag
                                                                    ? <Tag className="w-3 h-3 flex-shrink-0" />
                                                                    : <Filter className="w-3 h-3 flex-shrink-0" />
                                                                }
                                                                <span className="truncate max-w-[150px]" title={segmentLabel}>{segmentLabel}</span>
                                                            </span>
                                                            <div className="text-[10px] text-gray-400 mt-0.5 pl-0.5">
                                                                {isTag ? 'Tag' : 'Segment'}
                                                            </div>
                                                        </div>
                                                    );
                                                })() : (
                                                    <span className="text-xs text-gray-400">Full Audience</span>
                                                )}
                                            </td>
                                            )}

                                            {/* Send Time / Scheduled Time */}
                                            {isColVisible('send_time') && (
                                            <td className="px-3 md:px-4 py-3 text-gray-600 tabular-nums text-sm">
                                                {campaign.send_time ? (
                                                    <>
                                                        <div>{format(new Date(campaign.send_time), 'MMM dd')}</div>
                                                        <div className="text-xs text-gray-400">{format(new Date(campaign.send_time), 'HH:mm')}</div>
                                                        {campaign.status === 'schedule' && (
                                                            <div className="text-[10px] text-blue-500 font-medium mt-0.5">Scheduled</div>
                                                        )}
                                                    </>
                                                ) : campaign.create_time ? (
                                                    <>
                                                        <div className="text-gray-400">{format(new Date(campaign.create_time), 'MMM dd')}</div>
                                                        <div className="text-[10px] text-gray-400">Created</div>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            )}

                                            {/* Emails Sent */}
                                            {isColVisible('emails_sent') && (
                                            <td className="px-3 md:px-4 py-3 text-right">
                                                {isSent ? (
                                                    <>
                                                        <div className="font-semibold text-gray-900 tabular-nums">
                                                            {campaign.emails_sent?.toLocaleString() || 0}
                                                        </div>
                                                        {hasSegmentCoverage && totalForCoverage && (
                                                            <div className="text-xs text-gray-400 tabular-nums">
                                                                of {totalForCoverage.toLocaleString()}
                                                                <span className="text-purple-500 ml-1">({coveragePercent.toFixed(1)}%)</span>
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            )}

                                            {/* Delivery Rate */}
                                            {isColVisible('delivery') && (
                                            <td className="px-3 md:px-4 py-3 text-right">
                                                {isSent ? (
                                                    <>
                                                        <div className="font-semibold text-gray-900 tabular-nums">{deliveryRate.toFixed(1)}%</div>
                                                        <div className="text-xs text-gray-400 tabular-nums">{delivered.toLocaleString()}</div>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            )}

                                            {/* Open Rate */}
                                            {isColVisible('opens') && (
                                            <td className="px-3 md:px-4 py-3 text-right">
                                                {isSent ? (
                                                    <>
                                                        <div className="font-semibold text-gray-900 tabular-nums">{(campaign.open_rate * 100).toFixed(1)}%</div>
                                                        <div className="text-xs text-gray-400 tabular-nums">{campaign.opens?.toLocaleString()}</div>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            )}

                                            {/* Click Rate */}
                                            {isColVisible('clicks') && (
                                            <td className="px-3 md:px-4 py-3 text-right">
                                                {isSent ? (
                                                    <>
                                                        <div className="font-semibold text-gray-900 tabular-nums">{(campaign.click_rate * 100).toFixed(1)}%</div>
                                                        <div className="text-xs text-gray-400 tabular-nums">{campaign.clicks?.toLocaleString()}</div>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            )}

                                            {/* Bounce Rate */}
                                            {isColVisible('bounce') && (
                                            <td className="px-3 md:px-4 py-3 text-right">
                                                {isSent ? (
                                                    <span className={`font-semibold tabular-nums ${bounceRate > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                                                        {bounceRate.toFixed(1)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            )}

                                            {/* Unsubscribes */}
                                            {isColVisible('unsubs') && (
                                            <td className="px-3 md:px-4 py-3 text-right">
                                                {isSent ? (
                                                    <span className={`font-semibold tabular-nums ${(campaign.unsubscribed || 0) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                                        {campaign.unsubscribed?.toLocaleString() || 0}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                            )}

                                            {/* Archive */}
                                            {isColVisible('archive') && (
                                            <td className="px-3 md:px-4 py-3">
                                                {campaign.archive_url ? (
                                                    <a
                                                        href={campaign.archive_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                                                        title={campaign.archive_url}
                                                    >
                                                        <Archive className="w-3 h-3" />
                                                        View
                                                    </a>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200">
                                                        <EyeOff className="w-3 h-3" />
                                                        Off
                                                    </span>
                                                )}
                                            </td>
                                            )}

                                            {/* Region */}
                                            {isColVisible('region') && (
                                            <td className="px-3 md:px-4 py-3">
                                                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                                    {(campaign.region || '').toUpperCase()}
                                                </span>
                                            </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && !isExporting && (
                        <div className="px-4 md:px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="text-sm text-gray-500 tabular-nums">
                                Showing <span className="font-medium text-gray-700">{startIndex + 1}-{Math.min(endIndex, totalItems)}</span> of <span className="font-medium text-gray-700">{totalItems}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                        if (
                                            page === 1 ||
                                            page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => goToPage(page)}
                                                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                                                        page === currentPage
                                                            ? 'bg-[#007C89] text-white shadow-sm'
                                                            : 'text-gray-600 hover:bg-white border border-transparent hover:border-gray-200'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        } else if (
                                            page === currentPage - 2 ||
                                            page === currentPage + 2
                                        ) {
                                            return <span key={page} className="px-1 text-gray-300">···</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
