'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'next/navigation';
import CashMemoPreview from '@/components/CashMemoPreview';
import { Purchase, ShopSettings } from '@/lib/types';

function InvoiceContent() {
  const params = useParams();
  const id = params?.id as string;

  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/purchases/${id}`);
        const data = await res.json();
        if (data.success && data.purchase) {
          setPurchase(data.purchase);
          setSettings(data.settings);
        }
      } catch (err) {
        console.error('Failed to load invoice:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-2 sm:p-6 select-none">
      {!imgError && id ? (
        <img
          src={`/api/invoices/${id}/image`}
          alt={`Cash Memo ${purchase?.invoice_number || id}`}
          onError={() => setImgError(true)}
          className="max-w-full sm:max-w-md w-auto h-auto rounded-2xl shadow-2xl border border-neutral-800"
        />
      ) : purchase ? (
        <div className="max-w-md w-full">
          <CashMemoPreview
            customerName={purchase.customer_name}
            customerPhone={purchase.customer_phone}
            customerAddress={purchase.customer_address}
            weightGrams={purchase.weight_grams}
            ratePerKg={purchase.rate_per_kg}
            subtotal={purchase.subtotal}
            discountAmount={purchase.discount_amount}
            roundOff={purchase.round_off}
            finalAmount={purchase.final_amount}
            paymentMethod={purchase.payment_method}
            invoiceNumber={purchase.invoice_number}
            dateStr={new Date(purchase.created_at).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
            settings={settings || undefined}
            items={purchase.items}
            branch={purchase.branch}
            branchName={purchase.branch_name}
          />
        </div>
      ) : (
        <div className="text-neutral-400 text-sm">Invoice not found</div>
      )}
    </div>
  );
}

export default function CustomerInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InvoiceContent />
    </Suspense>
  );
}
