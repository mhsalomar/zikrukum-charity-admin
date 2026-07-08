import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "منصة ذكركم — جمعية تحفيظ القرآن الكريم",
    template: "%s | منصة ذكركم",
  },
  description: "المنصة الإدارية الرسمية لجمعية ذكركم لتحفيظ القرآن الكريم — إدارة الطلاب والمعلمين والحلقات والبرامج القرآنية.",
  keywords: ["تحفيظ القرآن", "جمعية ذكركم", "حلقات قرآنية", "إدارة الجمعية"],
  authors: [{ name: "جمعية ذكركم لتحفيظ القرآن الكريم" }],
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: "website",
    locale: "ar_SA",
    siteName: "منصة ذكركم",
    title: "منصة ذكركم — جمعية تحفيظ القرآن الكريم",
    description: "المنصة الإدارية الرسمية لجمعية ذكركم لتحفيظ القرآن الكريم.",
    images: [
      {
        url: "/logo-zikrukum-v3.png",
        width: 512,
        height: 512,
        alt: "شعار جمعية ذكركم",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700;800&family=Reem+Kufi:wght@500;600;700&display=swap"
        />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
