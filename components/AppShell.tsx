'use client';

import Navbar from '@/components/Navbar';

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: React.ReactNode;
  headerAction?: React.ReactNode;
}

export default function AppShell({ children, pageTitle, headerAction }: AppShellProps) {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#F8F9FA',
      color: '#191A1D',
      paddingBottom: '60px',
    }}>
      {/* Top Floating Navigation Bar */}
      <Navbar />

      {/* Main Container */}
      <div style={{
        maxWidth: '1240px',
        margin: '24px auto 0 auto',
        padding: '0 20px',
        boxSizing: 'border-box',
      }}>
        {/* Page Title & Action Bar (if specified) */}
        {(pageTitle || headerAction) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '24px',
            padding: '18px 24px',
            background: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#191A1D', letterSpacing: '-0.02em' }}>
              {pageTitle}
            </div>
            {headerAction && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {headerAction}
              </div>
            )}
          </div>
        )}

        {/* Inner Page View */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}
