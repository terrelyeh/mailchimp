import React, { useState, useEffect } from 'react';
import { Sparkles, RotateCcw, Save, AlertCircle, Check, Loader2 } from 'lucide-react';
import { getAISettings, updateAISettings, resetAISettings } from '../api';

export default function AISettingsManager() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    const result = await getAISettings();
    if (result.status === 'success') {
      setSettings(result.settings);
      setOriginalSettings(result.settings);
      setApiKeyConfigured(result.api_key_configured);
      setHasChanges(false);
    } else {
      setError(result.error || 'Failed to load settings');
    }
    setLoading(false);
  };

  const handleChange = (key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      setHasChanges(JSON.stringify(updated) !== JSON.stringify(originalSettings));
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await updateAISettings(settings);

    if (result.status === 'success') {
      setOriginalSettings(result.settings);
      setSettings(result.settings);
      setHasChanges(false);
      setSuccess('設定已儲存');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || 'Failed to save settings');
    }

    setSaving(false);
  };

  const handleReset = async () => {
    if (!confirm('確定要重置為預設值嗎？所有自訂設定將會遺失。')) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const result = await resetAISettings();

    if (result.status === 'success') {
      setSettings(result.settings);
      setOriginalSettings(result.settings);
      setHasChanges(false);
      setSuccess('已重置為預設值');
      setTimeout(() => setSuccess(null), 3000);
    } else {
      setError(result.error || 'Failed to reset settings');
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed Header - Status Messages */}
      <div className="flex-shrink-0 space-y-3 pb-3">
        {/* API Key Status */}
        <div className={`rounded-lg p-3 border ${apiKeyConfigured ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            {apiKeyConfigured ? (
              <>
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Gemini API Key 已設定</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">Gemini API Key 未設定</span>
                <span className="text-xs text-red-600 ml-2">請在 Zeabur 後端環境變數中設定 GEMINI_API_KEY</span>
              </>
            )}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {success}
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pb-3" style={{ maxHeight: '300px' }}>
        {/* Enable/Disable Toggle */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <div>
                <span className="text-sm font-medium text-gray-700">AI 分析功能</span>
                <p className="text-xs text-gray-500">啟用或停用 AI 儀表板分析功能</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.enabled ?? true}
                onChange={(e) => handleChange('enabled', e.target.checked)}
                className="sr-only peer"
                disabled={!apiKeyConfigured}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* System Prompt */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            系統提示詞 (System Prompt)
          </label>
          <textarea
            value={settings?.system_prompt || ''}
            onChange={(e) => handleChange('system_prompt', e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
            placeholder="定義 AI 的角色和分析風格..."
          />
          <p className="text-xs text-gray-500 mt-1">設定 AI 的角色、專業背景和分析風格</p>
        </div>

        {/* Output Format */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            輸出格式 (Output Format)
          </label>
          <textarea
            value={settings?.output_format || ''}
            onChange={(e) => handleChange('output_format', e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
            placeholder="定義輸出的結構和格式..."
          />
          <p className="text-xs text-gray-500 mt-1">定義分析報告的結構、標題和內容格式</p>
        </div>
      </div>

      {/* Fixed Footer - Action Buttons */}
      <div className="flex-shrink-0 pt-3 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置為預設值
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              hasChanges && !saving
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                儲存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                儲存設定
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
