import ExcelJS from 'exceljs';
import type { InventoryItem, PurchaseOrderItem, PrelovedItem } from './types';
import { formatDate, formatDateTime, MONTH_NAMES, parseMonthFilter } from './inventory-logic';

/**
 * Downloads ArrayBuffer as an .xlsx file in the browser
 */
function downloadWorkbookBlob(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Fetches an image URL or data URI and returns an image buffer/base64 compatible with ExcelJS
 */
async function resolveImageForExcel(photoUrl: string): Promise<{ base64?: string; buffer?: ArrayBuffer; extension: 'png' | 'jpeg' } | null> {
  try {
    if (!photoUrl) return null;

    if (photoUrl.startsWith('data:image/')) {
      const match = photoUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        const ext = match[1].includes('jpeg') || match[1].includes('jpg') ? 'jpeg' : 'png';
        return { base64: match[2], extension: ext };
      }
    }

    if (photoUrl.startsWith('http') || photoUrl.startsWith('/')) {
      const response = await fetch(photoUrl);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || '';
      const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpeg' : 'png';
      return { buffer: arrayBuffer, extension: ext };
    }
  } catch (e) {
    console.warn('Failed to resolve image for Excel embedding:', e);
  }
  return null;
}

/**
 * Client-Side Excel Export for Inventory Items
 */
export async function generateInventoryExcel(items: InventoryItem[], monthFilter?: string): Promise<void> {
  const monthParsed = parseMonthFilter(monthFilter);
  const monthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]} ${monthParsed.year}` : 'ALL MONTHS';
  const worksheetTitle = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]} ${monthParsed.year}` : 'INVENTORY';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hotel IT Department';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(worksheetTitle, {
    pageSetup: { orientation: 'landscape', fitToPage: true },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  });

  // Title Row 1
  sheet.mergeCells('A1:K1');
  const titleCell1 = sheet.getCell('A1');
  titleCell1.value = 'HOTEL IT INVENTORY';
  titleCell1.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }
  };
  sheet.getRow(1).height = 36;

  // Subtitle Row 2
  sheet.mergeCells('A2:K2');
  const titleCell2 = sheet.getCell('A2');
  titleCell2.value = `DATA BULAN ${monthName.toUpperCase()}`;
  titleCell2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }
  };
  sheet.getRow(2).height = 28;

  // Spacing Row 3
  sheet.getRow(3).height = 10;

  // Header Row 4
  const headers = [
    'No',
    'Foto',
    'Nama Barang',
    'Kategori',
    'Tanggal Rekap',
    'Jumlah Unit',
    'Serial Number',
    'Remark',
    'Added By',
    'Last Edited By',
    'Last Updated'
  ];
  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 30;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' }
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF475569' } },
      right: { style: 'thin', color: { argb: 'FF475569' } }
    };
  });

  sheet.columns = [
    { key: 'no', width: 6 },
    { key: 'photo', width: 14 },
    { key: 'name', width: 34 },
    { key: 'category', width: 22 },
    { key: 'dateRepaired', width: 20 },
    { key: 'quantity', width: 14 },
    { key: 'sn', width: 20 },
    { key: 'remark', width: 24 },
    { key: 'addedBy', width: 16 },
    { key: 'editedBy', width: 16 },
    { key: 'lastUpdated', width: 22 }
  ];

  sheet.autoFilter = 'A4:K4';

  let currentRowIdx = 5;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const row = sheet.getRow(currentRowIdx);
    row.height = 65;

    row.getCell(1).value = i + 1;
    row.getCell(2).value = '';
    row.getCell(3).value = item.itemName;
    row.getCell(4).value = item.category;
    row.getCell(5).value = formatDate(item.dateRepaired);
    row.getCell(6).value = item.quantity ?? 1;
    row.getCell(7).value = item.serialNumber || '-';
    row.getCell(8).value = item.remark || '-';
    row.getCell(9).value = item.createdBy;
    row.getCell(10).value = item.updatedBy;
    row.getCell(11).value = formatDateTime(item.updatedAt);

    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };

    const bgColor = i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
    for (let c = 1; c <= 11; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }

    // Try embedding image
    const imgData = await resolveImageForExcel(item.photoUrl);
    if (imgData) {
      try {
        const imageId = workbook.addImage(imgData as any);
        sheet.addImage(imageId, {
          tl: { col: 1.15, row: currentRowIdx - 1 + 0.1 },
          ext: { width: 68, height: 55 }
        });
      } catch (err) {
        console.warn('Could not embed image for item', item.id, err);
      }
    }

    currentRowIdx++;
  }

  const safeMonthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]}_${monthParsed.year}` : 'ALL_MONTHS';
  const downloadFileName = `HOTEL_IT_INVENTORY_${safeMonthName}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  downloadWorkbookBlob(buffer, downloadFileName);
}

