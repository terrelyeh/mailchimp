import React, { useEffect, useState } from 'react';
import KPICards from './components/KPICards';
import DashboardCharts from './components/DashboardCharts';
import CampaignList from './components/CampaignList';
import { fetchDashboardData, triggerSync } from './api';
import { RefreshCw, Calendar } from 'lucide-react';

// Mock Data for Demo purposes
const MOCK_DATA = Array.from({ length: 30 }).map((_, i) => ({
  id: `camp_${i}`,
  title: `Campaign #2024-${i + 1}`,
  subject_line: `Special Offer: ${10 + i}% Off for you!`,
  send_time: new Date(Date.now() - i * 86400000).toISOString(),
  emails_sent: 1000 + Math.floor(Math.random() * 500),
  open_rate: 0.2 + Math.random() * 0.15, // 20-35%
  click_rate: 0.02 + Math.random() * 0.05, // 2-7%
  opens: 300,
  clicks: 50,
  unsubscribed: Math.floor(Math.random() * 5)
}));

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [useMock, setUseMock] = useState(false);

  const loadData = async (force = false) => {
    setLoading(true);
    const result = await fetchDashboardData(force);
    if (result && result.data && result.data.length > 0) {
      setData(result.data);
      setUseMock(false);
    } else {
      // Fallback to mock if API fails or returns empty (e.g. no key)
      console.log("Using Mock Data");
      setData(MOCK_DATA);
      setUseMock(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await triggerSync(); // Trigger background sync
    // Wait a bit or poll, for now just reload after 2s
    setTimeout(() => {
      loadData(false);
      setIsSyncing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#F6F6F4] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#241C15] tracking-tight">Campaign Performance</h1>
            <p className="text-gray-500 mt-1">Monitor your Mailchimp metrics in real-time.</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 shadow-sm">
              <Calendar className="w-4 h-4 mr-2 text-gray-400" />
              Last 30 Days
            </div>

            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center bg-[#FFE01B] hover:bg-[#FFE01B]/80 text-[#241C15] px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Data'}
            </button>
          </div>
        </div>

        {useMock && (
          <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-lg mb-6 text-sm border border-blue-100">
            ℹ️ Displaying <strong>Mock Data</strong>. Please configure your <code>.env</code> in backend to see real Mailchimp data.
          </div>
        )}

        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">Loading dashboard...</div>
        ) : (
          <>
            <KPICards data={data} />
            <DashboardCharts data={data} />
            <CampaignList data={data} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
