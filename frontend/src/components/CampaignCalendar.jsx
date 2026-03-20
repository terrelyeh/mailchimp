import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Send, Clock, FileEdit, Pause, CircleDot, ExternalLink, X, Users, Globe } from 'lucide-react';
import { fetchCampaignList } from '../api';

// Status config matching CampaignList
const STATUS_CONFIG = {
    sent: { label: 'Sent', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50 border-emerald-200', icon: Send },
    schedule: { label: 'Scheduled', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50 border-blue-200', icon: Clock },
    save: { label: 'Draft', color: 'bg-gray-400', textColor: 'text-gray-600', bgLight: 'bg-gray-50 border-gray-200', icon: FileEdit },
    paused: { label: 'Paused', color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50 border-amber-200', icon: Pause },
    sending: { label: 'Sending', color: 'bg-cyan-500', textColor: 'text-cyan-700', bgLight: 'bg-cyan-50 border-cyan-200', icon: CircleDot },
};

const REGION_COLORS = {
    US: 'bg-indigo-100 text-indigo-700',
    EU: 'bg-teal-100 text-teal-700',
    APAC: 'bg-orange-100 text-orange-700',
    JP: 'bg-rose-100 text-rose-700',
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CampaignCalendar({ data = [], selectedDays = 90, selectedRegion = null, regions = [] }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [allCampaigns, setAllCampaigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDay, setSelectedDay] = useState(null);
    const [popoverPos, setPopoverPos] = useState(null);
    const [calendarRegion, setCalendarRegion] = useState(selectedRegion); // Internal region for calendar
    const popoverRef = useRef(null);
    const calendarRef = useRef(null);

    // Sync with parent's selectedRegion when it changes
    useEffect(() => {
        setCalendarRegion(selectedRegion);
    }, [selectedRegion]);

    // The effective region used for fetching
    const effectiveRegion = calendarRegion;

    // Fetch all-status campaigns
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const result = await fetchCampaignList(selectedDays, effectiveRegion, 'all');
                if (!cancelled) {
                    setAllCampaigns(result.campaigns || []);
                }
            } catch (e) {
                console.error('Failed to load calendar campaigns:', e);
                if (!cancelled) {
                    // Fallback to sent data from props
                    setAllCampaigns(data.map(c => ({ ...c, status: c.status || 'sent' })));
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [selectedDays, effectiveRegion, data]);

    // Group campaigns by date
    const campaignsByDate = useMemo(() => {
        const map = {};
        const campaignsToUse = allCampaigns.length > 0 ? allCampaigns : data.map(c => ({ ...c, status: c.status || 'sent' }));

        campaignsToUse.forEach(c => {
            const dateStr = c.send_time || c.create_time;
            if (!dateStr) return;
            const dayKey = format(new Date(dateStr), 'yyyy-MM-dd');
            if (!map[dayKey]) map[dayKey] = [];
            map[dayKey].push(c);
        });
        return map;
    }, [allCampaigns, data]);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
        const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days = [];
        let day = calStart;
        while (day <= calEnd) {
            days.push(day);
            day = addDays(day, 1);
        }
        return days;
    }, [currentMonth]);

    // Close popover on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setSelectedDay(null);
            }
        };
        if (selectedDay) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selectedDay]);

    // Stats for current month
    const monthStats = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        let sent = 0, scheduled = 0, draft = 0;

        Object.entries(campaignsByDate).forEach(([dateStr, campaigns]) => {
            const d = new Date(dateStr);
            if (d >= monthStart && d <= monthEnd) {
                campaigns.forEach(c => {
                    if (c.status === 'sent') sent++;
                    else if (c.status === 'schedule') scheduled++;
                    else if (c.status === 'save') draft++;
                });
            }
        });
        return { sent, scheduled, draft, total: sent + scheduled + draft };
    }, [campaignsByDate, currentMonth]);

    const handleDayClick = (day, event) => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const campaigns = campaignsByDate[dayKey];
        if (!campaigns || campaigns.length === 0) {
            setSelectedDay(null);
            return;
        }

        // Calculate popover position relative to calendar container
        if (calendarRef.current) {
            const calRect = calendarRef.current.getBoundingClientRect();
            const cellRect = event.currentTarget.getBoundingClientRect();
            const left = cellRect.left - calRect.left + cellRect.width / 2;
            const top = cellRect.bottom - calRect.top + 4;
            setPopoverPos({ left, top });
        }

        setSelectedDay(isSameDay(selectedDay, day) ? null : day);
    };

    return (
        <div className="bg-white rounded-xl shadow-layered border border-gray-100/50 overflow-hidden">
            {/* Header */}
            <div className="px-4 md:px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
                            <Calendar className="w-4 h-4 text-gray-500" />
                        </div>
                        <h3 className="section-title">Campaign Calendar</h3>
                    </div>

                    {/* Month navigation */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setCurrentMonth(new Date())}
                            className="px-4 py-1.5 text-base font-bold text-gray-800 hover:bg-gray-50 rounded-lg transition-colors min-w-[160px] text-center"
                        >
                            {format(currentMonth, 'MMMM yyyy')}
                        </button>
                        <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Region quick-switch — only in All Regions view */}
                {!selectedRegion && regions.length > 1 && (
                    <div className="flex items-center gap-1.5 mb-3">
                        <button
                            onClick={() => setCalendarRegion(null)}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                                calendarRegion === null
                                    ? 'bg-[#007C89] text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                            }`}
                        >
                            <Globe className="w-3 h-3" />
                            All
                        </button>
                        {regions.map(r => (
                            <button
                                key={r.code}
                                onClick={() => setCalendarRegion(r.code)}
                                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                                    calendarRegion === r.code
                                        ? 'bg-[#007C89] text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                                }`}
                            >
                                <span className="text-sm leading-none">{r.flag}</span>
                                {r.code}
                            </button>
                        ))}
                    </div>
                )}

                {/* Month stats */}
                <div className="flex items-center gap-5 text-sm">
                    <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span className="text-gray-600"><span className="font-semibold text-gray-800 tabular-nums">{monthStats.sent}</span> Sent</span>
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                        <span className="text-gray-600"><span className="font-semibold text-gray-800 tabular-nums">{monthStats.scheduled}</span> Scheduled</span>
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                        <span className="text-gray-600"><span className="font-semibold text-gray-800 tabular-nums">{monthStats.draft}</span> Draft</span>
                    </span>
                    {loading && (
                        <span className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <div className="w-3.5 h-3.5 border-2 border-[#007C89] border-t-transparent rounded-full animate-spin" />
                            Loading...
                        </span>
                    )}
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="relative p-2 md:p-4" ref={calendarRef}>
                {/* Weekday headers */}
                <div className="grid grid-cols-7 mb-1">
                    {WEEKDAYS.map(day => (
                        <div key={day} className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider py-2.5">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
                    {calendarDays.map((day, i) => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const campaigns = campaignsByDate[dayKey] || [];
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isSelected = selectedDay && isSameDay(day, selectedDay);
                        const today = isToday(day);

                        return (
                            <div
                                key={i}
                                onClick={(e) => handleDayClick(day, e)}
                                className={`min-h-[90px] md:min-h-[110px] p-2 transition-colors ${
                                    isCurrentMonth ? 'bg-white' : 'bg-gray-50/70'
                                } ${campaigns.length > 0 ? 'cursor-pointer hover:bg-blue-50/50' : ''} ${
                                    isSelected ? 'ring-2 ring-[#007C89] ring-inset' : ''
                                }`}
                            >
                                {/* Day number */}
                                <div className={`text-sm font-semibold mb-1.5 ${
                                    today
                                        ? 'w-7 h-7 rounded-full bg-[#007C89] text-white flex items-center justify-center text-xs'
                                        : isCurrentMonth ? 'text-gray-800 pl-0.5' : 'text-gray-300 pl-0.5'
                                }`}>
                                    {format(day, 'd')}
                                </div>

                                {/* Campaign pills */}
                                <div className="space-y-1">
                                    {campaigns.slice(0, 3).map((c, j) => {
                                        const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.sent;
                                        return (
                                            <div
                                                key={j}
                                                className={`flex items-center gap-1 px-1.5 py-1 rounded text-[11px] leading-tight font-medium truncate ${status.color} text-white`}
                                                title={`${c.title || c.subject_line} (${status.label})`}
                                            >
                                                <span className="truncate">{c.title || c.subject_line || 'Untitled'}</span>
                                            </div>
                                        );
                                    })}
                                    {campaigns.length > 3 && (
                                        <div className="text-xs text-gray-500 font-medium pl-1">
                                            +{campaigns.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Day detail popover */}
                {selectedDay && popoverPos && (() => {
                    const dayKey = format(selectedDay, 'yyyy-MM-dd');
                    const campaigns = campaignsByDate[dayKey] || [];
                    if (campaigns.length === 0) return null;

                    // Ensure popover stays within bounds
                    const maxLeft = popoverPos.left > 500 ? popoverPos.left - 280 : popoverPos.left - 140;

                    return (
                        <div
                            ref={popoverRef}
                            className="absolute z-50 w-[320px] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
                            style={{
                                left: Math.max(8, maxLeft),
                                top: popoverPos.top,
                            }}
                        >
                            {/* Popover header */}
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-800">
                                    {format(selectedDay, 'EEEE, MMM d')}
                                </span>
                                <button
                                    onClick={() => setSelectedDay(null)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Campaign list */}
                            <div className="max-h-[300px] overflow-y-auto divide-y divide-gray-100">
                                {campaigns.map((c, j) => {
                                    const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.sent;
                                    const StatusIcon = status.icon;
                                    const isSent = c.status === 'sent';

                                    return (
                                        <div key={j} className="px-4 py-3.5 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <div className="min-w-0 flex-1">
                                                    {c.archive_url ? (
                                                        <a
                                                            href={c.archive_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-sm font-semibold text-gray-900 hover:text-[#007C89] transition-colors flex items-center gap-1"
                                                        >
                                                            <span className="truncate">{c.title || c.subject_line || 'Untitled'}</span>
                                                            <ExternalLink className="w-3 h-3 flex-shrink-0 text-gray-300" />
                                                        </a>
                                                    ) : (
                                                        <div className="text-sm font-semibold text-gray-900 truncate">
                                                            {c.title || c.subject_line || 'Untitled'}
                                                        </div>
                                                    )}
                                                    {c.subject_line && c.title && c.subject_line !== c.title && (
                                                        <div className="text-xs text-gray-400 truncate mt-0.5">{c.subject_line}</div>
                                                    )}
                                                </div>
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border flex-shrink-0 ${status.bgLight} ${status.textColor}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {status.label}
                                                </span>
                                            </div>

                                            {/* Meta info */}
                                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                                {c.region && (
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${REGION_COLORS[c.region?.toUpperCase()] || 'bg-gray-100 text-gray-600'}`}>
                                                        {c.region.toUpperCase()}
                                                    </span>
                                                )}
                                                {c.audience_name && (
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-3 h-3" />
                                                        {c.audience_name}
                                                    </span>
                                                )}
                                                {c.send_time && (
                                                    <span>{format(new Date(c.send_time), 'HH:mm')}</span>
                                                )}
                                            </div>

                                            {/* Performance metrics for sent campaigns */}
                                            {isSent && c.emails_sent > 0 && (
                                                <div className="flex items-center gap-3 mt-2 text-xs">
                                                    <span className="text-gray-500">
                                                        <span className="font-semibold text-gray-700 tabular-nums">{c.emails_sent?.toLocaleString()}</span> sent
                                                    </span>
                                                    {c.open_rate != null && (
                                                        <span className="text-gray-500">
                                                            <span className="font-semibold text-emerald-600 tabular-nums">{(c.open_rate * 100).toFixed(1)}%</span> opens
                                                        </span>
                                                    )}
                                                    {c.click_rate != null && (
                                                        <span className="text-gray-500">
                                                            <span className="font-semibold text-blue-600 tabular-nums">{(c.click_rate * 100).toFixed(1)}%</span> clicks
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-gray-200">
                    {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'sending').map(([key, config]) => (
                        <span key={key} className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                            <span className={`w-4 h-2.5 rounded-sm ${config.color}`} />
                            {config.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
