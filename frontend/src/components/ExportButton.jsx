import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

/**
 * ExportButton - 匯出儀表板為 PNG 圖片
 */
export default function ExportButton({
  targetRef,
  fileName = 'EnGenius_EDM_Dashboard',
  view = 'overview',
  selectedRegion = null,
  selectedDays = 30,
  customDateRange = null,
  selectedAudience = null,
  audienceList = [],
  onExportStart = null,
  onExportEnd = null
}) {
  const [isExporting, setIsExporting] = useState(false);

  // 格式化日期範圍
  const formatDateRange = () => {
    if (customDateRange) {
      const start = new Date(customDateRange.start).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      const end = new Date(customDateRange.end).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      });
      return `${start} - ${end}`;
    }
    const endDate = new Date();
    const startDate = new Date(Date.now() - selectedDays * 24 * 60 * 60 * 1000);
    const start = startDate.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    const end = endDate.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    return `${start} - ${end}`;
  };

  // 取得 Audience 名稱
  const getAudienceName = () => {
    if (!selectedAudience) return 'All Audiences';
    const audience = audienceList.find(a => a.id === selectedAudience);
    return audience ? audience.name : 'Selected Audience';
  };

  // 生成檔案名稱
  const generateFileName = () => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const regionPart = selectedRegion ? `_${selectedRegion}` : '_All_Regions';
    const daysPart = customDateRange ? '_Custom' : `_Last_${selectedDays}_Days`;
    return `${fileName}${regionPart}${daysPart}_${timestamp}.png`;
  };

  // 匯出 PNG
  const exportToPNG = async () => {
    if (!targetRef.current) {
      alert('無法找到要匯出的內容');
      return;
    }

    setIsExporting(true);

    // Notify parent to expand CampaignList
    if (onExportStart) onExportStart();

    // Wait for React to re-render with all campaigns
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const canvas = await html2canvas(targetRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#F6F6F4',
        windowWidth: targetRef.current.scrollWidth,
        windowHeight: targetRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.querySelector('[data-export-content]');
          if (clonedElement) {
            // 添加整體 padding
            clonedElement.style.padding = '24px';
            clonedElement.style.boxSizing = 'border-box';

            // 建立報告標頭
            const header = clonedDoc.createElement('div');
            header.style.cssText = `
              padding: 28px 32px;
              margin-bottom: 24px;
              background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
              border-radius: 12px;
              color: white;
            `;

            // 標題區塊
            const titleSection = clonedDoc.createElement('div');
            titleSection.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;';

            const titleLeft = clonedDoc.createElement('div');

            // Logo
            const logo = clonedDoc.createElement('img');
            logo.src = '/logo.png';
            logo.alt = 'EnGenius';
            logo.style.cssText = 'height: 36px; width: auto; margin-bottom: 8px; filter: brightness(0) invert(1);';
            logo.onerror = () => { logo.style.display = 'none'; };
            titleLeft.appendChild(logo);

            const title = clonedDoc.createElement('h1');
            title.textContent = 'EDM Analytic Dashboard';
            title.style.cssText = 'font-size: 28px; font-weight: bold; margin: 0 0 6px 0; letter-spacing: -0.5px;';

            const subtitle = clonedDoc.createElement('p');
            subtitle.textContent = view === 'overview' ? 'Multi-Region Campaign Analytics' : `${selectedRegion} Region Report`;
            subtitle.style.cssText = 'font-size: 14px; opacity: 0.8; margin: 0;';

            titleLeft.appendChild(title);
            titleLeft.appendChild(subtitle);

            const timestamp = clonedDoc.createElement('div');
            timestamp.style.cssText = 'text-align: right; font-size: 12px; opacity: 0.7;';
            timestamp.innerHTML = `Generated<br/>${new Date().toLocaleDateString('en-US', {
              month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
            })}`;

            titleSection.appendChild(titleLeft);
            titleSection.appendChild(timestamp);

            // 篩選條件區塊
            const filterSection = clonedDoc.createElement('div');
            filterSection.style.cssText = 'display: flex; gap: 32px; flex-wrap: wrap;';

            const filters = [
              { label: 'Date Range', value: formatDateRange() },
              { label: 'Region', value: selectedRegion || 'All Regions' },
            ];

            if (view !== 'overview' && selectedRegion) {
              filters.push({ label: 'Audience', value: getAudienceName() });
            }

            filters.forEach(filter => {
              const filterItem = clonedDoc.createElement('div');
              const label = clonedDoc.createElement('div');
              label.textContent = filter.label;
              label.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; margin-bottom: 4px;';
              const value = clonedDoc.createElement('div');
              value.textContent = filter.value;
              value.style.cssText = 'font-size: 15px; font-weight: 600;';
              filterItem.appendChild(label);
              filterItem.appendChild(value);
              filterSection.appendChild(filterItem);
            });

            header.appendChild(titleSection);
            header.appendChild(filterSection);
            clonedElement.insertBefore(header, clonedElement.firstChild);

            // 建立頁尾
            const footer = clonedDoc.createElement('div');
            footer.style.cssText = `
              margin-top: 24px;
              padding: 16px 20px;
              background: #f8fafc;
              border-radius: 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              color: #64748b;
              border: 1px solid #e2e8f0;
            `;
            footer.innerHTML = `
              <span>© ${new Date().getFullYear()} EnGenius Technologies</span>
              <span>Data source: Mailchimp Marketing API</span>
            `;
            clonedElement.appendChild(footer);

            // 隱藏所有按鈕
            const buttons = clonedElement.querySelectorAll('button');
            buttons.forEach(btn => { btn.style.display = 'none'; });

            // 移除 hover 效果
            const hoverElements = clonedElement.querySelectorAll('[class*="hover:"]');
            hoverElements.forEach(el => {
              if (typeof el.className === 'string') {
                el.className = el.className.replace(/hover:[^\s]+/g, '');
              } else if (el.className && el.className.baseVal !== undefined) {
                el.className.baseVal = el.className.baseVal.replace(/hover:[^\s]+/g, '');
              }
            });

            // 移除截斷
            const truncatedElements = clonedElement.querySelectorAll('.truncate');
            truncatedElements.forEach(el => {
              el.style.overflow = 'visible';
              el.style.textOverflow = 'clip';
              el.style.whiteSpace = 'normal';
            });

            // 確保 KPI card 標題完整顯示
            const kpiTitles = clonedElement.querySelectorAll('h3.text-xs');
            kpiTitles.forEach(title => {
              title.style.overflow = 'visible';
              title.style.textOverflow = 'clip';
              title.style.whiteSpace = 'normal';
            });

            // 替換圖表選擇器為靜態顯示
            const chartSelectorSection = clonedElement.querySelector('.border-b.border-gray-100');
            if (chartSelectorSection && chartSelectorSection.closest('.bg-white')) {
              const selectedRegionBtns = chartSelectorSection.querySelectorAll('button[style*="background"]');
              const selectedRegions = [];
              selectedRegionBtns.forEach(btn => {
                const text = btn.textContent.trim();
                if (text) selectedRegions.push(text);
              });

              const metricBtns = chartSelectorSection.querySelectorAll('button');
              const selectedMetrics = [];
              metricBtns.forEach(btn => {
                if (btn.className.includes('bg-gray-900') ||
                    (btn.style && btn.style.backgroundColor === 'rgb(17, 24, 39)')) {
                  const text = btn.textContent.trim();
                  if (text && !selectedRegions.includes(text)) {
                    selectedMetrics.push(text);
                  }
                }
              });

              const legend = clonedDoc.createElement('div');
              legend.style.cssText = `
                padding: 12px 16px;
                background: #f8fafc;
                border-radius: 8px;
                margin-bottom: 16px;
                border: 1px solid #e2e8f0;
              `;
              legend.innerHTML = `
                <div style="display: flex; flex-wrap: wrap; gap: 24px; font-size: 13px;">
                  <div>
                    <span style="color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 11px;">Regions:</span>
                    <span style="color: #1f2937; margin-left: 8px;">${selectedRegions.length > 0 ? selectedRegions.join(', ') : 'All'}</span>
                  </div>
                  <div>
                    <span style="color: #6b7280; font-weight: 600; text-transform: uppercase; font-size: 11px;">Metrics:</span>
                    <span style="color: #1f2937; margin-left: 8px;">${selectedMetrics.length > 0 ? selectedMetrics.join(', ') : 'Open Rate'}</span>
                  </div>
                </div>
              `;
              chartSelectorSection.style.display = 'none';
              chartSelectorSection.parentNode.insertBefore(legend, chartSelectorSection);
            }
          }
        }
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = generateFileName();
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          console.log(`✅ PNG exported: ${link.download}`);
        }
      }, 'image/png');

    } catch (error) {
      console.error('PNG export failed:', error);
      alert('PNG 匯出失敗，請稍後再試');
    } finally {
      setIsExporting(false);
      if (onExportEnd) onExportEnd();
    }
  };

  return (
    <button
      onClick={exportToPNG}
      disabled={isExporting}
      className="flex items-center gap-1 px-2 md:px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      title="Export as PNG"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="hidden md:inline">Exporting...</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span className="hidden md:inline">Export PNG</span>
        </>
      )}
    </button>
  );
}
