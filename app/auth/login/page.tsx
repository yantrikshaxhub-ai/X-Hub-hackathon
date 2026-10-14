'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push(user.type === 'admin' ? '/admin' : '/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, role);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      pageTitle={
        <>
          <strong>Account</strong> Authentication
        </>
      }
      headerAction={
        <Link href="/auth/register" className="btn-pill btn-pill-secondary btn-pill-sm">
          Need an account? Register &rarr;
        </Link>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 16px' }}>
        <div className="saas-card" style={{ width: '100%', maxWidth: '440px', padding: '36px' }}>
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <div style={{
              width: '46px', height: '46px', background: '#191A1D', color: '#FFFFFF', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
              fontWeight: 800, fontSize: '18px',
            }}>X</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Sign In to X-Hub
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Vel Tech University &bull; Hackathon Portal
            </p>
          </div>

          {/* Role selector */}
          <div style={{ display: 'flex', background: '#F1F3F5', borderRadius: 'var(--radius-pill)', padding: '3px', marginBottom: '20px' }}>
            {[
              { value: 'student', label: 'Student' },
              { value: 'faculty', label: 'Faculty' },
              { value: 'admin', label: 'Administrator' }
            ].map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                  fontSize: '12.5px', fontWeight: 700, transition: 'all 0.15s ease',
                  background: role === r.value ? '#191A1D' : 'transparent',
                  color: role === r.value ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >{r.label}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder={role === 'admin' ? 'admin@veltech.edu.in' : role === 'faculty' ? 'faculty@veltech.edu.in' : 'student@veltech.edu.in'}
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <button type="submit" className="btn-pill btn-pill-primary" disabled={loading} style={{ width: '100%', padding: '12px', marginTop: '6px' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {role === 'student' && (
            <p style={{ textAlign: 'center', fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '20px' }}>
              No account yet?{' '}
              <Link href="/auth/register" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 700 }}>
                Register here &rarr;
              </Link>
            </p>
          )}

          {role === 'admin' && (
            <div style={{ textAlign: 'center', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '16px', background: '#F8F9FA', padding: '10px', borderRadius: '8px', border: '1px solid #EFF1F4' }}>
              Default Superadmin: <strong>admin@veltech.edu.in</strong> / <strong>Admin@XHub2026</strong>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
