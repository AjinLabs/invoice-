import jsPDF from 'jspdf';
import { Purchase, ShopSettings, PurchaseItem } from './types';

/**
 * Generate a clean, elegant PDF invoice matching the reference invoice design
 */
export function generateInvoicePdf(purchase: Purchase, settings: ShopSettings): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5', // Standard A5 receipt size
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  const branchName = purchase.branch_name || settings.shop_name || 'TERRY 7 WOMEN';
  const branchAddress = settings.address;
  const branchPhone = settings.phone || '+91 8330889632';

  // 1. Top Section: Centered Brand with small INVOICE below
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(branchName.toUpperCase(), pageWidth / 2, y, { align: 'center' });

  y += 4.5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(110, 110, 110);
  doc.text('INVOICE', pageWidth / 2, y, { align: 'center' });

  y += 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(branchAddress, pageWidth / 2, y, { align: 'center' });
  doc.text(`Tel: ${branchPhone}`, pageWidth / 2, y + 3);
  doc.setTextColor(0, 0, 0);

  y += 6.5;
  doc.setDrawColor(9, 67, 39); // Signature Terry Green (#094327)
  doc.setLineWidth(0.8);
  doc.line(14, y, pageWidth - 14, y);

  // 2. BILLED TO & Date (Invoice No removed as requested)
  y += 5.5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO:', 14, y);

  const dateFormatted = new Date(purchase.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(dateFormatted, pageWidth - 14, y, { align: 'right' });

  y += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text(purchase.customer_name, 14, y);

  if (purchase.customer_phone) {
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.text(`Phone: ${purchase.customer_phone}`, 14, y);
  }

  y += 5;
  doc.line(14, y, pageWidth - 14, y);

  // 3. Table Header
  y += 4.5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 16, y);
  doc.text('Quantity', 80, y, { align: 'center' });
  doc.text('Unit Price', 105, y, { align: 'center' });
  doc.text('Total', pageWidth - 16, y, { align: 'right' });

  y += 2.5;
  doc.line(14, y, pageWidth - 14, y);

  // 4. Table Items Rows
  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  const items: PurchaseItem[] = purchase.items && purchase.items.length > 0
    ? purchase.items
    : [
        {
          id: '1',
          description: 'Ladies Readymade Garment / Dress Material',
          quantity: purchase.weight_kg >= 1 ? `${purchase.weight_kg.toFixed(2)} KG` : `${purchase.weight_grams}g`,
          unit_price: purchase.rate_per_kg,
          weight_grams: purchase.weight_grams,
          rate_per_kg: purchase.rate_per_kg,
          amount: purchase.subtotal,
        },
      ];

  for (const item of items) {
    const desc = item.description || 'Garment Item';
    const qty = typeof item.quantity === 'number'
      ? String(item.quantity)
      : item.quantity || (item.weight_grams ? `${(item.weight_grams / 1000).toFixed(2)} KG` : '1');
    const uPrice = item.unit_price ?? item.rate_per_kg ?? 0;
    const lineAmt = item.amount ?? (uPrice * Number(qty) || 0);

    doc.text(desc.length > 35 ? desc.substring(0, 32) + '...' : desc, 16, y);
    doc.text(String(qty), 80, y, { align: 'center' });
    doc.text(`Rs. ${Number(uPrice).toFixed(2)}`, 105, y, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${Number(lineAmt).toFixed(2)}`, pageWidth - 16, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    y += 5;
  }

  y += 1;
  doc.line(14, y, pageWidth - 14, y);

  // 5. Totals Section (Right-aligned, No Tax)
  y += 5;
  const rightColX = pageWidth - 55;
  doc.setFontSize(8);

  doc.text('Subtotal', rightColX, y);
  doc.text(`Rs. ${purchase.subtotal.toFixed(2)}`, pageWidth - 16, y, { align: 'right' });

  if (purchase.discount_amount > 0) {
    y += 4;
    doc.text('Loyalty Discount (50% OFF 1 KG)', rightColX, y);
    doc.text(`-Rs. ${purchase.discount_amount.toFixed(2)}`, pageWidth - 16, y, { align: 'right' });
  }

  if (typeof purchase.round_off === 'number' && purchase.round_off !== 0) {
    y += 4;
    doc.text('Round Off', rightColX, y);
    doc.text(
      `${purchase.round_off > 0 ? '+Rs. ' : '-Rs. '}${Math.abs(purchase.round_off).toFixed(2)}`,
      pageWidth - 16,
      y,
      { align: 'right' }
    );
  }

  y += 2.5;
  doc.setLineWidth(0.3);
  doc.line(rightColX - 2, y, pageWidth - 14, y);

  y += 4.5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', rightColX, y);
  doc.text(`Rs. ${purchase.final_amount.toFixed(2)}`, pageWidth - 16, y, { align: 'right' });

  // 6. Centered "Thank you!" (Small & elegant)
  y += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you!', pageWidth / 2, y, { align: 'center' });

  y += 4;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${branchName} • Tel: ${branchPhone}`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  return doc;
}

/**
 * Generate comprehensive Monthly and Annual Sales Audit Report PDF
 * Sent to terry7women@gmail.com
 */
export function generateMonthlyReportPdf(
  purchases: Purchase[],
  settings: ShopSettings,
  targetMonthStr?: string
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const targetMonth = targetMonthStr || new Date().toISOString().substring(0, 7);
  const currentYear = targetMonth.split('-')[0];

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthIdx = parseInt(targetMonth.split('-')[1], 10) - 1;
  const targetMonthName = monthNames[monthIdx] || targetMonth;

  let y = 18;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TERRY 7 WOMEN', 14, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Store Management Audit & Sales Report', 14, y + 5);
  doc.text(`Report Email: ${settings.email || 'terry7women@gmail.com'} | WhatsApp: ${settings.whatsapp_number || '+91 8330889632'}`, 14, y + 9.5);
  doc.text(`Generated On: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, y + 14);
  doc.setTextColor(0, 0, 0);

  y += 18;
  doc.setDrawColor(9, 67, 39); // Signature Terry Green (#094327)
  doc.setLineWidth(1.2);
  doc.line(14, y, pageWidth - 14, y);

  // Month Highlight
  y += 8;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`1. Performance Summary: ${targetMonthName} ${currentYear}`, 14, y);

  // Filter purchases for target month
  const monthPurchases = purchases.filter(p => p.status === 'COMPLETED' && p.created_at.startsWith(targetMonth));
  const vnbMonthPurchases = monthPurchases.filter(p => (p.branch || 'vnb') === 'vnb');
  const pkdmMonthPurchases = monthPurchases.filter(p => p.branch === 'pkdm');

  const monthTotalSales = monthPurchases.reduce((sum, p) => sum + p.final_amount, 0);
  const monthTotalDiscounts = monthPurchases.reduce((sum, p) => sum + Math.max(0, p.subtotal - p.final_amount), 0);
  const monthTotalWeight = monthPurchases.reduce((sum, p) => sum + (p.weight_grams || 0), 0) / 1000;
  const monthTotalOrders = monthPurchases.length;

  const vnbSales = vnbMonthPurchases.reduce((sum, p) => sum + p.final_amount, 0);
  const vnbWeight = vnbMonthPurchases.reduce((sum, p) => sum + (p.weight_grams || 0), 0) / 1000;
  const vnbDiscounts = vnbMonthPurchases.reduce((sum, p) => sum + Math.max(0, p.subtotal - p.final_amount), 0);

  const pkdmSales = pkdmMonthPurchases.reduce((sum, p) => sum + p.final_amount, 0);
  const pkdmWeight = pkdmMonthPurchases.reduce((sum, p) => sum + (p.weight_grams || 0), 0) / 1000;
  const pkdmDiscounts = pkdmMonthPurchases.reduce((sum, p) => sum + Math.max(0, p.subtotal - p.final_amount), 0);

  // Overview box
  y += 5;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 28, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 28, 3, 3, 'S');

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL NET SALES', 20, y + 8);
  doc.text('TOTAL DISCOUNTS', 75, y + 8);
  doc.text('CLOTHING SOLD', 130, y + 8);
  doc.text('TOTAL ORDERS', 170, y + 8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`Rs. ${monthTotalSales.toFixed(2)}`, 20, y + 17);
  doc.text(`Rs. ${monthTotalDiscounts.toFixed(2)}`, 75, y + 17);
  doc.text(`${monthTotalWeight.toFixed(2)} KG`, 130, y + 17);
  doc.text(`${monthTotalOrders}`, 170, y + 17);

  // Branch breakdown table
  y += 36;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Store Branch Comparison for this Month:', 14, y);

  y += 5;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 6.5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Store Location', 18, y + 4.5);
  doc.text('Net Sales', 75, y + 4.5);
  doc.text('Clothing Sold (KG)', 115, y + 4.5);
  doc.text('Discounts Given', 150, y + 4.5);
  doc.text('Orders', pageWidth - 20, y + 4.5, { align: 'right' });

  y += 7.5;
  doc.setFont('helvetica', 'normal');
  doc.text('Vaniyambalam Store (VNB)', 18, y + 4);
  doc.text(`Rs. ${vnbSales.toFixed(2)}`, 75, y + 4);
  doc.text(`${vnbWeight.toFixed(2)} KG`, 115, y + 4);
  doc.text(`Rs. ${vnbDiscounts.toFixed(2)}`, 150, y + 4);
  doc.text(`${vnbMonthPurchases.length}`, pageWidth - 20, y + 4, { align: 'right' });

  y += 6.5;
  doc.text('Pookkottumpadam Store (PKDM)', 18, y + 4);
  doc.text(`Rs. ${pkdmSales.toFixed(2)}`, 75, y + 4);
  doc.text(`${pkdmWeight.toFixed(2)} KG`, 115, y + 4);
  doc.text(`Rs. ${pkdmDiscounts.toFixed(2)}`, 150, y + 4);
  doc.text(`${pkdmMonthPurchases.length}`, pageWidth - 20, y + 4, { align: 'right' });

  y += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.text('Combined Total', 18, y + 4);
  doc.text(`Rs. ${monthTotalSales.toFixed(2)}`, 75, y + 4);
  doc.text(`${monthTotalWeight.toFixed(2)} KG`, 115, y + 4);
  doc.text(`Rs. ${monthTotalDiscounts.toFixed(2)}`, 150, y + 4);
  doc.text(`${monthTotalOrders}`, pageWidth - 20, y + 4, { align: 'right' });

  y += 12;
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, pageWidth - 14, y);

  // Month-by-month Annual Breakdown Table (Jan to Dec)
  y += 8;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`2. Full Year Month-by-Month Sales Breakdown (${currentYear})`, 14, y);

  y += 5;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 6.5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Month', 18, y + 4.5);
  doc.text('VNB Sales (Rs.)', 65, y + 4.5);
  doc.text('PKDM Sales (Rs.)', 105, y + 4.5);
  doc.text('Combined Total (Rs.)', 145, y + 4.5);
  doc.text('Weight (KG)', pageWidth - 20, y + 4.5, { align: 'right' });

  let annualVnbTotal = 0;
  let annualPkdmTotal = 0;
  let annualCombinedTotal = 0;
  let annualWeightTotal = 0;

  y += 7.5;
  doc.setFont('helvetica', 'normal');

  for (let m = 1; m <= 12; m++) {
    const mStr = `${currentYear}-${String(m).padStart(2, '0')}`;
    const mPurchases = purchases.filter(p => p.status === 'COMPLETED' && p.created_at.startsWith(mStr));
    const mVnb = mPurchases.filter(p => (p.branch || 'vnb') === 'vnb').reduce((s, p) => s + p.final_amount, 0);
    const mPkdm = mPurchases.filter(p => p.branch === 'pkdm').reduce((s, p) => s + p.final_amount, 0);
    const mTotal = mVnb + mPkdm;
    const mWt = mPurchases.reduce((s, p) => s + (p.weight_grams || 0), 0) / 1000;

    annualVnbTotal += mVnb;
    annualPkdmTotal += mPkdm;
    annualCombinedTotal += mTotal;
    annualWeightTotal += mWt;

    const mName = monthNames[m - 1];
    const isCurrent = mStr === targetMonth;

    if (isCurrent) {
      doc.setFillColor(254, 243, 199);
      doc.rect(14, y - 0.5, pageWidth - 28, 5.5, 'F');
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }

    doc.text(mName, 18, y + 3.5);
    doc.text(`Rs. ${mVnb.toFixed(2)}`, 65, y + 3.5);
    doc.text(`Rs. ${mPkdm.toFixed(2)}`, 105, y + 3.5);
    doc.text(`Rs. ${mTotal.toFixed(2)}`, 145, y + 3.5);
    doc.text(`${mWt.toFixed(2)} KG`, pageWidth - 20, y + 3.5, { align: 'right' });

    y += 5.5;
  }

  // Annual Totals Row
  y += 1;
  doc.setLineWidth(0.4);
  doc.line(14, y, pageWidth - 14, y);
  y += 1;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`Total Year ${currentYear}`, 18, y + 4);
  doc.text(`Rs. ${annualVnbTotal.toFixed(2)}`, 65, y + 4);
  doc.text(`Rs. ${annualPkdmTotal.toFixed(2)}`, 105, y + 4);
  doc.text(`Rs. ${annualCombinedTotal.toFixed(2)}`, 145, y + 4);
  doc.text(`${annualWeightTotal.toFixed(2)} KG`, pageWidth - 20, y + 4, { align: 'right' });

  // Footer Note
  y += 14;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Automated monthly sales summary report for TERRY 7 WOMEN management.', pageWidth / 2, y, { align: 'center' });
  doc.text(`Confidential • Sent to terry7women@gmail.com • Store Contact: ${settings.phone || '+91 8330889632'}`, pageWidth / 2, y + 4, { align: 'center' });

  return doc;
}
