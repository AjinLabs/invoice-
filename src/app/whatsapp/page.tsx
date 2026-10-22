'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WhatsAppPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/settings');
  }, [router]);

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center text-xs text-neutral-500">
      Redirecting to Settings...
    </div>
  );
}
