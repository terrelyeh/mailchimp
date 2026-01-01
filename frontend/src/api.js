import axios from 'axios';

// In production (Zeabur), use VITE_API_URL environment variable
// In development, use localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const fetchDashboardData = async (days = 30, region = null, forceRefresh = false) => {
    try {
        const params = new URLSearchParams();
        params.append('days', days);
        if (region) {
            params.append('region', region);
        }
        params.append('force_refresh', forceRefresh);

        const response = await axios.get(`${API_BASE_URL}/dashboard?${params}`);
        return response.data;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
};

export const fetchRegions = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/regions`);
        return response.data.regions;
    } catch (error) {
        console.error("Regions API Error:", error);
        return null;
    }
};

export const fetchAudiences = async (region = null) => {
    try {
        const params = region ? `?region=${region}` : '';
        const response = await axios.get(`${API_BASE_URL}/audiences${params}`);
        return response.data.audiences;
    } catch (error) {
        console.error("Audiences API Error:", error);
        return null;
    }
};

export const triggerSync = async (days = 30) => {
    try {
        await axios.post(`${API_BASE_URL}/sync?days=${days}`);
        return true;
    } catch (error) {
        console.error("Sync Error:", error);
        return false;
    }
};

export const fetchDiagnostics = async (days = 60, region = null) => {
    try {
        const params = new URLSearchParams();
        params.append('days', days);
        if (region) {
            params.append('region', region);
        }
        const response = await axios.get(`${API_BASE_URL}/diagnose?${params}`);
        return response.data;
    } catch (error) {
        console.error("Diagnostics API Error:", error);
        return null;
    }
};

export const fetchCacheStats = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/cache/stats`);
        return response.data;
    } catch (error) {
        console.error("Cache Stats API Error:", error);
        return null;
    }
};

export const clearCache = async (region = null) => {
    try {
        const params = region ? `?region=${region}` : '';
        const response = await axios.post(`${API_BASE_URL}/cache/clear${params}`);
        return response.data;
    } catch (error) {
        console.error("Clear Cache Error:", error);
        return null;
    }
};
