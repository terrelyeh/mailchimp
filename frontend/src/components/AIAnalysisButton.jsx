import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { analyzeWithAI, getAIStatus } from '../api';

export default function AIAnalysisButton({
  targetRef,
  view,
  selectedRegion,
  selectedDays,
  customDateRange,
  selectedAudience,
  audienceList,
  onAnalysisComplete,
  isAdmin
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Check AI service availability on mount
  useEffect(() => {
    const checkStatus = async () => {
      const status = await getAIStatus();
      // Backend returns ai_enabled, fallback to available for compatibility
      setIsAvailable(status.ai_enabled || status.available);
    };
    if (isAdmin) {
      checkStatus();
    }
  }, [isAdmin]);

  // Don't render if not admin or AI not available
  if (!isAdmin || !isAvailable) {
    return null;
  }

  const getTimeRangeLabel = () => {
    if (customDateRange) {
      return `${customDateRange.start} to ${customDateRange.end}`;
    }
    return `Last ${selectedDays} days`;
  };

  const getAudienceName = () => {
    if (!selectedAudience) return 'All Audiences';
    const audience = audienceList?.find(a => a.id === selectedAudience);
    return audience?.name || selectedAudience;
  };

  const handleAnalyze = async () => {
    if (isAnalyzing || !targetRef?.current) return;

    setIsAnalyzing(true);

    try {
      // Capture dashboard screenshot
      const canvas = await html2canvas(targetRef.current, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#F6F6F4',
        // Ignore certain elements
        ignoreElements: (element) => {
          return element.classList?.contains('ai-analysis-button') ||
                 element.classList?.contains('no-export');
        }
      });

      // Convert to base64 (remove the data:image/png;base64, prefix)
      const imageDataUrl = canvas.toDataURL('image/png');
      const imageBase64 = imageDataUrl.split(',')[1];

      // Build context
      const context = {
        view: view,
        region: selectedRegion || null,
        timeRange: getTimeRangeLabel(),
        audience: selectedAudience ? getAudienceName() : null
      };

      // Send to AI for analysis
      const result = await analyzeWithAI(imageBase64, context);

      if (result.status === 'success') {
        onAnalysisComplete({
          success: true,
          analysis: result.analysis,
          context: result.context,
          screenshot: imageDataUrl  // Pass the screenshot for display
        });
      } else {
        onAnalysisComplete({
          success: false,
          error: result.error || 'Analysis failed'
        });
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      onAnalysisComplete({
        success: false,
        error: error.message || 'Failed to capture dashboard'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <button
      onClick={handleAnalyze}
      disabled={isAnalyzing}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="ai-analysis-button fixed right-6 bottom-6 z-40 group hidden md:block"
      title="AI Dashboard Analysis"
    >
      {/* Glow effect */}
      <div
        className={`absolute inset-0 rounded-full blur-lg transition-opacity duration-500 ${
          isHovered || isAnalyzing ? 'opacity-80' : 'opacity-50'
        }`}
        style={{
          background: 'linear-gradient(135deg, #8B5CF6, #06B6D4, #10B981)',
          animation: 'pulse-glow 2s ease-in-out infinite'
        }}
      />

      {/* Main button */}
      <div
        className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-transform duration-300 ${
          isHovered ? 'scale-110' : 'scale-100'
        } ${isAnalyzing ? 'cursor-wait' : 'cursor-pointer'}`}
        style={{
          background: 'linear-gradient(135deg, #8B5CF6 0%, #06B6D4 50%, #10B981 100%)',
        }}
      >
        {/* Inner circle for depth */}
        <div
          className="absolute inset-1 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.8) 0%, rgba(6, 182, 212, 0.8) 50%, rgba(16, 185, 129, 0.8) 100%)',
          }}
        />

        {/* Icon */}
        <div className="relative z-10 text-white">
          {isAnalyzing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <Sparkles className="w-6 h-6" />
          )}
        </div>

        {/* Rotating border animation */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent)',
            animation: 'spin 3s linear infinite'
          }}
        />
      </div>

      {/* Tooltip */}
      <div
        className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap transition-opacity duration-200 ${
          isHovered && !isAnalyzing ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>AI Analysis</span>
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 border-8 border-transparent border-l-gray-900" />
      </div>

      {/* Analyzing tooltip */}
      {isAnalyzing && (
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing...</span>
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 border-8 border-transparent border-l-gray-900" />
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </button>
  );
}
