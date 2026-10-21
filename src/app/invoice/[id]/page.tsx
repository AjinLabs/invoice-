'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';

function InvoiceContent() {
  const params = useParams();
  const id = params?.id as string;

  if (!id) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start sm:justify-center p-0 sm:p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/invoices/${id}/image`}
        alt="Invoice"
        className="w-full max-w-lg h-auto block m-0 shadow-sm"
      />
    </div>
  );
}

export default function CustomerInvoicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <InvoiceContent />
    </Suspense>
  );
}
