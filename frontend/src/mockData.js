// Mock data for multi-region MailChimp dashboard

const generateCampaigns = (region, count = 30, baseSubscribers = 5000) => {
  const regionMultipliers = {
    US: { subscribers: 1.5, openRate: 1.1, clickRate: 1.0 },
    EU: { subscribers: 1.2, openRate: 1.15, clickRate: 1.05 },
    APAC: { subscribers: 1.0, openRate: 0.95, clickRate: 0.9 },
    JP: { subscribers: 0.8, openRate: 1.2, clickRate: 1.1 },
    INDIA: { subscribers: 1.3, openRate: 1.0, clickRate: 0.95 },
    AU: { subscribers: 0.9, openRate: 1.05, clickRate: 1.0 },
    UK: { subscribers: 1.1, openRate: 1.1, clickRate: 1.05 },
    CA: { subscribers: 1.0, openRate: 1.05, clickRate: 1.0 },
    SG: { subscribers: 0.7, openRate: 1.15, clickRate: 1.1 }
  };

  const multiplier = regionMultipliers[region] || { subscribers: 1.0, openRate: 1.0, clickRate: 1.0 };

  return Array.from({ length: count }).map((_, i) => ({
    id: `${region.toLowerCase()}_camp_${i}`,
    region: region,
    title: `${region} Campaign #2024-${i + 1}`,
    subject_line: `Special Offer: ${10 + i}% Off for ${region} customers!`,
    send_time: new Date(Date.now() - i * 86400000).toISOString(),
    emails_sent: Math.floor((baseSubscribers + Math.random() * 2000) * multiplier.subscribers),
    open_rate: (0.2 + Math.random() * 0.15) * multiplier.openRate,
    click_rate: (0.02 + Math.random() * 0.05) * multiplier.clickRate,
    opens: Math.floor((300 + Math.random() * 200) * multiplier.openRate),
    unique_opens: Math.floor((250 + Math.random() * 150) * multiplier.openRate),
    clicks: Math.floor((50 + Math.random() * 30) * multiplier.clickRate),
    unique_clicks: Math.floor((40 + Math.random() * 20) * multiplier.clickRate),
    unsubscribed: Math.floor(Math.random() * 5),
    bounces: Math.floor(Math.random() * 10)
  }));
};

export const MOCK_REGIONS_DATA = {
  US: generateCampaigns('US', 30, 10000),
  EU: generateCampaigns('EU', 30, 8000),
  APAC: generateCampaigns('APAC', 30, 6000),
  JP: generateCampaigns('JP', 30, 5000)
};

// Region metadata mapping with coordinated, elegant color palette
export const REGION_METADATA = {
  US: { code: 'US', name: 'United States', flag: '🇺🇸', color: '#2563EB' },      // Rich Blue
  EU: { code: 'EU', name: 'Europe', flag: '🇪🇺', color: '#0891B2' },             // Deep Cyan
  APAC: { code: 'APAC', name: 'Asia-Pacific', flag: '🌏', color: '#F59E0B' },    // Golden Amber
  JP: { code: 'JP', name: 'Japan', flag: '🇯🇵', color: '#E11D48' },              // Rose Red
  TW: { code: 'TW', name: 'Taiwan', flag: '🇹🇼', color: '#10B981' },             // Emerald
  KR: { code: 'KR', name: 'Korea', flag: '🇰🇷', color: '#6366F1' },              // Indigo
  INDIA: { code: 'INDIA', name: 'India', flag: '🇮🇳', color: '#8B5CF6' },        // Bright Violet
  AU: { code: 'AU', name: 'Australia', flag: '🇦🇺', color: '#059669' },          // Deep Emerald
  UK: { code: 'UK', name: 'United Kingdom', flag: '🇬🇧', color: '#BE185D' },     // Deep Rose
  CA: { code: 'CA', name: 'Canada', flag: '🇨🇦', color: '#EA580C' },             // Burnt Orange
  SG: { code: 'SG', name: 'Singapore', flag: '🇸🇬', color: '#0284C7' },          // Sky Blue
  CN: { code: 'CN', name: 'China', flag: '🇨🇳', color: '#DC2626' },              // Red
  HK: { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', color: '#7C3AED' },          // Purple
  DE: { code: 'DE', name: 'Germany', flag: '🇩🇪', color: '#1F2937' },            // Dark Gray
  FR: { code: 'FR', name: 'France', flag: '🇫🇷', color: '#2563EB' },             // Blue
  BR: { code: 'BR', name: 'Brazil', flag: '🇧🇷', color: '#16A34A' },             // Green
  MX: { code: 'MX', name: 'Mexico', flag: '🇲🇽', color: '#15803D' },             // Dark Green
  DEFAULT: { code: 'DEFAULT', name: 'Default', flag: '🌍', color: '#6B7280' }   // Gray
};

// Helper function to get region info
export const getRegionInfo = (code) => {
  return REGION_METADATA[code] || { code, name: code, flag: '🌍', color: '#6B7280' };
};

// Legacy export for backward compatibility
export const REGIONS = [
  REGION_METADATA.US,
  REGION_METADATA.EU,
  REGION_METADATA.APAC,
  REGION_METADATA.JP
];

// Generate subscriber count trend over time
export const generateSubscriberTrend = (regions = ['US', 'EU', 'APAC', 'JP'], days = 30) => {
  const baseSubscribers = {
    US: 50000,
    EU: 40000,
    APAC: 30000,
    JP: 25000
  };

  return Array.from({ length: days }).map((_, i) => {
    const date = new Date(Date.now() - (days - i - 1) * 86400000);
    const dataPoint = {
      date: date.toISOString().split('T')[0],
      dateFormatted: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };

    regions.forEach(region => {
      // Simulate growth with some randomness
      const growth = i * 50 + Math.random() * 100;
      dataPoint[region] = Math.floor(baseSubscribers[region] + growth);
    });

    return dataPoint;
  });
};

export default MOCK_REGIONS_DATA;
