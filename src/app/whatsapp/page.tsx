'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  ExternalLink,
  Phone,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { Purchase, ShopSettings, WhatsAppMessage } from '@/lib/types';

export default function WhatsAppCenterPage() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [storeWhatsApp, setStoreWhatsApp] = useState('+91 8330889632');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success && data.settings && isMounted) {
          const s = data.settings;
          setStoreWhatsApp(s.whatsapp_number || s.phone || '+91 8330889632');
        }

        const invRes = await fetch('/api/purchases?limit=50');
        const invData = await invRes.json();
        if (invData.success && isMounted) {
          const msgList: WhatsAppMessage[] = (invData.purchases as Purchase[]).map((p) => ({
            id: p.id,
            purchase_id: p.id,
            phone: p.customer_phone,
            message_type: 'INVOICE',
            content: `🧾 CASH MEMO - TERRY7 WOMEN\nCustomer: ${p.customer_name}\nInvoice No: ${p.invoice_number}\nWeight: ${p.weight_kg} KG\nFinal Amount: ₹${p.final_amount.toFixed(2)}`,
            status: 'DELIVERED',
            is_demo: false,
            created_at: p.created_at,
            updated_at: p.created_at,
          }));
          setMessages(msgList);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-neutral-900 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-neutral-900" />
            <span>WhatsApp Cash Memos &amp; Delivery</span>
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time WhatsApp cash memo delivery log and customer receipt records.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs font-bold w-fit">
          <Phone className="w-4 h-4 text-emerald-600" />
          <span>Sender WhatsApp: {storeWhatsApp}</span>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b pb-3">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-neutral-900">Direct WhatsApp Dispatch System</h3>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed">
          On every bill creation, the cashier can tap the green <strong>&quot;Send via WhatsApp&quot;</strong> button to instantly dispatch the complete formatted cash memo, invoice number, dress weight, and 5 KG loyalty balance directly to the customer&apos;s phone. No complex external server connections or third-party fees are required.
        </p>
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-neutral-600" />
            <span>Sent Receipts History ({messages.length})</span>
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            Loading sent WhatsApp messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-400">
            No bills dispatched yet. When you generate customer bills tomorrow, sent receipts will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase text-[10px]">
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Customer Phone</th>
                  <th className="py-3 px-4">Receipt Summary</th>
                  <th className="py-3 px-4">Delivery Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {messages.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-600 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold font-mono text-neutral-900">
                      +91 {m.phone}
                    </td>
                    <td className="py-3 px-4 text-neutral-700 max-w-xs truncate">
                      {m.content.split('\n')[0]} - {m.content.split('\n')[2] || ''}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        DELIVERED
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {m.purchase_id && (
                        <Link
                          href={`/invoice/${m.purchase_id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-black hover:underline"
                        >
                          <span>View Invoice</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
