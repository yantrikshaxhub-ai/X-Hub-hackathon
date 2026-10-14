'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

function FloatingNavbarContent() {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && (pathname === path || pathname.startsWith(path + '/'))) return true;
    return false;
  };

  const displayName = user?.name || user?.full_name || 'User';
  const firstName = displayName.split(' ')[0] || 'User';
  const initial = firstName.charAt(0).toUpperCase() || 'U';

  return (
    <header style={{
      position: 'sticky',
      top: '16px',
      zIndex: 1000,
      width: '100%',
      maxWidth: '1240px',
      margin: '0 auto',
      padding: '0 16px',
      boxSizing: 'border-box',
    }}>
      <nav style={{
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(229, 231, 235, 0.9)',
        boxShadow: '0 10px 30px -5px rgba(25, 26, 29, 0.08), 0 4px 12px -2px rgba(25, 26, 29, 0.04)',
        borderRadius: '9999px',
        padding: '8px 12px 8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.2s ease',
      }}>
        {/* Brand */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            color: '#191A1D',
            paddingLeft: '4px',
          }}
        >
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: '#191A1D',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '15px',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            X
          </div>
          <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
            X-HUB <span style={{ color: '#737780', fontWeight: 600 }}>HACKATHON</span>
          </span>
        </Link>

        {/* Center Links (Desktop) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#F3F4F6',
          padding: '4px',
          borderRadius: '9999px',
        }}>
          <Link
            href="/"
            style={{
              color: isActive('/') ? '#191A1D' : '#555A64',
              background: isActive('/') ? '#FFFFFF' : 'transparent',
              fontWeight: isActive('/') ? 700 : 600,
              fontSize: '13px',
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: '9999px',
              boxShadow: isActive('/') ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Home
          </Link>

          <Link
            href="/problems"
            style={{
              color: isActive('/problems') ? '#191A1D' : '#555A64',
              background: isActive('/problems') ? '#FFFFFF' : 'transparent',
              fontWeight: isActive('/problems') ? 700 : 600,
              fontSize: '13px',
              textDecoration: 'none',
              padding: '6px 14px',
              borderRadius: '9999px',
              boxShadow: isActive('/problems') ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Problem Statements
          </Link>

          {!loading && user?.type === 'student' && (
            <Link
              href="/dashboard"
              style={{
                color: isActive('/dashboard') ? '#191A1D' : '#555A64',
                background: isActive('/dashboard') ? '#FFFFFF' : 'transparent',
                fontWeight: isActive('/dashboard') ? 700 : 600,
                fontSize: '13px',
                textDecoration: 'none',
                padding: '6px 14px',
                borderRadius: '9999px',
                boxShadow: isActive('/dashboard') ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Dashboard
            </Link>
          )}

          {!loading && user?.type === 'faculty' && (
            <Link
              href="/faculty"
              style={{
                color: isActive('/faculty') ? '#191A1D' : '#555A64',
                background: isActive('/faculty') ? '#FFFFFF' : 'transparent',
                fontWeight: isActive('/faculty') ? 700 : 600,
                fontSize: '13px',
                textDecoration: 'none',
                padding: '6px 14px',
                borderRadius: '9999px',
                boxShadow: isActive('/faculty') ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Faculty Portal
            </Link>
          )}

          {!loading && user?.type === 'admin' && (
            <Link
              href="/admin"
              style={{
                color: isActive('/admin') ? '#191A1D' : '#555A64',
                background: isActive('/admin') ? '#FFFFFF' : 'transparent',
                fontWeight: isActive('/admin') ? 700 : 600,
                fontSize: '13px',
                textDecoration: 'none',
                padding: '6px 14px',
                borderRadius: '9999px',
                boxShadow: isActive('/admin') ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Admin Panel
            </Link>
          )}
        </div>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!loading && (
            <>
              {user ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    background: '#F3F4F6',
                    padding: '3px 12px 3px 5px',
                    borderRadius: '9999px',
                  }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#191A1D',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}>
                      {initial}
                    </div>
                    <span style={{ fontSize: '13px', color: '#191A1D', fontWeight: 700 }}>
                      {firstName}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #D1D5DB',
                      color: '#374151',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link
                    href="/auth/login"
                    style={{
                      color: '#374151',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '7px 14px',
                      borderRadius: '9999px',
                      border: '1px solid #E5E7EB',
                      background: '#FFFFFF',
                    }}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    style={{
                      color: '#FFFFFF',
                      background: '#191A1D',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      padding: '7px 16px',
                      borderRadius: '9999px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    }}
                  >
                    Register
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: '#F3F4F6',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              cursor: 'pointer',
            }}
            className="floating-nav-mobile-toggle"
            aria-label="Toggle navigation"
          >
            ☰
          </button>
        </div>
      </nav>

      {/* Mobile Drawer (When Open) */}
      {mobileMenuOpen && (
        <div style={{
          marginTop: '8px',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          border: '1px solid #E5E7EB',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: isActive('/') ? '#F3F4F6' : 'transparent',
              color: '#191A1D',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Home
          </Link>
          <Link
            href="/problems"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: isActive('/problems') ? '#F3F4F6' : 'transparent',
              color: '#191A1D',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Problem Statements
          </Link>
          {user?.type === 'student' && (
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: isActive('/dashboard') ? '#F3F4F6' : 'transparent',
                color: '#191A1D',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              Student Dashboard
            </Link>
          )}
          {user?.type === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: isActive('/admin') ? '#F3F4F6' : 'transparent',
                color: '#191A1D',
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              Admin Panel
            </Link>
          )}
        </div>
      )}
    </header>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={
      <header style={{ position: 'sticky', top: '16px', zIndex: 1000, maxWidth: '1240px', margin: '0 auto', padding: '0 16px' }}>
        <nav style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '9999px', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '15px' }}>X-HUB HACKATHON</span>
        </nav>
      </header>
    }>
      <FloatingNavbarContent />
    </Suspense>
  );
}
