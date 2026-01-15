import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, AlertCircle } from 'lucide-react';

// Simple markdown renderer for AI analysis output
function MarkdownRenderer({ content }) {
  if (!content) return null;

  // Process markdown content
  const lines = content.split('\n');
  const elements = [];
  let currentList = [];
  let listType = null;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className={listType === 'checkbox' ? 'space-y-1 my-2' : 'list-disc list-inside space-y-1 my-2'}>
          {currentList}
        </ul>
      );
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, index) => {
    // Headers
    if (line.startsWith('## ')) {
      flushList();
      const headerText = line.replace('## ', '');
      elements.push(
        <h2 key={index} className="text-lg font-bold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200 flex items-center gap-2">
          {headerText}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      flushList();
      const headerText = line.replace('### ', '');
      elements.push(
        <h3 key={index} className="text-md font-semibold text-gray-800 mt-4 mb-2">
          {headerText}
        </h3>
      );
    } else if (line.startsWith('---')) {
      flushList();
      elements.push(<hr key={index} className="my-4 border-gray-200" />);
    } else if (line.match(/^- \[ \]/)) {
      // Unchecked checkbox
      listType = 'checkbox';
      const text = line.replace(/^- \[ \] ?/, '');
      currentList.push(
        <li key={index} className="flex items-start gap-2 text-gray-700">
          <span className="inline-block w-4 h-4 mt-0.5 border border-gray-300 rounded flex-shrink-0"></span>
          <span>{text}</span>
        </li>
      );
    } else if (line.match(/^- \[x\]/i)) {
      // Checked checkbox
      listType = 'checkbox';
      const text = line.replace(/^- \[x\] ?/i, '');
      currentList.push(
        <li key={index} className="flex items-start gap-2 text-gray-700">
          <span className="inline-block w-4 h-4 mt-0.5 bg-green-500 rounded flex-shrink-0 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </span>
          <span>{text}</span>
        </li>
      );
    } else if (line.startsWith('- ')) {
      // Regular list item
      if (listType !== 'checkbox') {
        listType = 'bullet';
      }
      const text = line.replace('- ', '');
      currentList.push(
        <li key={index} className="text-gray-700">
          {text}
        </li>
      );
    } else if (line.trim() === '') {
      flushList();
    } else if (line.startsWith('**') && line.endsWith('**')) {
      flushList();
      elements.push(
        <p key={index} className="font-semibold text-gray-800 my-2">
          {line.replace(/\*\*/g, '')}
        </p>
      );
    } else if (line.trim()) {
      flushList();
      // Process inline formatting
      let processedLine = line;
      // Bold
      processedLine = processedLine.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Inline code
      processedLine = processedLine.replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>');

      elements.push(
        <p key={index} className="text-gray-700 my-2" dangerouslySetInnerHTML={{ __html: processedLine }} />
      );
    }
  });

  flushList();

  return <div className="markdown-content">{elements}</div>;
}

export default function AIAnalysisModal({ isOpen, onClose, analysis, context, error }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const copyAllAnalysis = async () => {
    if (!analysis) return;

    const fullText = typeof analysis === 'string'
      ? analysis
      : JSON.stringify(analysis, null, 2);

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Handle both string (new format) and object (old format) analysis
  const analysisContent = typeof analysis === 'string' ? analysis : null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
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
              <h2 className="text-lg font-bold text-gray-900">AI 儀表板分析</h2>
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
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    複製全部
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
                <span className="font-medium">檢視：</span>
                {context.view === 'region-detail' ? context.region : '總覽'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-medium">期間：</span>
                {context.timeRange}
              </span>
              {context.audience && (
                <span className="flex items-center gap-1.5">
                  <span className="font-medium">受眾：</span>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">分析失敗</h3>
              <p className="text-gray-600 mb-4 max-w-md">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
              >
                關閉
              </button>
            </div>
          ) : analysisContent ? (
            <MarkdownRenderer content={analysisContent} />
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">沒有分析資料</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white text-sm font-medium rounded-lg transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
