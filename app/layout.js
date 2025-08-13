import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Free JSON, XML, YAML Formatter & Validator - Universal Data Format Converter",
  description: "Free online universal format converter. Format, validate, convert and compare JSON, XML, and YAML data with auto-detection, diff checker, tree view, and real-time validation. Perfect for developers, APIs, and data processing.",
  keywords: [
    "JSON formatter",
    "XML formatter", 
    "YAML formatter",
    "JSON validator",
    "XML validator",
    "YAML validator",
    "format converter",
    "data converter",
    "JSON to XML",
    "JSON to YAML",
    "XML to JSON",
    "YAML to JSON",
    "JSON beautifier",
    "JSON minifier",
    "difference checker",
    "data diff",
    "API tools",
    "developer tools",
    "online formatter",
    "free formatter"
  ].join(", "),
  authors: [{ name: "Universal Formatter" }],
  creator: "Universal Formatter",
  publisher: "Universal Formatter",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://jsonformatter.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Free JSON, XML, YAML Formatter & Validator - Universal Data Format Converter",
    description: "Free online universal format converter. Format, validate, convert and compare JSON, XML, and YAML data with auto-detection and diff checker.",
    url: 'https://jsonformatter.com',
    siteName: 'Universal Format Converter',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Universal JSON, XML, YAML Formatter and Validator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Free JSON, XML, YAML Formatter & Validator",
    description: "Format, validate, convert and compare JSON, XML, and YAML data online for free with auto-detection.",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
  category: 'technology',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
