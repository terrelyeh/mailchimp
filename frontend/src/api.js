import axios from 'axios';

// In production (Zeabur), use VITE_API_URL environment variable
// In development, use localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Token management
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const getStoredUser = () => {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
};
export const setStoredAuth = (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const clearStoredAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
};

// Create axios instance with default config
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // 60 seconds timeout for API calls
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = getStoredToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ECONNABORTED') {
            console.warn('API request timeout');
        } else if (error.response) {
            console.warn(`API Error ${error.response.status}:`, error.response.data);
            // Handle 401 unauthorized - clear auth and redirect
            if (error.response.status === 401) {
                clearStoredAuth();
                // Dispatch custom event for auth state change
                window.dispatchEvent(new CustomEvent('auth-expired'));
            }
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
        // Return regions with names if available, otherwise fall back to codes only
        if (response.data.regions_with_names) {
            return response.data.regions_with_names;
        }
        // Fallback: convert codes to objects
        return response.data.regions.map(code => ({ code, name: code }));
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

// ============================================
// Share Link API Functions
// ============================================

/**
 * Create a new shared link with optional password and expiration
 * @param {Object} filterState - Current filter settings
 * @param {string|null} password - Optional password
 * @param {number|null} expiresDays - Expiration in days (1, 7, 30, or null for never)
 */
export const createShareLink = async (filterState, password = null, expiresDays = null) => {
    try {
        const response = await api.post('/share', {
            filter_state: filterState,
            password: password,
            expires_days: expiresDays
        });
        return response.data;
    } catch (error) {
        console.error('Failed to create share link:', error);
        return { status: 'error', error: error.message };
    }
};

/**
 * Get shared link info and filter state (if no password required)
 * @param {string} token - The share link token
 */
export const getShareLink = async (token) => {
    try {
        const response = await api.get(`/share/${token}`);
        return response.data;
    } catch (error) {
        if (error.response?.status === 404) {
            return { status: 'error', error: 'not_found' };
        }
        return { status: 'error', error: error.message };
    }
};

/**
 * Verify password for a password-protected shared link
 * @param {string} token - The share link token
 * @param {string} password - The password to verify
 */
export const verifyShareLinkPassword = async (token, password) => {
    try {
        const response = await api.post(`/share/${token}/verify`, { password });
        return response.data;
    } catch (error) {
        if (error.response?.status === 404) {
            return { status: 'error', error: 'not_found' };
        }
        return { status: 'error', error: error.message };
    }
};

/**
 * List all shared links for management
 */
export const listShareLinks = async () => {
    try {
        const response = await api.get('/share');
        return response.data;
    } catch (error) {
        console.error('Failed to list share links:', error);
        return { status: 'error', error: error.message, links: [] };
    }
};

/**
 * Delete a shared link by token
 * @param {string} token - The share link token to delete
 */
export const deleteShareLink = async (token) => {
    try {
        const response = await api.delete(`/share/${token}`);
        return response.data;
    } catch (error) {
        if (error.response?.status === 404) {
            return { status: 'error', error: 'not_found' };
        }
        return { status: 'error', error: error.message };
    }
};

// ============================================
// Authentication API Functions
// ============================================

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 */
export const login = async (email, password) => {
    try {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.status === 'success') {
            setStoredAuth(response.data.token, response.data.user);
        }
        return response.data;
    } catch (error) {
        if (error.response?.status === 401) {
            return { status: 'error', error: 'invalid_credentials', message: 'Invalid email or password' };
        }
        return { status: 'error', error: error.message };
    }
};

/**
 * Logout - clear stored auth
 */
export const logout = () => {
    clearStoredAuth();
};

/**
 * Get current user info
 */
export const getCurrentUser = async () => {
    try {
        const response = await api.get('/auth/me');
        return response.data;
    } catch (error) {
        return null;
    }
};

/**
 * Change current user's password
 * @param {string} oldPassword - Current password
 * @param {string} newPassword - New password
 */
