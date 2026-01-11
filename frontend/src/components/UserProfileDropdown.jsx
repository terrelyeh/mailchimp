import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, Activity, Key, LogOut, ChevronDown } from 'lucide-react';

const UserProfileDropdown = ({
    user,
    onOpenSettings,
    onOpenDiagnostics,
    onChangePassword,
    onLogout
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayName = user?.display_name || user?.email?.split('@')[0] || 'User';
    const isAdmin = user?.role === 'admin';

    const handleItemClick = (action) => {
        setIsOpen(false);
        action();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-teal-600" />
                </div>
                <span className="font-medium text-gray-700 max-w-[120px] truncate">
                    {displayName}
                </span>
                {isAdmin && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded">
                        Admin
                    </span>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                        <button
                            onClick={() => handleItemClick(onOpenSettings)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                        >
                            <Settings className="w-4 h-4 text-gray-400" />
                            Settings
                        </button>

                        <button
                            onClick={() => handleItemClick(onOpenDiagnostics)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                        >
                            <Activity className="w-4 h-4 text-gray-400" />
                            API Diagnostics
                        </button>

                        <button
                            onClick={() => handleItemClick(onChangePassword)}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                        >
                            <Key className="w-4 h-4 text-gray-400" />
                            Change Password
                        </button>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 py-1">
                        <button
                            onClick={() => handleItemClick(onLogout)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfileDropdown;
