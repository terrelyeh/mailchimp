import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { ExternalLink, ChevronLeft, ChevronRight, Users, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// Sortable column header component
const SortableHeader = ({ label, field, currentSort, onSort, align = 'left' }) => {
    const isActive = currentSort.field === field;
    const Icon = isActive
        ? (currentSort.direction === 'asc' ? ChevronUp : ChevronDown)
        : ChevronsUpDown;

    return (
        <th
            className={`px-2 md:px-4 py-2 cursor-pointer hover:bg-gray-100 transition-colors select-none whitespace-nowrap text-xs font-semibold text-gray-600 uppercase tracking-wide ${align === 'right' ? 'text-right' : ''}`}
            onClick={() => onSort(field)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                <span>{label}</span>
                <Icon className={`w-3 h-3 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
            </div>
        </th>
    );
};

export default function CampaignList({ data }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sort, setSort] = useState({ field: 'send_time', direction: 'desc' });
    const itemsPerPage = 10;

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
        setCurrentPage(1); // Reset to first page when sorting
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

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 md:px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-baseline gap-3">
                    <h3 className="font-bold text-gray-900 text-base md:text-lg">Recent Campaigns</h3>
                    <span className="text-xs text-gray-400">
                        {totalItems} campaign{totalItems !== 1 ? 's' : ''}
                        {totalPages > 1 && ` • Page ${currentPage}/${totalPages}`}
                    </span>
                </div>
                <span className="text-xs text-gray-400 md:hidden">← Scroll →</span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-500 min-w-[800px]">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <SortableHeader label="Campaign" field="title" currentSort={sort} onSort={handleSort} />
                            <th className="px-2 md:px-4 py-2 whitespace-nowrap text-xs font-semibold text-gray-600 uppercase tracking-wide">Audience</th>
                            <SortableHeader label="Sent Time" field="send_time" currentSort={sort} onSort={handleSort} />
                            <SortableHeader label="Total Sent" field="emails_sent" currentSort={sort} onSort={handleSort} align="right" />
                            <SortableHeader label="Delivery Rate" field="delivery_rate" currentSort={sort} onSort={handleSort} align="right" />
                            <SortableHeader label="Open Rate" field="open_rate" currentSort={sort} onSort={handleSort} align="right" />
                            <SortableHeader label="Click Rate" field="click_rate" currentSort={sort} onSort={handleSort} align="right" />
                            <SortableHeader label="Bounce Rate" field="bounce_rate" currentSort={sort} onSort={handleSort} align="right" />
                            <SortableHeader label="Unsubs" field="unsubscribed" currentSort={sort} onSort={handleSort} align="right" />
                        </tr>
                    </thead>
                    <tbody>
                        {currentData.map((campaign) => {
                            const bounceRate = campaign.emails_sent > 0
                                ? ((campaign.bounces || 0) / campaign.emails_sent * 100)
                                : 0;
                            const delivered = campaign.emails_sent - (campaign.bounces || 0);
                            const deliveryRate = campaign.emails_sent > 0
                                ? (delivered / campaign.emails_sent * 100)
                                : 0;

                            // Filter out HTML content from segment_text
                            const segmentName = campaign.segment_text && !campaign.segment_text.startsWith('<')
                                ? campaign.segment_text
                                : null;

                            return (
                            <tr key={campaign.id} className="hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0">
                                <td className="px-2 md:px-4 py-2.5 md:py-3">
                                    <div className="flex items-center group cursor-pointer">
                                        <span className="font-semibold text-gray-900 text-sm">{campaign.title}</span>
                                        <a href={campaign.archive_url} target="_blank" rel="noreferrer" className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ExternalLink className="w-3 h-3 text-gray-400" />
                                        </a>
                                    </div>
                                    <div className="text-xs text-gray-400 truncate max-w-[220px]">{campaign.subject_line}</div>
                                </td>
                                <td className="px-2 md:px-4 py-2.5 md:py-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                        {campaign.audience_name || 'N/A'}
                                    </span>
                                    {segmentName && (
                                        <div className="flex items-center gap-1 text-xs text-purple-600 mt-0.5">
                                            <Users className="w-3 h-3" />
                                            <span className="truncate max-w-[120px]" title={segmentName}>{segmentName}</span>
                                        </div>
                                    )}
                                </td>
                                <td className="px-2 md:px-4 py-2.5 md:py-3 text-gray-600">
                                    {format(new Date(campaign.send_time), 'MMM dd, HH:mm')}
                                </td>
                                <td className="px-2 md:px-4 py-2.5 md:py-3 text-right">
                                    <span className="font-semibold text-gray-900">{campaign.emails_sent?.toLocaleString() || 0}</span>
                                </td>
                                <td className="px-2 md:px-4 py-2.5 md:py-3 text-right">
                                    <span className="font-semibold text-gray-900">{deliveryRate.toFixed(1)}%</span>
                                    <div className="text-xs text-gray-400">{delivered.toLocaleString()}</div>
                                </td>
                                <td className="px-2 md:px-4 py-2.5 md:py-3 text-right">
                                    <span className="font-semibold text-gray-900">{(campaign.open_rate * 100).toFixed(1)}%</span>
                                    <div className="text-xs text-gray-400">{campaign.opens?.toLocaleString()}</div>
                                </td>
                                <td className="px-2 md:px-4 py-2.5 md:py-3 text-right">
                                    <span className="font-semibold text-gray-900">{(campaign.click_rate * 100).toFixed(1)}%</span>
                                    <div className="text-xs text-gray-400">{campaign.clicks?.toLocaleString()}</div>
                                </td>
                                <td className="px-2 md:px-4 py-2.5 md:py-3 text-right">
                                    <span className={`font-semibold ${bounceRate > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {bounceRate.toFixed(1)}%
                                    </span>
                                </td>
                                <td className="px-2 md:px-4 py-2.5 md:py-3 text-right">
                                    <span className={`font-semibold ${(campaign.unsubscribed || 0) > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                                        {campaign.unsubscribed?.toLocaleString() || 0}
                                    </span>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                        {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                // Show first page, last page, current page, and pages around current
                                if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 && page <= currentPage + 1)
                                ) {
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => goToPage(page)}
                                            className={`px-3 py-1 rounded-md text-sm font-medium ${
                                                page === currentPage
                                                    ? 'bg-blue-600 text-white'
                                                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                } else if (
                                    page === currentPage - 2 ||
                                    page === currentPage + 2
                                ) {
                                    return <span key={page} className="px-2 text-gray-400">...</span>;
                                }
                                return null;
                            })}
                        </div>

                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
