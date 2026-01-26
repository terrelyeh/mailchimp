import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ExternalLink, ChevronLeft, ChevronRight, Users, ChevronUp, ChevronDown, ChevronsUpDown, Mail } from 'lucide-react';

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

// Rate badge component for visual consistency
const RateBadge = ({ value, threshold, invertWarning = false, suffix = '%' }) => {
    const numValue = parseFloat(value);
    const isWarning = invertWarning ? numValue < threshold : numValue > threshold;

    return (
        <span className={`font-semibold tabular-nums ${isWarning ? 'text-red-600' : 'text-gray-900'}`}>
            {value}{suffix}
        </span>
    );
};

export default function CampaignList({ data, isExporting = false, audiences = [] }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sort, setSort] = useState({ field: 'send_time', direction: 'desc' });
    const itemsPerPage = isExporting ? data.length : 15; // Show all when exporting

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

    // Reset to page 1 when data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [data.length]);

    // Handle sort
    const handleSort = (field) => {
        setSort(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
        setCurrentPage(1);
    };

    // Sort data
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            let aVal, bVal;

            switch (sort.field) {
                case 'send_time':
                    aVal = new Date(a.send_time);
                    bVal = new Date(b.send_time);
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
                default:
                    aVal = a[sort.field];
                    bVal = b[sort.field];
            }

            if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sort]);

    // Calculate pagination
    const totalItems = sortedData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = sortedData.slice(startIndex, endIndex);

    const goToPage = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-layered border border-gray-100/50 p-8 text-center">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No campaigns found</p>
                <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or date range</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-layered border border-gray-100/50 overflow-hidden">
            {/* Header */}
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                        <Mail className="w-4 h-4 text-gray-500" />
                    </div>
                    <h3 className="section-title">Recent Campaigns</h3>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 md:hidden bg-gray-100 px-2 py-1 rounded">← Scroll →</span>
                    <span className="text-sm text-gray-500 tabular-nums">
                        {totalItems} campaign{totalItems !== 1 ? 's' : ''}
                        {totalPages > 1 && <span className="text-gray-400"> · Page {currentPage} of {totalPages}</span>}
                    </span>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[900px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <SortableHeader label="Campaign" field="title" currentSort={sort} onSort={handleSort} />
                            <th className="px-3 md:px-4 py-3 whitespace-nowrap text-xs font-semibold text-gray-500 uppercase tracking-wider">Audience</th>
                            <SortableHeader label="Sent" field="send_time" currentSort={sort} onSort={handleSort} />
                            <SortableHeader label="Emails" field="emails_sent" currentSort={sort} onSort={handleSort} align="right" />
                            <SortableHeader label="Delivery" field="delivery_rate" currentSort={sort} onSort={handleSort} align="right" />
                            <SortableHeader label="Opens" field="open_rate" currentSort={sort} onSort={handleSort} align="right" />
                            <SortableHeader label="Clicks" field="click_rate" currentSort={sort} onSort={handleSort} align="right" />
                            <SortableHeader label="Bounce" field="bounce_rate" currentSort={sort} onSort={handleSort} align="right" />
                            <SortableHeader label="Unsubs" field="unsubscribed" currentSort={sort} onSort={handleSort} align="right" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {currentData.map((campaign, idx) => {
                            const bounceRate = campaign.emails_sent > 0
                                ? ((campaign.bounces || 0) / campaign.emails_sent * 100)
                                : 0;
                            const delivered = campaign.emails_sent - (campaign.bounces || 0);
                            const deliveryRate = campaign.emails_sent > 0
                                ? (delivered / campaign.emails_sent * 100)
                                : 0;

                            const segmentName = campaign.segment_text && !campaign.segment_text.startsWith('<')
                                ? campaign.segment_text
                                : null;

                            // Get audience total member count for segment coverage calculation
                            const audienceMemberCount = campaign.audience_id ? audienceMemberMap[campaign.audience_id] : null;

                            // Show coverage info if:
                            // 1. We have a segment name, OR
                            // 2. emails_sent is less than 95% of audience size (indicates segment/filter was used)
                            const coveragePercent = audienceMemberCount && audienceMemberCount > 0
                                ? ((campaign.emails_sent / audienceMemberCount) * 100)
                                : null;
                            const hasSegmentCoverage = audienceMemberCount && audienceMemberCount > 0 &&
                                (segmentName || (coveragePercent && coveragePercent < 95));

                            return (
                                <tr
                                    key={campaign.id}
                                    className="hover:bg-blue-50/50 transition-colors bg-white"
                                >
                                    {/* Campaign Title */}
                                    <td className="px-3 md:px-4 py-3">
                                        <div className="min-w-0 flex-1">
                                            {campaign.archive_url ? (
                                                <a
                                                    href={campaign.archive_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="group block"
                                                    title={`${campaign.title} - Click to view campaign`}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-gray-900 group-hover:text-[#007C89] text-sm truncate max-w-[200px] transition-colors">
                                                            {campaign.title}
                                                        </span>
                                                        <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-[#007C89] transition-colors flex-shrink-0" />
                                                    </div>
                                                    <div className="text-xs text-gray-400 truncate max-w-[220px]" title={campaign.subject_line}>
                                                        {campaign.subject_line}
                                                    </div>
                                                </a>
                                            ) : (
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-semibold text-gray-900 text-sm truncate max-w-[200px]" title={campaign.title}>
                                                            {campaign.title}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-400 truncate max-w-[220px]" title={campaign.subject_line}>
                                                        {campaign.subject_line}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Audience */}
                                    <td className="px-3 md:px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                            {campaign.audience_name || 'N/A'}
                                        </span>
                                        {segmentName && (
                                            <div className="flex items-center gap-1 text-xs text-purple-600 mt-1">
                                                <Users className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate max-w-[100px]" title={segmentName}>{segmentName}</span>
                                            </div>
                                        )}
                                    </td>

                                    {/* Send Time */}
                                    <td className="px-3 md:px-4 py-3 text-gray-600 tabular-nums text-sm">
                                        <div>{format(new Date(campaign.send_time), 'MMM dd')}</div>
                                        <div className="text-xs text-gray-400">{format(new Date(campaign.send_time), 'HH:mm')}</div>
                                    </td>

                                    {/* Emails Sent */}
                                    <td className="px-3 md:px-4 py-3 text-right">
                                        <div className="font-semibold text-gray-900 tabular-nums">
                                            {campaign.emails_sent?.toLocaleString() || 0}
                                        </div>
                                        {hasSegmentCoverage && (
                                            <div className="text-xs text-gray-400 tabular-nums">
                                                of {audienceMemberCount.toLocaleString()}
                                                <span className="text-purple-500 ml-1">({coveragePercent.toFixed(1)}%)</span>
                                            </div>
                                        )}
                                    </td>

                                    {/* Delivery Rate */}
                                    <td className="px-3 md:px-4 py-3 text-right">
                                        <div className="font-semibold text-gray-900 tabular-nums">{deliveryRate.toFixed(1)}%</div>
                                        <div className="text-xs text-gray-400 tabular-nums">{delivered.toLocaleString()}</div>
                                    </td>

                                    {/* Open Rate */}
                                    <td className="px-3 md:px-4 py-3 text-right">
                                        <div className="font-semibold text-gray-900 tabular-nums">{(campaign.open_rate * 100).toFixed(1)}%</div>
                                        <div className="text-xs text-gray-400 tabular-nums">{campaign.opens?.toLocaleString()}</div>
                                    </td>

                                    {/* Click Rate */}
                                    <td className="px-3 md:px-4 py-3 text-right">
                                        <div className="font-semibold text-gray-900 tabular-nums">{(campaign.click_rate * 100).toFixed(1)}%</div>
                                        <div className="text-xs text-gray-400 tabular-nums">{campaign.clicks?.toLocaleString()}</div>
                                    </td>

                                    {/* Bounce Rate */}
                                    <td className="px-3 md:px-4 py-3 text-right">
                                        <span className={`font-semibold tabular-nums ${bounceRate > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                                            {bounceRate.toFixed(1)}%
                                        </span>
                                    </td>

                                    {/* Unsubscribes */}
                                    <td className="px-3 md:px-4 py-3 text-right">
                                        <span className={`font-semibold tabular-nums ${(campaign.unsubscribed || 0) > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                            {campaign.unsubscribed?.toLocaleString() || 0}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination - hidden when exporting */}
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
                            title="Previous page"
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
                            title="Next page"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
