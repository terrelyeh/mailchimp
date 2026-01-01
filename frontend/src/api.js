import axios from 'axios';

// In production (Zeabur), use VITE_API_URL environment variable
// In development, use localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // 60 seconds timeout for API calls
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ECONNABORTED') {
            console.warn('API request timeout');
        } else if (error.response) {
            console.warn(`API Error ${error.response.status}:`, error.response.data);
        } else if (error.request) {
            console.warn('API Network Error: No response received');
        }
        return Promise.reject(error);
    }
);

export const fetchDashboardData = async (days = 30, region = null, forceRefresh = false) => {
    try {
        const params = { days, force_refresh: forceRefresh };
        if (region) params.region = region;

        const response = await api.get('/dashboard', { params });
        return response.data;
    } catch (error) {
        return null;
    }
};

export const fetchRegions = async () => {
    try {
        const response = await api.get('/regions');
        return response.data.regions;
    } catch (error) {
        return null;
    }
};

export const fetchAudiences = async (region = null) => {
    try {
        const params = region ? { region } : {};
        const response = await api.get('/audiences', { params });
        return response.data.audiences;
    } catch (error) {
        return null;
    }
};

export const triggerSync = async (days = 30) => {
    try {
        await api.post('/sync', null, { params: { days } });
        return true;
    } catch (error) {
        return false;
    }
};

export const fetchDiagnostics = async (days = 60, region = null) => {
    try {
        const params = { days };
        if (region) params.region = region;

        const response = await api.get('/diagnose', { params });
        return response.data;
    } catch (error) {
        return null;
    }
};

export const fetchCacheStats = async () => {
    try {
        const response = await api.get('/cache/stats');
        return response.data;
    } catch (error) {
        return null;
    }
};

export const clearCache = async (region = null) => {
    try {
        const params = region ? { region } : {};
        const response = await api.post('/cache/clear', null, { params });
        return response.data;
    } catch (error) {
        return null;
    }
};

export const fetchCacheHealth = async () => {
    try {
        const response = await api.get('/cache/health');
        return response.data;
    } catch (error) {
        return null;
    }
};

export const populateCache = async (days = 30) => {
    try {
        const response = await api.post('/cache/populate', null, { params: { days } });
        return response.data;
    } catch (error) {
        return null;
    }
};
