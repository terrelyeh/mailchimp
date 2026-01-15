import React, { useState } from 'react';
import { X, Sparkles, Copy, Check, AlertCircle, ChevronRight, ZoomIn, ZoomOut, Image, Globe, Calendar, Users } from 'lucide-react';

// Professional markdown renderer for AI analysis output with improved visual hierarchy
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
  let sectionNumber = 0;

  const getSectionStyle = (emoji) => {
    const styles = {
      '1️⃣': { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-500', number: 1 },
      '2️⃣': { gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-500', number: 2 },
      '3️⃣': { gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-500', number: 3 },
      '4️⃣': { gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-500', number: 4 },
      '✅': { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', icon: '✅' },
      '⚠️': { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', icon: '⚠️' },
      '🚨': { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: '🚨' },
    };
    return styles[emoji] || { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' };
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
      sectionNumber++;
      elements.push(
        <div key={`section-${elements.length}`} className="mb-6 last:mb-0">
          {/* Section Card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Section Header */}
            <div className={`bg-gradient-to-r ${style.gradient} px-4 py-3`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{style.number}</span>
                </div>
                <h3 className="font-semibold text-white text-base">{sectionTitle}</h3>
              </div>
            </div>
            {/* Section Content */}
            <div className="p-4">
              {sectionContent}
            </div>
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
    let processed = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');
    processed = processed.replace(/`(.*?)`/g, '<code class="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
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
      const match = line.match(/^### (\S+)\s*(.*)$/);
      if (match) {
        const emoji = match[1];
        const title = match[2];
        const style = getSectionStyle(emoji);
        const subHeader = (
          <div key={`subheader-${index}`} className={`${style.bg} ${style.border} border rounded-lg px-3 py-2 mt-3 mb-2`}>
            <div className="flex items-center gap-2">
              <span className="text-base">{style.icon || emoji}</span>
              <span className={`font-medium text-sm ${style.text || 'text-gray-700'}`}>{title}</span>
            </div>
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
        <li key={`item-${index}`} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
          <span className="flex-shrink-0 w-5 h-5 mt-0.5 border-2 border-gray-300 rounded bg-white"></span>
          <span className="text-gray-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: processInlineFormatting(text) }} />
        </li>
      );
    }
    else if (line.match(/^- \[x\]/i)) {
      listType = 'checkbox';
      const text = line.replace(/^- \[x\] ?/i, '');
      currentList.push(
        <li key={`item-${index}`} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
          <span className="flex-shrink-0 w-5 h-5 mt-0.5 bg-green-500 rounded flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </span>
          <span className="text-gray-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: processInlineFormatting(text) }} />
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
        <li key={`item-${index}`} className="flex items-start gap-2 py-1.5 text-gray-700 text-sm">
          <ChevronRight className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: processInlineFormatting(text) }} />
        </li>
      );
    }
    // Arrow items (→)
    else if (line.includes('→')) {
      flushList();
      const parts = line.split('→');
      const paragraph = (
        <div key={`arrow-${index}`} className="flex items-start gap-2 py-2 px-3 bg-gray-50 rounded-lg my-2">
          <span className="font-medium text-gray-800 text-sm">{parts[0].replace('- ', '').trim()}</span>
          <span className="text-gray-400">→</span>
          <span className="text-gray-600 text-sm">{parts[1]?.trim()}</span>
        </div>
      );
      if (inSection) {
        sectionContent.push(paragraph);
      } else {
        elements.push(paragraph);
      }
    }
    // Empty lines
    else if (line.trim() === '') {
      flushList();
    }
    // Regular paragraphs
    else if (line.trim()) {
      flushList();
      const paragraph = (
        <p key={`p-${index}`} className="text-gray-600 text-sm leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: processInlineFormatting(line) }} />
      );
      if (inSection) {
        sectionContent.push(paragraph);
      } else {
        elements.push(paragraph);
      }
    }
  });

  flushSection();

  return <div className="space-y-1">{elements}</div>;
}

export default function AIAnalysisModal({ isOpen, onClose, analysis, context, error, screenshot }) {
  const [copied, setCopied] = useState(false);
  const [showFullScreenshot, setShowFullScreenshot] = useState(false);

  if (!isOpen) return null;

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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Side Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0 bg-gradient-to-r from-violet-50 to-cyan-50">
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
              <h2 className="text-base font-bold text-gray-900">AI 分析報告</h2>
              <p className="text-xs text-gray-500">
                Gemini AI 行銷策略建議
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {analysis && (
              <button
                onClick={copyAllAnalysis}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    已複製
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    複製
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50/80">
          {/* Analysis Conditions Card */}
          {context && !error && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-5 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-2 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  📊 分析條件
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Region/View */}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg">
                      <Globe className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">範圍</p>
                      <p className="text-sm font-medium text-gray-800">
                        {context.view === 'region-detail' ? context.region : '總覽 (All Regions)'}
                      </p>
                    </div>
                  </div>
                  {/* Time Range */}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">期間</p>
                      <p className="text-sm font-medium text-gray-800">{context.timeRange}</p>
                    </div>
                  </div>
                  {/* Audience */}
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-50 rounded-lg">
                      <Users className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">受眾</p>
                      <p className="text-sm font-medium text-gray-800">
                        {context.audience || 'All Audiences'}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Screenshot thumbnail */}
                {screenshot && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div
                      className="inline-flex items-center gap-2 cursor-pointer group"
                      onClick={() => setShowFullScreenshot(true)}
                    >
                      <img
                        src={screenshot}
                        alt="Analyzed dashboard"
                        className="h-10 w-auto rounded border border-gray-200 object-cover"
                        style={{ maxWidth: '80px' }}
                      />
                      <span className="text-xs text-gray-500 group-hover:text-gray-700 flex items-center gap-1">
                        <ZoomIn className="w-3 h-3" />
                        查看原始截圖
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-red-100 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">分析失敗</h3>
              <p className="text-gray-600 mb-4 max-w-md text-sm">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors text-sm"
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
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-white flex-shrink-0">
          <p className="text-xs text-gray-400">
            AI 分析僅供參考
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
          >
            關閉
          </button>
        </div>
      </div>

      {/* Full Screenshot Modal */}
      {showFullScreenshot && screenshot && (
        <div
          className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-8"
          onClick={() => setShowFullScreenshot(false)}
        >
          <div className="relative max-w-full max-h-full">
            <img
              src={screenshot}
              alt="Analyzed dashboard (full size)"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <button
              onClick={() => setShowFullScreenshot(false)}
              className="absolute -top-3 -right-3 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
              點擊任意處關閉
            </div>
          </div>
        </div>
      )}
    </>
  );
}
