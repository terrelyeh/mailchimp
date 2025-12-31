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

export const triggerSync = async (days = 30) => {
    try {
        await axios.post(`${API_BASE_URL}/sync?days=${days}`);
        return true;
    } catch (error) {
        console.error("Sync Error:", error);
        return false;
    }
};
