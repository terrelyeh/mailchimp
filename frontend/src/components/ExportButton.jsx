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
  audienceList = [],
  onExportStart = null,
  onExportEnd = null
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

  // 記錄各區塊位置（用於 PDF 分頁）
  const getSectionPositions = () => {
    if (!targetRef.current) return [];

    const targetRect = targetRef.current.getBoundingClientRect();
    const sections = targetRef.current.querySelectorAll('[data-export-section]');
    const positions = [];

    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      positions.push({
        name: section.getAttribute('data-export-section'),
        top: (rect.top - targetRect.top) * 2, // scale: 2
        bottom: (rect.bottom - targetRect.top) * 2,
        height: rect.height * 2
      });
    });

    return positions;
  };

  // 準備 canvas (共用邏輯)
  const prepareCanvas = async () => {
    if (!targetRef.current) {
      throw new Error('無法找到要匯出的內容');
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    // 記錄區塊位置（用於 PDF 分頁）
    const sectionPositions = getSectionPositions();

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
          // 添加整體 padding，讓內容不會太靠近邊緣
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
          // Logo - use filter to make it white on dark background
          const logo = clonedDoc.createElement('img');
          logo.src = '/logo.png';
          logo.alt = 'EnGenius';
          // brightness(0) makes it black, then invert(1) makes it white
          logo.style.cssText = 'height: 36px; width: auto; margin-bottom: 8px; filter: brightness(0) invert(1);';
          logo.onerror = () => {
            // Fallback to text if logo fails to load
            logo.style.display = 'none';
          };
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

          // 只在 region detail view 顯示 Audience
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

          // 插入標頭到內容最前面
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
          buttons.forEach(btn => {
            btn.style.display = 'none';
          });

          // 移除 hover 效果 (注意 SVG 元素的 className 是 SVGAnimatedString)
          const hoverElements = clonedElement.querySelectorAll('[class*="hover:"]');
          hoverElements.forEach(el => {
            if (typeof el.className === 'string') {
              el.className = el.className.replace(/hover:[^\s]+/g, '');
            } else if (el.className && el.className.baseVal !== undefined) {
              // Handle SVG elements
              el.className.baseVal = el.className.baseVal.replace(/hover:[^\s]+/g, '');
            }
          });

          // 移除 KPI Card 標題的截斷 (truncate class)
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

          // 確保圖表區塊正常顯示
          const chartContainers = clonedElement.querySelectorAll('.recharts-responsive-container');
          chartContainers.forEach(chart => {
            const parentCard = chart.closest('.bg-white');
            if (parentCard) {
              parentCard.setAttribute('data-pdf-chart-section', 'true');
            }
          });

          // 替換圖表選擇器區塊為靜態顯示
          const chartSelectorSection = clonedElement.querySelector('.border-b.border-gray-100');
          if (chartSelectorSection && chartSelectorSection.closest('.bg-white')) {
            // 獲取選中的 region buttons (有背景色的)
            const selectedRegionBtns = chartSelectorSection.querySelectorAll('button[style*="background"]');
            const selectedRegions = [];
            selectedRegionBtns.forEach(btn => {
              const text = btn.textContent.trim();
              if (text) selectedRegions.push(text);
            });

            // 獲取選中的 metric buttons (深色背景)
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

            // 建立靜態圖例
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

            // 隱藏原本的選擇器，插入靜態圖例
            chartSelectorSection.style.display = 'none';
            chartSelectorSection.parentNode.insertBefore(legend, chartSelectorSection);
          }
        }
      }
    });

    return { canvas, sectionPositions };
  };

  // 匯出 PNG
  const exportToPNG = async () => {
    setIsExporting(true);
    setExportType('png');
    setShowDropdown(false);

    // Notify parent to expand CampaignList
    if (onExportStart) onExportStart();

    // Wait for React to re-render with all campaigns
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const { canvas } = await prepareCanvas();

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
      if (onExportEnd) onExportEnd();
    }
  };

  // 匯出 PDF
  const exportToPDF = async () => {
    setIsExporting(true);
    setExportType('pdf');
    setShowDropdown(false);

    // Notify parent to expand CampaignList
    if (onExportStart) onExportStart();

    // Wait for React to re-render with all campaigns
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const { canvas, sectionPositions } = await prepareCanvas();

      // PDF 邊距設定 (mm)
      const margin = {
        top: 15,
        bottom: 15,
        left: 15,
        right: 15
      };

      // 建立 PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // 可用內容區域
      const contentWidth = pageWidth - margin.left - margin.right;
      const contentHeight = pageHeight - margin.top - margin.bottom;

      // 輔助函數：將區塊裁切並添加到 PDF
      const addSectionToPdf = (startY, endY, isFirstPage = false) => {
        const sliceHeight = endY - startY;
        if (sliceHeight <= 0) return;

        // 裁切 canvas
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeight;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(
          canvas,
          0, startY, canvas.width, sliceHeight,
          0, 0, canvas.width, sliceHeight
        );

        const sliceImgData = sliceCanvas.toDataURL('image/png');
        const sliceImgHeight = (sliceHeight / canvas.width) * contentWidth;

        // 如果區塊太高，需要分頁
        if (sliceImgHeight > contentHeight) {
          // 計算需要幾頁
          const pixelsPerPage = (contentHeight / sliceImgHeight) * sliceHeight;
          let currentSliceY = 0;
          let isFirst = true;

          while (currentSliceY < sliceHeight) {
            if (!isFirst || !isFirstPage) pdf.addPage();
            isFirst = false;

            const pageSliceHeight = Math.min(pixelsPerPage, sliceHeight - currentSliceY);
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = pageSliceHeight;
            const pageCtx = pageCanvas.getContext('2d');
            pageCtx.drawImage(
              sliceCanvas,
              0, currentSliceY, canvas.width, pageSliceHeight,
              0, 0, canvas.width, pageSliceHeight
            );

            const pageImgData = pageCanvas.toDataURL('image/png');
            const pageImgHeight = (pageSliceHeight / canvas.width) * contentWidth;
            pdf.addImage(pageImgData, 'PNG', margin.left, margin.top, contentWidth, pageImgHeight);

            currentSliceY += pageSliceHeight;
          }
        } else {
          if (!isFirstPage) pdf.addPage();
          pdf.addImage(sliceImgData, 'PNG', margin.left, margin.top, contentWidth, sliceImgHeight);
        }
      };

      // 使用區塊位置進行分頁
      if (sectionPositions.length > 0) {
        // 找到 header 的結束位置（第一個區塊的開始之前是 header）
        const headerEnd = sectionPositions[0].top;

        // 第一頁：Header + Summary 區塊
        const summarySection = sectionPositions.find(s => s.name === 'summary');
        const chartSection = sectionPositions.find(s => s.name === 'chart');
        const detailsSection = sectionPositions.find(s => s.name === 'details');

        // 計算每頁的像素高度限制
        const pixelsPerPage = (contentHeight / contentWidth) * canvas.width;

        // 第一頁：從開始到 chart 區塊之前
        if (chartSection) {
          // 檢查 summary 區塊是否能放在第一頁
          const firstPageEnd = chartSection.top - 20; // chart 開始前留白
          addSectionToPdf(0, firstPageEnd, true);

          // 第二頁：Chart 區塊（獨立一頁）
          addSectionToPdf(chartSection.top, chartSection.bottom, false);

          // 第三頁起：Details 區塊
          if (detailsSection) {
            addSectionToPdf(detailsSection.top, canvas.height, false);
          }
        } else {
          // 沒有 chart 區塊，使用舊的分頁邏輯
          addSectionToPdf(0, canvas.height, true);
        }
      } else {
        // 沒有區塊標記，直接輸出整個 canvas
        const imgAspectRatio = canvas.width / canvas.height;
        const scaledWidth = contentWidth;
        const scaledHeight = scaledWidth / imgAspectRatio;

        if (scaledHeight > contentHeight) {
          // 長內容：分頁處理
          const pixelsPerPage = (contentHeight / scaledHeight) * canvas.height;
          let currentY = 0;
          let isFirst = true;

          while (currentY < canvas.height) {
            if (!isFirst) pdf.addPage();
            isFirst = false;

            const sliceHeight = Math.min(pixelsPerPage, canvas.height - currentY);
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeight;
            const ctx = sliceCanvas.getContext('2d');
            ctx.drawImage(
              canvas,
              0, currentY, canvas.width, sliceHeight,
              0, 0, canvas.width, sliceHeight
            );

            const sliceImgData = sliceCanvas.toDataURL('image/png');
            const sliceImgHeight = (sliceHeight / canvas.width) * contentWidth;
            pdf.addImage(sliceImgData, 'PNG', margin.left, margin.top, contentWidth, sliceImgHeight);

            currentY += sliceHeight;
          }
        } else {
          // 單頁
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', margin.left, margin.top, scaledWidth, scaledHeight);
        }
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
      if (onExportEnd) onExportEnd();
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
