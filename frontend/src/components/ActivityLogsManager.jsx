import React, { useState, useEffect } from 'react';
import { Clock, User, Activity, Filter, ChevronLeft, ChevronRight, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { getActivityLogs, getActivitySummary, cleanupActivityLogs } from '../api';

export default function ActivityLogsManager() {
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [limit] = useState(20);
    const [filters, setFilters] = useState({
        action: '',
        days: 30
    });

    const loadData = async () => {
        setLoading(true);

        // Load logs
        const logsResult = await getActivityLogs({
            action: filters.action || undefined,
            limit,
            offset: page * limit
        });

        if (logsResult.status !== 'error') {
            setLogs(logsResult.logs || []);
            setTotal(logsResult.total || 0);
        }

        // Load summary
        const summaryResult = await getActivitySummary(filters.days);
        if (summaryResult.status !== 'error') {
            setSummary(summaryResult.summary);
        }

        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [page, filters]);

    const handleCleanup = async () => {
        if (!confirm(`確定要清除超過 90 天的舊紀錄嗎？`)) {
            return;
        }

        const result = await cleanupActivityLogs(90);
        if (result.status === 'success') {
            alert(`已刪除 ${result.deleted_count} 筆舊紀錄`);
            loadData();
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('zh-TW', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActionLabel = (action) => {
        const labels = {
            'login': '登入',
            'view_dashboard': '查看儀表板',
            'view_region': '查看區域',
            'run_ai_analysis': 'AI 分析',
            'export_report': '匯出報告',
            'populate_cache': '填充快取',
            'clear_cache': '清除快取',
            'create_user': '建立使用者',
            'delete_user': '刪除使用者'
        };
        return labels[action] || action;
    };

    const getActionColor = (action) => {
        const colors = {
            'login': 'bg-green-100 text-green-700',
            'run_ai_analysis': 'bg-purple-100 text-purple-700',
            'populate_cache': 'bg-blue-100 text-blue-700',
            'clear_cache': 'bg-red-100 text-red-700',
            'create_user': 'bg-teal-100 text-teal-700',
            'delete_user': 'bg-orange-100 text-orange-700'
        };
        return colors[action] || 'bg-gray-100 text-gray-700';
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                        <div className="text-2xl font-bold text-blue-700">{summary.total_actions}</div>
                        <div className="text-xs text-blue-600">過去 {summary.period_days} 天總操作</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                        <div className="text-2xl font-bold text-green-700">
                            {Object.keys(summary.by_user || {}).length}
                        </div>
                        <div className="text-xs text-green-600">活躍使用者</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                        <div className="text-2xl font-bold text-purple-700">
                            {summary.by_action?.['run_ai_analysis'] || 0}
                        </div>
                        <div className="text-xs text-purple-600">AI 分析次數</div>
                    </div>
                </div>
            )}

            {/* Actions by User */}
            {summary?.by_user && Object.keys(summary.by_user).length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        使用者活動統計
                    </h3>
                    <div className="space-y-2">
                        {Object.entries(summary.by_user).map(([email, count]) => (
                            <div key={email} className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">{email}</span>
                                <span className="text-sm font-medium text-gray-900">{count} 次</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                    value={filters.action}
                    onChange={(e) => {
                        setFilters({ ...filters, action: e.target.value });
                        setPage(0);
                    }}
                    className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white"
                >
                    <option value="">所有動作</option>
                    <option value="login">登入</option>
                    <option value="run_ai_analysis">AI 分析</option>
                    <option value="populate_cache">填充快取</option>
                    <option value="clear_cache">清除快取</option>
                    <option value="create_user">建立使用者</option>
                    <option value="delete_user">刪除使用者</option>
                </select>
                <div className="flex-1" />
                <button
                    onClick={loadData}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors"
                    title="重新整理"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
                <button
                    onClick={handleCleanup}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    title="清除舊紀錄"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Logs Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                        <Activity className="w-8 h-8 mb-2 text-gray-300" />
                        <p className="text-sm">沒有找到活動紀錄</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="text-left px-4 py-2 font-medium text-gray-600">時間</th>
                                <th className="text-left px-4 py-2 font-medium text-gray-600">使用者</th>
                                <th className="text-left px-4 py-2 font-medium text-gray-600">動作</th>
                                <th className="text-left px-4 py-2 font-medium text-gray-600">詳情</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDate(log.timestamp)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 text-gray-700">
                                        {log.user_email || '-'}
                                    </td>
                                    <td className="px-4 py-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                                            {getActionLabel(log.action)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-gray-500 text-xs max-w-xs truncate">
                                        {log.details ? JSON.stringify(log.details) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        顯示 {page * limit + 1} - {Math.min((page + 1) * limit, total)} 筆，共 {total} 筆
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                            className="p-1.5 border border-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-gray-600">
                            {page + 1} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                            disabled={page >= totalPages - 1}
                            className="p-1.5 border border-gray-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
