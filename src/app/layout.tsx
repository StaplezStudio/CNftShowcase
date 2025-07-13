import type { Metadata } from 'next';
import './globals.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import { Toaster } from '@/components/ui/toaster';
import { SolanaWalletProvider } from '@/components/providers/solana-wallet-provider';
import { RpcProvider } from '@/components/providers/rpc-provider';

export const metadata: Metadata = {
  title: 'SolSwapper',
  description: 'An atomic swap marketplace for Solana assets',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <RpcProvider>
          <SolanaWalletProvider>
            {children}
          </SolanaWalletProvider>
        </RpcProvider>
        <Toaster />
      </body>
    </html>
  );
}