export const changePassword = async (oldPassword, newPassword) => {
    try {
        const response = await api.post('/auth/change-password', {
            old_password: oldPassword,
            new_password: newPassword
        });
        if (response.data.status === 'success' && response.data.token) {
            // Update stored token
            const user = getStoredUser();
            if (user) {
                user.must_change_password = false;
                setStoredAuth(response.data.token, user);
            }
        }
        return response.data;
    } catch (error) {
        if (error.response?.data?.detail) {
            return { status: 'error', message: error.response.data.detail };
        }
        return { status: 'error', message: error.message };
    }
};

/**
 * Update current user's profile
 * @param {string} displayName - New display name
 */
export const updateProfile = async (displayName) => {
    try {
        const response = await api.put('/auth/profile', { display_name: displayName });
        if (response.data.status === 'success' && response.data.user) {
            // Update stored user
            const token = getStoredToken();
            if (token) {
                setStoredAuth(token, response.data.user);
            }
        }
        return response.data;
    } catch (error) {
        if (error.response?.data?.detail) {
            return { status: 'error', message: error.response.data.detail };
        }
        return { status: 'error', message: error.message };
    }
};

// ============================================
// User Management API Functions (Admin only)
// ============================================

/**
 * List all users (admin only)
 */
export const listUsers = async () => {
    try {
        const response = await api.get('/users');
        return response.data;
    } catch (error) {
        if (error.response?.status === 403) {
            return { status: 'error', error: 'forbidden', message: 'Admin access required' };
        }
        return { status: 'error', error: error.message, users: [] };
    }
};

/**
 * Create a new user (admin only)
 * @param {string} email - New user email
 * @param {string} role - User role ('admin' or 'viewer')
 * @param {string} displayName - Optional display name
 */
export const createUser = async (email, role = 'viewer', displayName = null) => {
    try {
        const response = await api.post('/users', { email, role, display_name: displayName });
        return response.data;
    } catch (error) {
        if (error.response?.status === 409) {
            return { status: 'error', error: 'email_exists', message: 'Email already registered' };
        }
        if (error.response?.data?.detail) {
            return { status: 'error', message: error.response.data.detail };
        }
        return { status: 'error', message: error.message };
    }
};

/**
 * Update a user's role (admin only)
 * @param {string} userId - User ID to update
 * @param {string} role - New role ('admin' or 'viewer')
 */
export const updateUserRole = async (userId, role) => {
    try {
        const response = await api.put(`/users/${userId}/role`, { role });
        return response.data;
    } catch (error) {
        if (error.response?.data?.detail) {
            return { status: 'error', message: error.response.data.detail };
        }
        return { status: 'error', message: error.message };
    }
};

/**
 * Delete a user (admin only)
 * @param {string} userId - User ID to delete
 */
export const deleteUser = async (userId) => {
    try {
        const response = await api.delete(`/users/${userId}`);
        return response.data;
    } catch (error) {
        if (error.response?.data?.detail) {
            return { status: 'error', message: error.response.data.detail };
        }
        return { status: 'error', message: error.message };
    }
};

/**
 * Reset a user's password (admin only)
 * @param {string} userId - User ID to reset password
 */
export const resetUserPassword = async (userId) => {
    try {
        const response = await api.post(`/users/${userId}/reset-password`);
        return response.data;
    } catch (error) {
        if (error.response?.data?.detail) {
            return { status: 'error', message: error.response.data.detail };
        }
        return { status: 'error', message: error.message };
    }
};

// ============================================
// Excluded Audiences API Functions
// ============================================

/**
 * Get list of excluded audiences
 */
export const getExcludedAudiences = async () => {
    try {
        const response = await api.get('/settings/excluded-audiences');
        return response.data;
    } catch (error) {
        console.error('Failed to get excluded audiences:', error);
        return { status: 'error', excluded_audiences: [] };
    }
};

/**
 * Set excluded audiences (admin only)
 * @param {Array} audiences - Array of {audience_id, audience_name, region}
 */
export const setExcludedAudiences = async (audiences) => {
    try {
        const response = await api.put('/settings/excluded-audiences', { audiences });
        return response.data;
    } catch (error) {
        if (error.response?.status === 403) {
            return { status: 'error', message: 'Admin access required' };
        }
        if (error.response?.data?.detail) {
            return { status: 'error', message: error.response.data.detail };
        }
        return { status: 'error', message: error.message };
    }
};
