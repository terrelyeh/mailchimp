import React, { useState, useEffect } from 'react';
import { X, Activity, Database, RefreshCw, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { fetchDiagnostics, fetchCacheStats, clearCache, fetchDashboardData } from '../api';

export default function DiagnosticsDrawer({ isOpen, onClose, selectedDays, onForceRefresh }) {
    const [diagnostics, setDiagnostics] = useState(null);
    const [cacheStats, setCacheStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);

    const loadDiagnostics = async () => {
        setLoading(true);
        const [diagResult, cacheResult] = await Promise.all([
            fetchDiagnostics(selectedDays),
            fetchCacheStats()
        ]);
        setDiagnostics(diagResult);
        setCacheStats(cacheResult);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            loadDiagnostics();
        }
    }, [isOpen, selectedDays]);

    const handleClearCache = async (region = null) => {
        if (!confirm(region
            ? `確定要清除 ${region} 的快取嗎？`
            : '確定要清除所有快取嗎？'
        )) {
            return;
        }

        setClearingCache(true);
        const result = await clearCache(region);
        if (result) {
            alert(`成功清除 ${result.deleted_count} 筆快取資料`);
            await loadDiagnostics();
            if (onForceRefresh) {
                onForceRefresh();
            }
        }
        setClearingCache(false);
    };

    const handleForceRefresh = async () => {
        if (onForceRefresh) {
            onForceRefresh();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-bold text-gray-900">API Diagnostics</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                            <p className="text-sm text-gray-500">Running diagnostics...</p>
                        </div>
                    ) : (
                        <>
                            {/* Cache Stats */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Database className="w-4 h-4 text-gray-600" />
                                    <h3 className="font-semibold text-gray-900">Cache Status</h3>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Total Campaigns:</span>
                                        <span className="font-medium text-gray-900">
                                            {cacheStats?.cache_stats?.total || 0}
                                        </span>
                                    </div>
                                    {cacheStats?.cache_stats?.by_region && Object.entries(cacheStats.cache_stats.by_region).map(([region, count]) => (
                                        <div key={region} className="flex justify-between text-sm">
                                            <span className="text-gray-600">{region}:</span>
                                            <span className="font-medium text-gray-900">{count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Region Status */}
                            {diagnostics?.results && (
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-gray-900">Region Status</h3>
                                    {Object.values(diagnostics.results).map((regionData) => {
                                        const lastTest = regionData.tests?.[regionData.tests.length - 1];
                                        const isOnline = lastTest?.status === 'success';
                                        const totalCampaigns = lastTest?.total_in_period ||
                                                             regionData.tests?.find(t => t.total_campaigns)?.total_campaigns || 0;

                                        return (
                                            <div
                                                key={regionData.region}
                                                className="bg-white border border-gray-200 rounded-lg p-4"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        {isOnline ? (
                                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-600" />
                                                        )}
                                                        <span className="font-semibold text-gray-900">
                                                            {regionData.region}
                                                        </span>
                                                    </div>
                                                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                                        isOnline
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {isOnline ? 'Online' : 'Error'}
                                                    </span>
                                                </div>

                                                {isOnline && (
                                                    <div className="text-sm text-gray-600">
                                                        {totalCampaigns} campaigns available
                                                    </div>
                                                )}

                                                {/* Test Details */}
                                                <div className="mt-3 space-y-1">
                                                    {regionData.tests?.map((test, idx) => (
                                                        <details key={idx} className="text-xs">
                                                            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                                                                {test.test}: {test.status === 'success' ? '✓' : '✗'}
                                                            </summary>
                                                            <div className="mt-1 ml-4 text-gray-600 space-y-1">
                                                                <div>{test.message}</div>
                                                                {test.response_time && (
                                                                    <div className="text-gray-500">Response: {test.response_time}</div>
                                                                )}
                                                            </div>
                                                        </details>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="space-y-3 pt-4 border-t border-gray-200">
                                <h3 className="font-semibold text-gray-900">Quick Actions</h3>

                                <button
                                    onClick={handleForceRefresh}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Force Refresh All Data
                                </button>

                                <button
                                    onClick={() => handleClearCache()}
                                    disabled={clearingCache}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {clearingCache ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    Clear All Cache
                                </button>

                                <button
                                    onClick={loadDiagnostics}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Re-run Diagnostics
                                </button>
                            </div>

                            {/* Metadata */}
                            {diagnostics?.diagnosis_time && (
                                <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
                                    Last diagnostic: {new Date(diagnostics.diagnosis_time).toLocaleString()}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
