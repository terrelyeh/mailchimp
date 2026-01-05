import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { format } from 'date-fns';

export default function DashboardCharts({ data }) {
    const [mode, setMode] = useState('trend'); // 'trend' or 'scatter'

    // 確保 data 是陣列
    if (!data || !Array.isArray(data) || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100/80 ring-1 ring-gray-900/5">
                <h2 className="section-title mb-6">Campaign Performance</h2>
                <div className="h-[400px] flex items-center justify-center text-gray-400">
                    No campaign data available
                </div>
            </div>
        );
    }

    // Sort by send_time (ascending for charts)
    const sortedData = [...data].sort((a, b) => new Date(a.send_time) - new Date(b.send_time));

    // Prepare data for Line Chart (aggregated by day if needed, but for now simple linear)
    const lineData = sortedData.map(c => {
        const emailsSent = c.emails_sent || 0;
        const bounces = c.bounces || 0;
        const deliveryRate = emailsSent > 0 ? ((emailsSent - bounces) / emailsSent) * 100 : 0;

        return {
            date: format(new Date(c.send_time), 'MMM dd'),
            fullDate: format(new Date(c.send_time), 'yyyy-MM-dd'),
            openRate: (c.open_rate * 100),
            clickRate: (c.click_rate * 100),
            deliveryRate: deliveryRate,
            title: c.title || c.subject_line || 'Untitled Campaign',
            emailsSent: emailsSent
        };
    });

    // Custom tooltip for Line Chart
    const CustomLineTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg min-w-[180px]">
                    <p className="font-bold text-sm text-gray-900 mb-2 truncate max-w-[200px]" title={data.title}>
                        {data.title}
                    </p>
                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Open Rate</span>
                            <span className="text-sm font-semibold text-[#FFE01B]">{data.openRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Click Rate</span>
                            <span className="text-sm font-semibold text-[#007C89]">{data.clickRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Delivery Rate</span>
                            <span className="text-sm font-semibold text-[#8B5CF6]">{data.deliveryRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-gray-100 mt-1">
                            <span className="text-xs text-gray-500">Total Sent</span>
                            <span className="text-sm font-medium text-gray-700">{data.emailsSent.toLocaleString()}</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{data.fullDate}</p>
                </div>
            );
        }
        return null;
    };

    // Prepare data for Scatter Plot
    const scatterData = sortedData.map(c => ({
        x: new Date(c.send_time).getTime(),
        y: (c.open_rate * 100),
        z: c.emails_sent, // size
        payload: c
    }));

    return (
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100/80 ring-1 ring-gray-900/5 mb-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="section-title">Campaign Performance</h2>
                <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                        onClick={() => setMode('trend')}
                        className={`px-3 py-1 text-sm rounded-md transition-all ${mode === 'trend' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Trend
                    </button>
                    <button
                        onClick={() => setMode('scatter')}
                        className={`px-3 py-1 text-sm rounded-md transition-all ${mode === 'scatter' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Matrix
                    </button>
                </div>
            </div>

            <div className="h-[400px] w-full">
                {mode === 'trend' ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                            <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} unit="%" />
                            <RechartsTooltip content={<CustomLineTooltip />} />
                            <Line type="monotone" dataKey="openRate" stroke="#FFE01B" strokeWidth={3} dot={{ r: 4, fill: '#FFE01B' }} activeDot={{ r: 6 }} name="Open Rate" />
                            <Line type="monotone" dataKey="clickRate" stroke="#007C89" strokeWidth={3} dot={{ r: 4, fill: '#007C89' }} activeDot={{ r: 6 }} name="Click Rate" />
                            <Line type="monotone" dataKey="deliveryRate" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3, fill: '#8B5CF6' }} activeDot={{ r: 5 }} name="Delivery Rate" strokeDasharray="5 5" />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="x"
                                type="number"
                                domain={['auto', 'auto']}
                                tickFormatter={(unix) => format(new Date(unix), 'MMM dd')}
                                stroke="#9CA3AF"
                                tickLine={false} axisLine={false}
                            />
                            <YAxis dataKey="y" type="number" unit="%" name="Open Rate" stroke="#9CA3AF" tickLine={false} axisLine={false} />
                            <ZAxis dataKey="z" type="number" range={[60, 400]} name="Emails Sent" />
                            <RechartsTooltip
                                cursor={{ strokeDasharray: '3 3' }}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg">
                                                <p className="font-bold text-sm mb-1">{data.payload.title}</p>
                                                <p className="text-xs text-gray-500">Open Rate: {(data.y).toFixed(1)}%</p>
                                                <p className="text-xs text-gray-500">Sent: {data.z.toLocaleString()}</p>
                                                <p className="text-xs text-gray-400 mt-1">{format(new Date(data.x), 'yyyy-MM-dd HH:mm')}</p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Scatter name="Campaigns" data={scatterData} fill="#007C89" fillOpacity={0.6} />
                        </ScatterChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
