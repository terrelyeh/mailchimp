import React, { useState } from 'react';
import { X, Sparkles, Lightbulb, TrendingUp, Target, BarChart3, Copy, Check, AlertCircle } from 'lucide-react';

export default function AIAnalysisModal({ isOpen, onClose, analysis, context, error }) {
  const [copiedSection, setCopiedSection] = useState(null);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const copyToClipboard = async (text, sectionId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(sectionId);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyAllAnalysis = async () => {
    if (!analysis) return;

    const fullText = `AI Dashboard Analysis
====================

${context?.view === 'region-detail' ? `Region: ${context.region}` : 'Overview'}
Time Range: ${context?.timeRange || 'N/A'}
${context?.audience ? `Audience: ${context.audience}` : ''}

Key Insights:
${analysis.key_insights}

Areas for Improvement:
${analysis.areas_for_improvement}

Recommended Actions:
${analysis.recommended_actions}

Overall Assessment:
${analysis.overall_assessment}`;

    await copyToClipboard(fullText, 'all');
  };

  const sections = analysis ? [
    {
      id: 'insights',
      title: 'Key Insights',
      icon: Lightbulb,
      content: analysis.key_insights,
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200'
    },
    {
      id: 'improvements',
      title: 'Areas for Improvement',
      icon: TrendingUp,
      content: analysis.areas_for_improvement,
      iconColor: 'text-orange-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      id: 'actions',
      title: 'Recommended Actions',
      icon: Target,
      content: analysis.recommended_actions,
      iconColor: 'text-green-500',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'assessment',
      title: 'Overall Assessment',
      icon: BarChart3,
      content: analysis.overall_assessment,
      iconColor: 'text-blue-500',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    }
  ] : [];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.15) 50%, rgba(16, 185, 129, 0.15) 100%)',
              }}
            >
              <Sparkles
                className="w-5 h-5"
                style={{
                  color: '#8B5CF6'
                }}
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">AI Dashboard Analysis</h2>
              <p className="text-xs text-gray-500">
                Powered by Gemini AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {analysis && (
              <button
                onClick={copyAllAnalysis}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  copiedSection === 'all'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {copiedSection === 'all' ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy All
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Context Banner */}
        {context && !error && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="font-medium">View:</span>
                {context.view === 'region-detail' ? context.region : 'Overview'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-medium">Period:</span>
                {context.timeRange}
              </span>
              {context.audience && (
                <span className="flex items-center gap-1.5">
                  <span className="font-medium">Audience:</span>
                  {context.audience}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-3 bg-red-100 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analysis Failed</h3>
              <p className="text-gray-600 mb-4 max-w-md">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          ) : analysis ? (
            <div className="space-y-4">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className={`rounded-lg border ${section.borderColor} overflow-hidden`}
                >
                  <div className={`${section.bgColor} px-4 py-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <section.icon className={`w-5 h-5 ${section.iconColor}`} />
                      <h3 className="font-semibold text-gray-900">{section.title}</h3>
                    </div>
                    <button
                      onClick={() => copyToClipboard(section.content, section.id)}
                      className={`p-1.5 rounded transition-colors ${
                        copiedSection === section.id
                          ? 'text-green-600 bg-green-100'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-white/50'
                      }`}
                      title="Copy section"
                    >
                      {copiedSection === section.id ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div className="p-4 bg-white">
                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {section.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">No analysis data available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
