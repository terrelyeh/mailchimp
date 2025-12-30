import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const fetchDashboardData = async (forceRefresh = false) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/dashboard?force_refresh=${forceRefresh}`);
        return response.data;
    } catch (error) {
        console.error("API Error:", error);
        return null;
    }
};

export const triggerSync = async () => {
    try {
        await axios.post(`${API_BASE_URL}/sync`);
        return true;
    } catch (error) {
        console.error("Sync Error:", error);
        return false;
    }
};
