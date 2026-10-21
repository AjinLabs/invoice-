import type { Metadata } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://terry7women.vercel.app';
  const imageUrl = `${baseUrl}/api/invoices/${id}/image`;
  const invoicePageUrl = `${baseUrl}/invoice/${id}`;

  return {
    title: 'Invoice',
    description: 'TERRY WOMEN',
    openGraph: {
      title: 'Invoice',
      description: 'TERRY WOMEN',
      url: invoicePageUrl,
      siteName: 'TERRY WOMEN',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 1200,
          alt: 'Invoice',
          type: 'image/png',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Invoice',
      description: 'TERRY WOMEN',
      images: [imageUrl],
    },
  };
}

export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
