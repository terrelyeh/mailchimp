import React, { useState, useEffect } from 'react';
import { X, Activity, Database, RefreshCw, Trash2, CheckCircle, XCircle, Loader2, AlertTriangle, Download, Info } from 'lucide-react';
import { fetchDiagnostics, fetchCacheStats, fetchCacheHealth, populateCache, clearCache, fetchDashboardData } from '../api';

// Info tooltip component
function InfoTooltip({ children }) {
    return (
        <div className="relative group inline-flex ml-2">
            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {children}
                <div className="absolute top-full right-2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
            </div>
        </div>
    );
}

export default function DiagnosticsDrawer({ isOpen, onClose, selectedDays, onForceRefresh }) {
    const [diagnostics, setDiagnostics] = useState(null);
    const [cacheStats, setCacheStats] = useState(null);
    const [cacheHealth, setCacheHealth] = useState(null);
    const [loading, setLoading] = useState(false);
    const [clearingCache, setClearingCache] = useState(false);
    const [populatingCache, setPopulatingCache] = useState(false);

    const loadDiagnostics = async () => {
        setLoading(true);
        const [diagResult, cacheResult, healthResult] = await Promise.all([
            fetchDiagnostics(selectedDays),
            fetchCacheStats(),
            fetchCacheHealth()
        ]);
        setDiagnostics(diagResult);
        setCacheStats(cacheResult);
        setCacheHealth(healthResult);
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

    const handlePopulateCache = async () => {
        if (!confirm('這將會從 MailChimp API 抓取所有區域的資料並儲存到快取。\n此操作可能需要幾分鐘，確定要繼續嗎？')) {
            return;
        }

        setPopulatingCache(true);
        const result = await populateCache(selectedDays);
        setPopulatingCache(false);

        if (result) {
            const total = result.final_cache_stats?.total || 0;
            alert(`快取填充完成！\n總共儲存了 ${total} 個 campaigns`);
            await loadDiagnostics();
            if (onForceRefresh) {
                onForceRefresh();
            }
        } else {
            alert('快取填充失敗，請檢查後端日誌');
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
                            {/* Cache Health Warning */}
                            {cacheHealth && !cacheHealth.healthy && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-red-900 mb-1">快取問題偵測</h3>
                                            <div className="space-y-1">
                                                {cacheHealth.issues?.map((issue, idx) => (
                                                    <p key={idx} className="text-sm text-red-700">• {issue}</p>
                                                ))}
                                            </div>
                                            {cacheHealth.recommendations && cacheHealth.recommendations.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-red-200">
                                                    <p className="text-xs font-medium text-red-800 mb-1">建議：</p>
                                                    {cacheHealth.recommendations.map((rec, idx) => (
                                                        <p key={idx} className="text-xs text-red-700">• {rec}</p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Cache Stats */}
                            <div className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Database className="w-4 h-4 text-gray-600" />
                                    <h3 className="font-semibold text-gray-900">Cache Status</h3>
                                    {cacheHealth && (
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                            cacheHealth.healthy
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {cacheHealth.healthy ? 'Healthy' : 'Unhealthy'}
                                        </span>
                                    )}
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
                                    {cacheHealth?.database && (
                                        <div className="pt-2 mt-2 border-t border-gray-200">
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span>Database Size:</span>
                                                <span>{(cacheHealth.database.size_bytes / 1024).toFixed(1)} KB</span>
                                            </div>
                                        </div>
                                    )}
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

                                {/* Populate Cache */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handlePopulateCache}
                                        disabled={populatingCache}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {populatingCache ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Download className="w-4 h-4" />
                                        )}
                                        {populatingCache ? 'Populating Cache...' : 'Populate Cache from API'}
                                    </button>
                                    <InfoTooltip>
                                        <p className="font-medium mb-1">從 API 填充快取</p>
                                        <p className="text-gray-300">從 Mailchimp API 抓取所有區域的 campaign 資料並儲存到本地快取。</p>
                                        <p className="text-gray-400 mt-2">⏱ 可能需要幾分鐘</p>
                                        <p className="text-gray-400 mt-1">📌 使用時機：初次設定、快取資料遺失或損壞時</p>
                                    </InfoTooltip>
                                </div>

                                {/* Force Refresh */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={handleForceRefresh}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Force Refresh All Data
                                    </button>
                                    <InfoTooltip>
                                        <p className="font-medium mb-1">強制重新整理資料</p>
                                        <p className="text-gray-300">重新從快取載入資料並更新儀表板顯示。</p>
                                        <p className="text-gray-400 mt-2">⚡ 速度快，使用快取資料</p>
                                        <p className="text-gray-400 mt-1">📌 使用時機：想要刷新顯示、確認資料更新後的結果</p>
                                    </InfoTooltip>
                                </div>

                                {/* Clear Cache */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleClearCache()}
                                        disabled={clearingCache}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {clearingCache ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                        Clear All Cache
                                    </button>
                                    <InfoTooltip>
                                        <p className="font-medium mb-1">清除所有快取</p>
                                        <p className="text-gray-300">刪除本地儲存的所有 campaign 快取資料。</p>
                                        <p className="text-gray-400 mt-2">⚠️ 清除後需重新填充快取</p>
                                        <p className="text-gray-400 mt-1">📌 使用時機：快取資料損壞、想要完全重新開始</p>
                                    </InfoTooltip>
                                </div>

                                {/* Re-run Diagnostics */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={loadDiagnostics}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Re-run Diagnostics
                                    </button>
                                    <InfoTooltip>
                                        <p className="font-medium mb-1">重新執行診斷</p>
                                        <p className="text-gray-300">測試各區域的 Mailchimp API 連線狀態與快取健康度。</p>
                                        <p className="text-gray-400 mt-2">🔍 檢查 API 連線是否正常</p>
                                        <p className="text-gray-400 mt-1">📌 使用時機：確認 API 設定、排查連線問題</p>
                                    </InfoTooltip>
                                </div>
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
