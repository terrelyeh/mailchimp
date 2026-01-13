import React, { useState } from 'react';
import { X, Settings, RotateCcw, AlertTriangle, TrendingDown, Activity, ClipboardList, Link2, Users, Key, EyeOff } from 'lucide-react';
import { useThresholds } from '../contexts/ThresholdContext';
import ShareLinksManager from './ShareLinksManager';
import UserManagement from './UserManagement';
import ExcludedAudiencesManager from './ExcludedAudiencesManager';

export default function SettingsModal({ isOpen, onClose, user, onChangePassword }) {
  const { thresholds, updateThreshold, resetToDefaults, DEFAULT_THRESHOLDS } = useThresholds();
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts', 'shares', or 'users'

  const isAdmin = user?.role === 'admin';

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const thresholdGroups = [
    {
      title: 'High Severity Alerts',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-100',
      items: [
        {
          key: 'bounceRate',
          label: 'Bounce Rate',
          description: 'Alert when bounce rate exceeds this value',
          unit: '%',
          min: 1,
          max: 20,
          step: 0.5
        },
        {
          key: 'unsubRate',
          label: 'Unsubscribe Rate',
          description: 'Alert when unsubscribe rate exceeds this value',
          unit: '%',
          min: 0.1,
          max: 5,
          step: 0.1
        }
      ]
    },
    {
      title: 'Medium Severity Alerts',
      icon: Activity,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-100',
      items: [
        {
          key: 'lowActivityCampaigns',
          label: 'Min Campaigns (30 days)',
          description: 'Alert when fewer campaigns sent in last 30 days',
          unit: '',
          min: 1,
          max: 10,
          step: 1
        }
      ]
    },
    {
      title: 'Engagement Alerts',
      icon: TrendingDown,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-100',
      items: [
        {
          key: 'lowOpenRate',
          label: 'Min Open Rate',
          description: 'Alert when open rate falls below this value',
          unit: '%',
          min: 5,
          max: 30,
          step: 1
        },
        {
          key: 'lowClickRate',
          label: 'Min Click Rate',
          description: 'Alert when click rate falls below this value',
          unit: '%',
          min: 0.1,
          max: 5,
          step: 0.1
        }
      ]
    },
    {
      title: 'Campaign Review Thresholds',
      subtitle: 'Second Level Dashboard',
      icon: ClipboardList,
      iconColor: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-100',
      items: [
        {
          key: 'reviewOpenRate',
          label: 'Min Open Rate',
          description: 'Campaign needs review if open rate below this value',
          unit: '%',
          min: 10,
          max: 40,
          step: 1
        },
        {
          key: 'reviewClickRate',
          label: 'Min Click Rate',
          description: 'Campaign needs review if click rate below this value',
          unit: '%',
          min: 0.5,
          max: 10,
          step: 0.5
        },
        {
          key: 'reviewDeliveryRate',
          label: 'Min Delivery Rate',
          description: 'Campaign needs review if delivery rate below this value',
          unit: '%',
          min: 80,
          max: 99,
          step: 1
        }
      ]
    }
  ];

  const hasChanges = JSON.stringify(thresholds) !== JSON.stringify(DEFAULT_THRESHOLDS);

  const tabs = [
    { id: 'alerts', label: 'Alert Settings', icon: AlertTriangle },
    { id: 'excluded', label: 'Excluded Audiences', icon: EyeOff, adminOnly: true },
    { id: 'shares', label: 'Share Links', icon: Link2, adminOnly: true },
    { id: 'users', label: 'Users', icon: Users, adminOnly: true }
  ].filter(tab => !tab.adminOnly || isAdmin);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Settings</h2>
              <p className="text-xs text-gray-500">Configure dashboard settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#007C89] text-[#007C89]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[55vh]">
          {activeTab === 'alerts' && (
            <div className="space-y-6">
              {/* Change Password Button */}
              {user && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-gray-500" />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Account Security</span>
                        <p className="text-xs text-gray-500">Logged in as {user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={onChangePassword}
                      className="px-3 py-1.5 text-sm text-[#007C89] hover:bg-[#007C89]/10 rounded-lg transition-colors"
                    >
                      Change Password
                    </button>
                  </div>
                </div>
              )}

              {thresholdGroups.map((group) => (
                <div key={group.title} className={`rounded-lg p-4 ${group.bgColor} border ${group.borderColor}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <group.icon className={`w-4 h-4 ${group.iconColor}`} />
                    <div>
                      <span className="text-sm font-semibold text-gray-700">{group.title}</span>
                      {group.subtitle && (
                        <span className="text-xs text-gray-500 ml-2">({group.subtitle})</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    {group.items.map((item) => (
                      <div key={item.key} className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium text-gray-700">
                            {item.label}
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={thresholds[item.key]}
                              onChange={(e) => updateThreshold(item.key, parseFloat(e.target.value) || 0)}
                              min={item.min}
                              max={item.max}
                              step={item.step}
                              className="w-20 px-2 py-1 text-right text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {item.unit && (
                              <span className="text-sm text-gray-500 w-4">{item.unit}</span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500">{item.description}</p>
                        {/* Range slider */}
                        <input
                          type="range"
                          value={thresholds[item.key]}
                          onChange={(e) => updateThreshold(item.key, parseFloat(e.target.value))}
                          min={item.min}
                          max={item.max}
                          step={item.step}
                          className="w-full h-1.5 mt-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>{item.min}{item.unit}</span>
                          <span>{item.max}{item.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'excluded' && <ExcludedAudiencesManager />}
          {activeTab === 'shares' && <ShareLinksManager />}
          {activeTab === 'users' && <UserManagement currentUserId={user?.id} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          {activeTab === 'alerts' ? (
            <>
              <button
                onClick={resetToDefaults}
                disabled={!hasChanges}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  hasChanges
                    ? 'text-gray-600 hover:bg-gray-200'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </button>
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Changes saved automatically
                  </span>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-[#007C89] hover:bg-[#006670] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[#007C89] hover:bg-[#006670] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
