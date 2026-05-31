import type { ReactNode } from 'react';

export const metadata = {
  title: 'expenses-web',
  description: 'A GetExp Golden Path web app.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
