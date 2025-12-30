import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';
import { format } from 'date-fns';

export default function DashboardCharts({ data }) {
    const [mode, setMode] = useState('trend'); // 'trend' or 'scatter'

    // Sort by send_time (ascending for charts)
    const sortedData = [...data].sort((a, b) => new Date(a.send_time) - new Date(b.send_time));

    // Prepare data for Line Chart (aggregated by day if needed, but for now simple linear)
    const lineData = sortedData.map(c => ({
        date: format(new Date(c.send_time), 'MMM dd'),
        openRate: (c.open_rate * 100).toFixed(1),
        clickRate: (c.click_rate * 100).toFixed(1),
        title: c.title
    }));

    // Prepare data for Scatter Plot
    const scatterData = sortedData.map(c => ({
        x: new Date(c.send_time).getTime(),
        y: (c.open_rate * 100),
        z: c.emails_sent, // size
        payload: c
    }));

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900">Campaign Performance</h2>
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
                            <RechartsTooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            />
                            <Line type="monotone" dataKey="openRate" stroke="#FFE01B" strokeWidth={3} dot={{ r: 4, fill: '#FFE01B' }} activeDot={{ r: 6 }} name="Open Rate" />
                            <Line type="monotone" dataKey="clickRate" stroke="#007C89" strokeWidth={3} dot={{ r: 4, fill: '#007C89' }} activeDot={{ r: 6 }} name="Click Rate" />
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
