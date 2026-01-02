import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

/**
 * ExportButton - 匯出儀表板為圖片
 * 支援 PNG 格式，包含報告標頭資訊
 */
export default function ExportButton({
  targetRef,
  fileName = 'EnGenius_EDM_Dashboard',
  view = 'overview',
  selectedRegion = null,
  selectedDays = 30,
  customDateRange = null,
  selectedAudience = null,
  audienceList = []
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

  const exportToPNG = async () => {
    if (!targetRef.current) {
      alert('無法找到要匯出的內容');
      return;
    }

    setIsExporting(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));

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
            // 建立報告標頭
            const header = clonedDoc.createElement('div');
            header.style.cssText = `
              padding: 24px;
              margin-bottom: 16px;
              background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
              border-radius: 12px;
              color: white;
            `;

            // 標題區塊
            const titleSection = clonedDoc.createElement('div');
            titleSection.style.cssText = 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;';

            const titleLeft = clonedDoc.createElement('div');
            const title = clonedDoc.createElement('h1');
            title.textContent = 'EnGenius EDM Dashboard';
            title.style.cssText = 'font-size: 24px; font-weight: bold; margin: 0 0 4px 0;';

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
            filterSection.style.cssText = 'display: flex; gap: 24px; flex-wrap: wrap;';

            const filters = [
              { label: 'Date Range', value: formatDateRange() },
              { label: 'Region', value: selectedRegion || 'All Regions' },
            ];

            // 只在 region detail view 顯示 Audience
            if (view !== 'overview' && selectedRegion) {
              filters.push({ label: 'Audience', value: getAudienceName() });
            }

            filters.forEach(filter => {
              const filterItem = clonedDoc.createElement('div');

              const label = clonedDoc.createElement('div');
              label.textContent = filter.label;
              label.style.cssText = 'font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.6; margin-bottom: 2px;';

              const value = clonedDoc.createElement('div');
              value.textContent = filter.value;
              value.style.cssText = 'font-size: 14px; font-weight: 600;';

              filterItem.appendChild(label);
              filterItem.appendChild(value);
              filterSection.appendChild(filterItem);
            });

            header.appendChild(titleSection);
            header.appendChild(filterSection);

            // 插入標頭到內容最前面
            clonedElement.insertBefore(header, clonedElement.firstChild);

            // 建立頁尾
            const footer = clonedDoc.createElement('div');
            footer.style.cssText = `
              margin-top: 16px;
              padding: 12px 16px;
              background: #f8fafc;
              border-radius: 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 11px;
              color: #64748b;
            `;
            footer.innerHTML = `
              <span>© ${new Date().getFullYear()} EnGenius Technologies</span>
              <span>Data source: Mailchimp Marketing API</span>
            `;
            clonedElement.appendChild(footer);

            // 隱藏所有按鈕
            const buttons = clonedElement.querySelectorAll('button');
            buttons.forEach(btn => {
              btn.style.display = 'none';
            });

            // 移除 hover 效果
            const hoverElements = clonedElement.querySelectorAll('[class*="hover:"]');
            hoverElements.forEach(el => {
              el.className = el.className.replace(/hover:[^\s]+/g, '');
            });
          }
        }
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');

          const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
          const regionPart = selectedRegion ? `_${selectedRegion}` : '_All_Regions';
          const daysPart = customDateRange ? '_Custom' : `_Last_${selectedDays}_Days`;
          const fullFileName = `${fileName}${regionPart}${daysPart}_${timestamp}.png`;

          link.href = url;
          link.download = fullFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          console.log(`✅ Dashboard exported: ${fullFileName}`);
        }
      }, 'image/png');

    } catch (error) {
      console.error('Export failed:', error);
      alert('匯出失敗，請稍後再試');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={exportToPNG}
      disabled={isExporting}
      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
      title="Export Dashboard as PNG"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span>PNG</span>
        </>
      )}
    </button>
  );
}
