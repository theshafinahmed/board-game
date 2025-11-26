import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Board Game",
};

export const viewport: Viewport = {
    userScalable: false,
};

import { ThemeProvider } from "@/components/theme-provider";

import { ConvexClientProvider } from "@/components/ConvexClientProvider";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`antialiased`}>
                <ConvexClientProvider>
                    <ThemeProvider
                        attribute="data-theme"
                        defaultTheme="system"
                        enableSystem
                        disableTransitionOnChange
                    >
                        {children}
                    </ThemeProvider>
                </ConvexClientProvider>
            </body>
        </html>
    );
}
