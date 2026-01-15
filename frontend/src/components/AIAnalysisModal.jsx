import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, AlertCircle, ChevronRight } from 'lucide-react';

// Professional markdown renderer for AI analysis output
function MarkdownRenderer({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let currentList = [];
  let listType = null;
  let inSection = false;
  let sectionContent = [];
  let sectionTitle = '';
  let sectionEmoji = '';

  const getSectionStyle = (emoji) => {
    const styles = {
      '1️⃣': { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
      '2️⃣': { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600' },
      '3️⃣': { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-600' },
      '4️⃣': { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600' },
      '✅': { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600' },
      '⚠️': { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-600' },
      '🚨': { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-600' },
      '🔍': { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600' },
      '💡': { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-600' },
      '📣': { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'text-pink-600' },
      '💼': { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'text-slate-600' },
      '⚙️': { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text-gray-600' },
    };
    return styles[emoji] || { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'text-gray-600' };
  };

  const flushList = () => {
    if (currentList.length > 0) {
      const listElement = (
        <ul key={`list-${elements.length}-${currentList.length}`} className="space-y-2 my-3">
          {currentList}
        </ul>
      );
      if (inSection) {
        sectionContent.push(listElement);
      } else {
        elements.push(listElement);
      }
      currentList = [];
      listType = null;
    }
  };

  const flushSection = () => {
    flushList();
    if (inSection && sectionContent.length > 0) {
      const style = getSectionStyle(sectionEmoji);
      elements.push(
        <div key={`section-${elements.length}`} className={`rounded-xl border ${style.border} overflow-hidden mb-4 shadow-sm`}>
          <div className={`${style.bg} px-4 py-3 border-b ${style.border}`}>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-lg">{sectionEmoji}</span>
              <span>{sectionTitle}</span>
            </h3>
          </div>
          <div className="bg-white p-4">
            {sectionContent}
          </div>
        </div>
      );
      sectionContent = [];
      sectionTitle = '';
      sectionEmoji = '';
      inSection = false;
    }
  };

  const processInlineFormatting = (text) => {
    // Bold
    let processed = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    // Inline code
    processed = processed.replace(/`(.*?)`/g, '<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
    return processed;
  };

  lines.forEach((line, index) => {
    // Main section headers (## 1️⃣, ## 2️⃣, etc.)
    if (line.match(/^## \d️⃣/)) {
      flushSection();
      const match = line.match(/^## (\d️⃣)\s*(.+)$/);
      if (match) {
        sectionEmoji = match[1];
        sectionTitle = match[2];
        inSection = true;
      }
    }
    // Sub-section headers (### ✅, ### ⚠️, etc.)
    else if (line.match(/^### [^\s]/)) {
      flushList();
      const match = line.match(/^### (\S+)\s*(.+)$/);
      if (match) {
        const emoji = match[1];
        const title = match[2];
        const style = getSectionStyle(emoji);
        const subHeader = (
          <div key={`subheader-${index}`} className={`flex items-center gap-2 ${style.bg} -mx-4 px-4 py-2 mt-2 mb-3 border-y ${style.border}`}>
            <span>{emoji}</span>
            <span className="font-medium text-gray-800">{title}</span>
          </div>
        );
        if (inSection) {
          sectionContent.push(subHeader);
        } else {
          elements.push(subHeader);
        }
      }
    }
    // Horizontal rule
    else if (line.startsWith('---')) {
      flushSection();
    }
    // Checkbox items
    else if (line.match(/^- \[ \]/)) {
      listType = 'checkbox';
      const text = line.replace(/^- \[ \] ?/, '');
      currentList.push(
        <li key={`item-${index}`} className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          <span className="flex-shrink-0 w-5 h-5 mt-0.5 border-2 border-gray-300 rounded bg-white"></span>
          <span className="text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: processInlineFormatting(text) }} />
        </li>
      );
    }
    else if (line.match(/^- \[x\]/i)) {
      listType = 'checkbox';
      const text = line.replace(/^- \[x\] ?/i, '');
      currentList.push(
        <li key={`item-${index}`} className="flex items-start gap-3 p-2 bg-green-50 rounded-lg">
          <span className="flex-shrink-0 w-5 h-5 mt-0.5 bg-green-500 rounded flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </span>
          <span className="text-gray-700 text-sm" dangerouslySetInnerHTML={{ __html: processInlineFormatting(text) }} />
        </li>
      );
    }
    // Regular list items
    else if (line.startsWith('- ')) {
      if (listType !== 'checkbox') {
        listType = 'bullet';
      }
      const text = line.replace('- ', '');
      currentList.push(
        <li key={`item-${index}`} className="flex items-start gap-2 text-gray-700 text-sm">
          <ChevronRight className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: processInlineFormatting(text) }} />
        </li>
      );
    }
    // Empty lines
    else if (line.trim() === '') {
      flushList();
    }
    // Regular paragraphs
    else if (line.trim()) {
      flushList();
      const paragraph = (
        <p key={`p-${index}`} className="text-gray-700 text-sm leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: processInlineFormatting(line) }} />
      );
      if (inSection) {
        sectionContent.push(paragraph);
      } else {
        elements.push(paragraph);
      }
    }
  });

  flushSection();

  return <div className="space-y-2">{elements}</div>;
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

  const analysisContent = typeof analysis === 'string' ? analysis : null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-gradient-to-r from-violet-50 to-cyan-50">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl shadow-sm"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)',
              }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">AI 儀表板分析報告</h2>
              <p className="text-xs text-gray-500">
                由 Gemini AI 生成的行銷策略建議
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {analysis && (
              <button
                onClick={copyAllAnalysis}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  copied
                    ? 'bg-green-100 text-green-700 shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm border border-gray-200'
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
              className="p-2 hover:bg-white/80 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Context Banner */}
        {context && !error && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-gray-200">
                <span className="text-gray-500">檢視：</span>
                <span className="font-medium text-gray-700">{context.view === 'region-detail' ? context.region : '總覽'}</span>
              </span>
              <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-gray-200">
                <span className="text-gray-500">期間：</span>
                <span className="font-medium text-gray-700">{context.timeRange}</span>
              </span>
              {context.audience && (
                <span className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-gray-200">
                  <span className="text-gray-500">受眾：</span>
                  <span className="font-medium text-gray-700">{context.audience}</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-red-100 rounded-full mb-4">
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0">
          <p className="text-xs text-gray-400">
            AI 分析僅供參考，請結合實際情況做出決策
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}
