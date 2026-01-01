import React, { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';

/**
 * ExportButton - 匯出儀表板為圖片
 * 支援 PNG 格式，自動包含目前的篩選設定到檔名
 */
export default function ExportButton({
  targetRef,
  fileName = 'EnGenius_EDM_Dashboard',
  view = 'overview',
  selectedRegion = null,
  selectedDays = 30
}) {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPNG = async () => {
    if (!targetRef.current) {
      alert('無法找到要匯出的內容');
      return;
    }

    setIsExporting(true);

    try {
      // 等待一小段時間確保 DOM 完全渲染
      await new Promise(resolve => setTimeout(resolve, 100));

      // 使用 html2canvas 擷取畫面
      const canvas = await html2canvas(targetRef.current, {
        scale: 2, // 提高解析度（2x）
        useCORS: true, // 允許跨域圖片
        logging: false, // 關閉 console 日誌
        backgroundColor: '#F6F6F4', // 背景色
        windowWidth: targetRef.current.scrollWidth,
        windowHeight: targetRef.current.scrollHeight,
        onclone: (clonedDoc) => {
          // 在複製的 DOM 中隱藏不需要的元素
          const clonedElement = clonedDoc.querySelector('[data-export-content]');
          if (clonedElement) {
            // 隱藏所有按鈕
            const buttons = clonedElement.querySelectorAll('button');
            buttons.forEach(btn => {
              btn.style.display = 'none';
            });

            // 移除 hover 效果相關的 class
            const hoverElements = clonedElement.querySelectorAll('[class*="hover:"]');
            hoverElements.forEach(el => {
              el.className = el.className.replace(/hover:[^\s]+/g, '');
            });
          }
        }
      });

      // 轉換為 PNG 並下載
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');

          // 生成檔名
          const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
          const regionPart = selectedRegion ? `_${selectedRegion}` : '_All_Regions';
          const daysPart = `_Last_${selectedDays}_Days`;
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
