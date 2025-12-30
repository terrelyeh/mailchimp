import React from 'react';
import { format } from 'date-fns';
import { ExternalLink } from 'lucide-react';

export default function CampaignList({ data }) {
    // Sort descending by date
    const sortedData = [...data].sort((a, b) => new Date(b.send_time) - new Date(a.send_time));

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Recent Campaigns</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-500">
                    <thead className="bg-gray-50 text-gray-900 font-medium border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Campaign Name</th>
                            <th className="px-6 py-3">Sent Time</th>
                            <th className="px-6 py-3 text-right">Open Rate</th>
                            <th className="px-6 py-3 text-right">Click Rate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sortedData.map((campaign) => (
                            <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        Sent
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-medium text-gray-900">
                                    <div className="flex items-center group cursor-pointer">
                                        {campaign.title}
                                        <a href={campaign.archive_url} target="_blank" rel="noreferrer" className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ExternalLink className="w-3 h-3 text-gray-400" />
                                        </a>
                                    </div>
                                    <div className="text-xs text-gray-400 font-normal truncate max-w-[200px]">{campaign.subject_line}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {format(new Date(campaign.send_time), 'MMM dd, HH:mm')}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="font-medium text-gray-900">{(campaign.open_rate * 100).toFixed(1)}%</span>
                                    <div className="text-xs text-gray-400">{campaign.opens?.toLocaleString()} opens</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="font-medium text-gray-900">{(campaign.click_rate * 100).toFixed(1)}%</span>
                                    <div className="text-xs text-gray-400">{campaign.clicks?.toLocaleString()} clicks</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
