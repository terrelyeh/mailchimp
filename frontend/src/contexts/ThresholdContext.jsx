import React, { createContext, useContext, useState, useEffect } from 'react';

// Default threshold values
const DEFAULT_THRESHOLDS = {
  bounceRate: 5,              // > 5% bounce rate
  unsubRate: 1,               // > 1% unsub rate
  lowActivityCampaigns: 2,    // < 2 campaigns in last 30 days
  lowOpenRate: 15,            // < 15% open rate
  lowClickRate: 1             // < 1% click rate
};

const STORAGE_KEY = 'edm_dashboard_thresholds';

const ThresholdContext = createContext();

export function ThresholdProvider({ children }) {
  const [thresholds, setThresholds] = useState(() => {
    // Load from localStorage on init
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_THRESHOLDS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load thresholds from localStorage:', e);
    }
    return DEFAULT_THRESHOLDS;
  });

  // Save to localStorage whenever thresholds change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(thresholds));
    } catch (e) {
      console.warn('Failed to save thresholds to localStorage:', e);
    }
  }, [thresholds]);

  const updateThreshold = (key, value) => {
    setThresholds(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetToDefaults = () => {
    setThresholds(DEFAULT_THRESHOLDS);
  };

  // Convert percentage values to decimals for calculations
  const getThresholdsForCalculation = () => ({
    bounceRate: thresholds.bounceRate / 100,
    unsubRate: thresholds.unsubRate / 100,
    lowActivityCampaigns: thresholds.lowActivityCampaigns,
    lowOpenRate: thresholds.lowOpenRate / 100,
    lowClickRate: thresholds.lowClickRate / 100
  });

  return (
    <ThresholdContext.Provider value={{
      thresholds,
      updateThreshold,
      resetToDefaults,
      getThresholdsForCalculation,
      DEFAULT_THRESHOLDS
    }}>
      {children}
    </ThresholdContext.Provider>
  );
}

export function useThresholds() {
  const context = useContext(ThresholdContext);
  if (!context) {
    throw new Error('useThresholds must be used within a ThresholdProvider');
  }
  return context;
}
