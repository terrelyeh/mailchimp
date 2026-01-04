import React from 'react';
import { X, Settings, RotateCcw, AlertTriangle, TrendingDown, Activity } from 'lucide-react';
import { useThresholds } from '../contexts/ThresholdContext';

export default function SettingsModal({ isOpen, onClose }) {
  const { thresholds, updateThreshold, resetToDefaults, DEFAULT_THRESHOLDS } = useThresholds();

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
    }
  ];

  const hasChanges = JSON.stringify(thresholds) !== JSON.stringify(DEFAULT_THRESHOLDS);

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
              <h2 className="text-lg font-bold text-gray-900">Alert Settings</h2>
              <p className="text-xs text-gray-500">Configure alert thresholds</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-6">
          {thresholdGroups.map((group) => (
            <div key={group.title} className={`rounded-lg p-4 ${group.bgColor} border ${group.borderColor}`}>
              <div className="flex items-center gap-2 mb-4">
                <group.icon className={`w-4 h-4 ${group.iconColor}`} />
                <span className="text-sm font-semibold text-gray-700">{group.title}</span>
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

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
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
        </div>
      </div>
    </div>
  );
}
