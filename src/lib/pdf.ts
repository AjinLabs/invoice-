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
  let y = 16;

  const branchName = purchase.branch_name || settings.shop_name || 'TERRY WOMEN';
  const branchAddress = settings.address;
  const branchPhone = settings.phone || '+91 7736723917';

  // 1. Top Section: Shop Name / Brand on Left, "INVOICE" on Right
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(branchName.toUpperCase(), 14, y);

  doc.setFontSize(20);
  doc.setFont('times', 'bold');
  doc.text('INVOICE', pageWidth - 14, y, { align: 'right' });

  y += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text(branchAddress, 14, y);
  doc.text(`Tel: ${branchPhone}`, 14, y + 3.5);
  doc.setTextColor(0, 0, 0);

  y += 8;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(14, y, pageWidth - 14, y);

  // 2. BILLED TO & Invoice Meta
  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BILLED TO:', 14, y);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No. ${purchase.invoice_number}`, pageWidth - 14, y, { align: 'right' });

  y += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text(purchase.customer_name, 14, y);

  const dateFormatted = new Date(purchase.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.text(dateFormatted, pageWidth - 14, y, { align: 'right' });

  if (purchase.customer_phone) {
    y += 4;
    doc.text(`Phone: ${purchase.customer_phone}`, 14, y);
  }
  if (purchase.customer_address) {
    y += 4;
    doc.text(purchase.customer_address, 14, y);
  }

  y += 6;
  doc.line(14, y, pageWidth - 14, y);

  // 3. Table Header
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 16, y);
  doc.text('Quantity', 80, y, { align: 'center' });
  doc.text('Unit Price', 105, y, { align: 'center' });
  doc.text('Total', pageWidth - 16, y, { align: 'right' });

  y += 2.5;
  doc.line(14, y, pageWidth - 14, y);

  // 4. Table Items Rows
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

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

    y += 5.5;
  }

  y += 1;
  doc.line(14, y, pageWidth - 14, y);

  // 5. Totals Section (Right-aligned)
  y += 6;
  const rightColX = pageWidth - 55;
  doc.setFontSize(8.5);

  doc.text('Subtotal', rightColX, y);
  doc.text(`Rs. ${purchase.subtotal.toFixed(2)}`, pageWidth - 16, y, { align: 'right' });

  if (purchase.discount_amount > 0) {
    y += 4.5;
    doc.text('Loyalty Discount (50% OFF 1 KG)', rightColX, y);
    doc.text(`-Rs. ${purchase.discount_amount.toFixed(2)}`, pageWidth - 16, y, { align: 'right' });
  }

  if (typeof purchase.round_off === 'number' && purchase.round_off !== 0) {
    y += 4.5;
    doc.text('Round Off', rightColX, y);
    doc.text(
      `${purchase.round_off > 0 ? '+Rs. ' : '-Rs. '}${Math.abs(purchase.round_off).toFixed(2)}`,
      pageWidth - 16,
      y,
      { align: 'right' }
    );
  }

  y += 4.5;
  doc.text('Tax (0%)', rightColX, y);
  doc.text('Rs. 0.00', pageWidth - 16, y, { align: 'right' });

  y += 3;
  doc.setLineWidth(0.3);
  doc.line(rightColX - 2, y, pageWidth - 14, y);

  y += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', rightColX, y);
  doc.text(`Rs. ${purchase.final_amount.toFixed(2)}`, pageWidth - 16, y, { align: 'right' });

  // 6. Centered "Thank you!"
  y += 14;
  doc.setFontSize(16);
  doc.setFont('times', 'normal');
  doc.text('Thank you!', pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`${branchName} • ${branchAddress} • Tel: ${branchPhone}`, pageWidth / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  return doc;
}
