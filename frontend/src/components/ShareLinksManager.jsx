import React, { useState, useEffect } from 'react';
import { Link2, Trash2, Lock, Clock, Eye, RefreshCw, Copy, Check, AlertCircle } from 'lucide-react';
import { listShareLinks, deleteShareLink } from '../api';

export default function ShareLinksManager() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [copiedToken, setCopiedToken] = useState(null);

  const loadLinks = async () => {
    setLoading(true);
    setError(null);
    const result = await listShareLinks();
    if (result.status === 'success') {
      setLinks(result.links || []);
    } else {
      setError('Failed to load share links');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const handleDelete = async (token) => {
    if (!confirm('Are you sure you want to delete this share link?')) {
      return;
    }

    setDeleting(token);
    const result = await deleteShareLink(token);
    if (result.status === 'success') {
      setLinks(links.filter(link => link.token !== token));
    } else {
      alert('Failed to delete share link');
    }
    setDeleting(null);
  };

  const handleCopy = async (token) => {
    const url = `${window.location.origin}/s/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFilterSummary = (summary) => {
    const parts = [];
    if (summary.region) parts.push(summary.region);
    if (summary.days) parts.push(`${summary.days}d`);
    if (summary.view === 'region-detail') parts.push('Detail');
    return parts.length > 0 ? parts.join(' · ') : 'Default';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Loading share links...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-red-500">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span className="text-sm">{error}</span>
        <button
          onClick={loadLinks}
          className="ml-3 text-sm text-[#007C89] hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="text-center py-8">
        <Link2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No share links created yet</p>
        <p className="text-xs text-gray-400 mt-1">
          Click "Share" button to create shareable links
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">{links.length} link(s)</span>
        <button
          onClick={loadLinks}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {links.map((link) => (
        <div
          key={link.token}
          className={`p-3 rounded-lg border ${
            link.is_expired
              ? 'bg-gray-50 border-gray-200 opacity-60'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {/* Token and status */}
              <div className="flex items-center gap-2 mb-1">
                <code className="text-sm font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                  {link.token}
                </code>
                {link.has_password && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                    <Lock className="w-3 h-3" />
                    Password
                  </span>
                )}
                {link.is_expired && (
                  <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                    Expired
                  </span>
                )}
              </div>

              {/* Filter summary */}
              <div className="text-xs text-gray-500 mb-1">
                {getFilterSummary(link.filter_summary)}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {link.access_count} views
                </span>
                {link.expires_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {link.is_expired ? 'Expired' : `Expires ${formatDate(link.expires_at)}`}
                  </span>
                )}
                <span>Created {formatDate(link.created_at)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCopy(link.token)}
                className={`p-1.5 rounded transition-colors ${
                  copiedToken === link.token
                    ? 'bg-green-100 text-green-600'
                    : 'hover:bg-gray-100 text-gray-500'
                }`}
                title="Copy link"
              >
                {copiedToken === link.token ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => handleDelete(link.token)}
                disabled={deleting === link.token}
                className={`p-1.5 rounded transition-colors ${
                  deleting === link.token
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-red-50 text-gray-500 hover:text-red-600'
                }`}
                title="Delete link"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
