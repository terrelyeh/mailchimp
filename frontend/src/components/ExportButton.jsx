import React, { useState, useRef, useEffect } from 'react';
import { Download, Loader2, ChevronDown, Image, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * ExportButton - 匯出儀表板為圖片或 PDF
 * 支援 PNG 和 PDF 格式，包含報告標頭資訊
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
  const [exportType, setExportType] = useState(null); // 'png' or 'pdf'
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
  const generateFileName = (extension) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const regionPart = selectedRegion ? `_${selectedRegion}` : '_All_Regions';
    const daysPart = customDateRange ? '_Custom' : `_Last_${selectedDays}_Days`;
    return `${fileName}${regionPart}${daysPart}_${timestamp}.${extension}`;
  };

  // 準備 canvas (共用邏輯)
  const prepareCanvas = async () => {
    if (!targetRef.current) {
      throw new Error('無法找到要匯出的內容');
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    return await html2canvas(targetRef.current, {
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
  };

  // 匯出 PNG
  const exportToPNG = async () => {
    setIsExporting(true);
    setExportType('png');
    setShowDropdown(false);

    try {
      const canvas = await prepareCanvas();

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = generateFileName('png');
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
      setExportType(null);
    }
  };

  // 匯出 PDF
  const exportToPDF = async () => {
    setIsExporting(true);
    setExportType('pdf');
    setShowDropdown(false);

    try {
      const canvas = await prepareCanvas();

      // 計算 PDF 尺寸 (A4 比例，但根據內容寬度調整)
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // 建立 PDF
      const pdf = new jsPDF({
        orientation: imgHeight > imgWidth * 1.5 ? 'portrait' : 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // 計算縮放比例以適應頁面
      const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const scaledWidth = imgWidth * ratio;
      const scaledHeight = imgHeight * ratio;

      // 置中
      const x = (pageWidth - scaledWidth) / 2;
      const y = 10; // 上邊距

      // 如果內容超過一頁，需要分頁處理
      if (scaledHeight > pageHeight - 20) {
        // 長內容：分頁處理
        const totalPages = Math.ceil(scaledHeight / (pageHeight - 20));
        const sliceHeight = canvas.height / totalPages;

        for (let i = 0; i < totalPages; i++) {
          if (i > 0) pdf.addPage();

          // 裁切 canvas
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeight;
          const ctx = sliceCanvas.getContext('2d');
          ctx.drawImage(
            canvas,
            0, i * sliceHeight, canvas.width, sliceHeight,
            0, 0, canvas.width, sliceHeight
          );

          const sliceImgData = sliceCanvas.toDataURL('image/png');
          const sliceImgHeight = (sliceHeight * pageWidth) / canvas.width;

          pdf.addImage(sliceImgData, 'PNG', 0, 0, pageWidth, sliceImgHeight);
        }
      } else {
        // 單頁
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
      }

      // 儲存 PDF
      pdf.save(generateFileName('pdf'));
      console.log(`✅ PDF exported: ${generateFileName('pdf')}`);

    } catch (error) {
      console.error('PDF export failed:', error);
      alert('PDF 匯出失敗，請稍後再試');
    } finally {
      setIsExporting(false);
      setExportType(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isExporting}
        className="flex items-center gap-1 px-2 md:px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export Dashboard"
      >
        {isExporting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden md:inline">
              {exportType === 'pdf' ? 'PDF...' : 'PNG...'}
            </span>
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Export</span>
            <ChevronDown className="w-3 h-3 hidden md:block" />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {showDropdown && !isExporting && (
        <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <button
            onClick={exportToPNG}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Image className="w-4 h-4 text-green-600" />
            <span>PNG</span>
          </button>
          <button
            onClick={exportToPDF}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-4 h-4 text-red-600" />
            <span>PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}
