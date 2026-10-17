import './globals.css';
import type { Metadata } from 'next';
import { Inter, Noto_Sans_Thai } from 'next/font/google';
import { Toaster } from "../components/ui/sonner";
import { I18nProvider } from "../lib/i18n";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const notoThai = Noto_Sans_Thai({ subsets: ['thai'], variable: '--font-thai', display: 'swap' });

export const metadata: Metadata = {
    title: 'Share Bill',
    description: 'Easy way to split the bill with your friends / หารบิลกับเพื่อนแบบง่าย ๆ',
    // Next 13.5 has no separate `viewport` export yet.
    viewport: { width: 'device-width', initialScale: 1, viewportFit: 'cover' },
    themeColor: '#ffffff',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="th">
            <body className={`${inter.variable} ${notoThai.variable} font-sans antialiased`}>
                <I18nProvider>
                    {children}
                    <Toaster position="top-center" />
                </I18nProvider>
            </body>
        </html>
    );
}