/**
 * Client-Side Excel Export for Purchase Orders
 */
export async function generatePOExcel(items: PurchaseOrderItem[], monthFilter?: string): Promise<void> {
  const monthParsed = parseMonthFilter(monthFilter);
  const monthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]} ${monthParsed.year}` : 'ALL MONTHS';
  const worksheetTitle = monthParsed ? `PO_${MONTH_NAMES[monthParsed.month - 1]}` : 'PURCHASE_ORDERS';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hotel IT Department';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(worksheetTitle, {
    pageSetup: { orientation: 'landscape', fitToPage: true },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  });

  // Title Row 1
  sheet.mergeCells('A1:L1');
  const titleCell1 = sheet.getCell('A1');
  titleCell1.value = 'HOTEL IT - PURCHASE ORDER DATA';
  titleCell1.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }
  };
  sheet.getRow(1).height = 36;

  // Subtitle Row 2
  sheet.mergeCells('A2:L2');
  const titleCell2 = sheet.getCell('A2');
  titleCell2.value = `DATA BULAN ${monthName.toUpperCase()}`;
  titleCell2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }
  };
  sheet.getRow(2).height = 28;

  // Spacing Row 3
  sheet.getRow(3).height = 10;

  // Headers
  const headers = [
    'No',
    'Foto',
    'Item Name',
    'Tanggal Order',
    'Tanggal Kedatangan',
    'Jumlah Unit',
    'For Use',
    'Remarks',
    'Status',
    'Added By',
    'Last Edited By',
    'Last Updated'
  ];
  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 30;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0284C7' }
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF38BDF8' } },
      right: { style: 'thin', color: { argb: 'FF38BDF8' } }
    };
  });

  sheet.columns = [
    { key: 'no', width: 6 },
    { key: 'photo', width: 14 },
    { key: 'name', width: 32 },
    { key: 'dateOrder', width: 18 },
    { key: 'dateArrival', width: 20 },
    { key: 'qty', width: 14 },
    { key: 'forUse', width: 26 },
    { key: 'remarks', width: 30 },
    { key: 'status', width: 18 },
    { key: 'addedBy', width: 16 },
    { key: 'editedBy', width: 16 },
    { key: 'lastUpdated', width: 22 }
  ];

  sheet.autoFilter = 'A4:L4';

  let currentRowIdx = 5;
  for (let i = 0; i < items.length; i++) {
    const po = items[i];
    const row = sheet.getRow(currentRowIdx);
    row.height = 65;

    row.getCell(1).value = i + 1;
    row.getCell(2).value = '';
    row.getCell(3).value = po.itemName;
    row.getCell(4).value = formatDate(po.dateOrder);
    row.getCell(5).value = po.dateArrival ? formatDate(po.dateArrival) : 'Menunggu kedatangan';
    row.getCell(6).value = `${po.quantity} Unit`;
    row.getCell(7).value = po.forUse;
    row.getCell(8).value = po.remarks || '-';
    row.getCell(9).value = po.status;
    row.getCell(10).value = po.createdBy;
    row.getCell(11).value = po.updatedBy;
    row.getCell(12).value = formatDateTime(po.updatedAt);

    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(7).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };

    if (po.status === 'SUDAH DATANG') {
      row.getCell(9).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF065F46' } };
    } else {
      row.getCell(9).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9A3412' } };
    }

    const bgColor = i % 2 === 0 ? 'FFF0F9FF' : 'FFFFFFFF';
    for (let c = 1; c <= 12; c++) {
      const cell = row.getCell(c);
      if (c !== 9) cell.font = { name: 'Arial', size: 9 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }

    const imgData = await resolveImageForExcel(po.photoUrl);
    if (imgData) {
      try {
        const imageId = workbook.addImage(imgData as any);
        sheet.addImage(imageId, {
          tl: { col: 1.15, row: currentRowIdx - 1 + 0.1 },
          ext: { width: 68, height: 55 }
        });
      } catch (err) {
        console.warn('Could not embed image for PO item', po.id, err);
      }
    }

    currentRowIdx++;
  }

  const safeMonthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]}_${monthParsed.year}` : 'ALL_MONTHS';
  const downloadFileName = `HOTEL_IT_PURCHASE_ORDER_${safeMonthName}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  downloadWorkbookBlob(buffer, downloadFileName);
}

/**
 * Client-Side Excel Export for Preloved Items
 */
export async function generatePrelovedExcel(items: PrelovedItem[], monthFilter?: string, categoryFilter?: string): Promise<void> {
  const monthParsed = parseMonthFilter(monthFilter);
  const monthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]} ${monthParsed.year}` : 'ALL MONTHS';
  const worksheetTitle = monthParsed ? `PRELOVED_${MONTH_NAMES[monthParsed.month - 1]}` : 'PRELOVED_DATABASE';

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hotel IT Department';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(worksheetTitle, {
    pageSetup: { orientation: 'landscape', fitToPage: true },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
  });

  // Title Row 1
  sheet.mergeCells('A1:K1');
  const titleCell1 = sheet.getCell('A1');
  titleCell1.value = 'HOTEL IT - PRELOVED DATABASE';
  titleCell1.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell1.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E1B4B' }
  };
  sheet.getRow(1).height = 36;

  // Subtitle Row 2
  sheet.mergeCells('A2:K2');
  const titleCell2 = sheet.getCell('A2');
  titleCell2.value = `DATA BULAN ${monthName.toUpperCase()}${categoryFilter && categoryFilter !== 'All' ? ` • KATEGORI: ${categoryFilter}` : ''}`;
  titleCell2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell2.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF312E81' }
  };
  sheet.getRow(2).height = 28;

  // Spacing Row 3
  sheet.getRow(3).height = 10;

  // Header Row 4
  const headers = [
    'No',
    'Foto',
    'Item Name',
    'Category',
    'Tanggal Dibereskan',
    'Jumlah Unit',
    'Serial Number',
    'Remark',
    'Added By',
    'Last Edited By',
    'Last Updated'
  ];
  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.height = 30;

  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7C3AED' }
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF4338CA' } },
      bottom: { style: 'medium', color: { argb: 'FF4338CA' } },
      left: { style: 'thin', color: { argb: 'FFC4B5FD' } },
      right: { style: 'thin', color: { argb: 'FFC4B5FD' } }
    };
  });

  sheet.columns = [
    { key: 'no', width: 6 },
    { key: 'photo', width: 14 },
    { key: 'name', width: 32 },
    { key: 'category', width: 22 },
    { key: 'dateRepaired', width: 20 },
    { key: 'quantity', width: 14 },
    { key: 'sn', width: 20 },
    { key: 'remark', width: 26 },
    { key: 'addedBy', width: 16 },
    { key: 'editedBy', width: 16 },
    { key: 'lastUpdated', width: 22 }
  ];

  sheet.autoFilter = 'A4:K4';

  let currentRowIdx = 5;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const row = sheet.getRow(currentRowIdx);
    row.height = 65;

    row.getCell(1).value = i + 1;
    row.getCell(2).value = '';
    row.getCell(3).value = item.itemName;
    row.getCell(4).value = item.category;
    row.getCell(5).value = formatDate(item.dateRepaired);
    row.getCell(6).value = item.quantity ?? 1;
    row.getCell(7).value = item.serialNumber || '-';
    row.getCell(8).value = item.remark || '-';
    row.getCell(9).value = item.createdBy;
    row.getCell(10).value = item.updatedBy;
    row.getCell(11).value = formatDateTime(item.updatedAt);

    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };

    const bgColor = i % 2 === 0 ? 'FFF5F3FF' : 'FFFFFFFF';
    for (let c = 1; c <= 11; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }

    const imgData = await resolveImageForExcel(item.photoUrl);
    if (imgData) {
      try {
        const imageId = workbook.addImage(imgData as any);
        sheet.addImage(imageId, {
          tl: { col: 1.15, row: currentRowIdx - 1 + 0.1 },
          ext: { width: 68, height: 55 }
        });
      } catch (err) {
        console.warn('Could not embed image for Preloved item', item.id, err);
      }
    }

    currentRowIdx++;
  }

  const safeMonthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]}_${monthParsed.year}` : 'ALL_MONTHS';
  const downloadFileName = `HOTEL_IT_PRELOVED_${safeMonthName}.xlsx`;

  const buffer = await workbook.xlsx.writeBuffer();
  downloadWorkbookBlob(buffer, downloadFileName);
}
