import React, { useState } from 'react';
import { X, Link2, Lock, Clock, Copy, Check, Loader2 } from 'lucide-react';

export default function ShareDialog({ isOpen, onClose, onCreateLink, currentUrl }) {
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [expiresDays, setExpiresDays] = useState(null); // null = never
  const [isCreating, setIsCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    // Reset state
    setPassword('');
    setUsePassword(false);
    setExpiresDays(null);
    setCreatedLink(null);
    setCopied(false);
    setError(null);
    onClose();
  };

  const handleCreateLink = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const result = await onCreateLink({
        password: usePassword ? password : null,
        expiresDays: expiresDays
      });

      if (result.success) {
        setCreatedLink(result.url);
      } else {
        setError(result.error || 'Failed to create share link');
      }
    } catch (err) {
      setError('Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async () => {
    const linkToCopy = createdLink || currentUrl;
    try {
      await navigator.clipboard.writeText(linkToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = linkToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const expirationOptions = [
    { value: null, label: 'Never' },
    { value: 1, label: '1 day' },
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' }
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#007C89]/10 rounded-lg">
              <Link2 className="w-5 h-5 text-[#007C89]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Share Dashboard</h2>
              <p className="text-xs text-gray-500">Create a shareable link with your filters</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-5">
          {!createdLink ? (
            <>
              {/* Quick Copy Option */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Quick Share</span>
                  <button
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      copied
                        ? 'bg-green-100 text-green-700'
                        : 'bg-[#007C89] text-white hover:bg-[#006670]'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Copy current URL directly (no password/expiration)</p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-500">or create protected link</span>
                </div>
              </div>

              {/* Password Protection */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePassword}
                    onChange={(e) => setUsePassword(e.target.checked)}
                    className="w-4 h-4 text-[#007C89] rounded border-gray-300 focus:ring-[#007C89]"
                  />
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Password Protection</span>
                  </div>
                </label>

                {usePassword && (
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007C89] focus:border-transparent"
                  />
                )}
              </div>

              {/* Expiration */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Link Expiration</span>
                </div>
                <div className="flex gap-2">
                  {expirationOptions.map((option) => (
                    <button
                      key={option.value || 'never'}
                      onClick={() => setExpiresDays(option.value)}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        expiresDays === option.value
                          ? 'bg-[#007C89] text-white border-[#007C89]'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}
            </>
          ) : (
            /* Created Link Result */
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">Link Created!</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={createdLink}
                    readOnly
                    className="flex-1 px-3 py-2 bg-white border border-green-200 rounded-lg text-sm text-gray-700"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="text-sm text-gray-500 space-y-1">
                {usePassword && password && (
                  <p className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Password protected
                  </p>
                )}
                {expiresDays && (
                  <p className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Expires in {expiresDays} {expiresDays === 1 ? 'day' : 'days'}
                  </p>
                )}
                {!usePassword && !expiresDays && (
                  <p className="text-gray-400">No password or expiration set</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
          {!createdLink ? (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLink}
                disabled={isCreating || (usePassword && !password)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isCreating || (usePassword && !password)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#007C89] text-white hover:bg-[#006670]'
                }`}
              >
                {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Protected Link
              </button>
            </>
          ) : (
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-[#007C89] hover:bg-[#006670] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
