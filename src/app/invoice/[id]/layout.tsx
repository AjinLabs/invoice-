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
    title: `TERRY7 WOMEN - Cash Memo #${id}`,
    description: `Official digital cash memo and purchase receipt from TERRY7 WOMEN.`,
    openGraph: {
      title: `👗 TERRY7 WOMEN — Official Cash Memo #${id}`,
      description: `View digital bill, high-resolution photo, and loyalty reward summary.`,
      url: invoicePageUrl,
      siteName: 'TERRY7 WOMEN',
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 1200,
          alt: `TERRY7 WOMEN Cash Memo ${id}`,
          type: 'image/png',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `👗 TERRY7 WOMEN — Cash Memo #${id}`,
      description: `View digital bill, high-resolution photo, and loyalty reward summary.`,
      images: [imageUrl],
    },
  };
}

export default function InvoiceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
