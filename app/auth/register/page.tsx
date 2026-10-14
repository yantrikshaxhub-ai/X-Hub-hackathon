'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/AppShell';

interface Department { id: number; name: string; code: string; }

export default function RegisterPage() {
  const [role, setRole] = useState<'student' | 'faculty'>('student');
  const [form, setForm] = useState({
    full_name: '',
    vt_number: '',
    email: '',
    department_id: '',
    academic_year: '',
    designation: 'Assistant Professor',
    expertise: '',
    skills: '',
    password: '',
    confirm_password: '',
  });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refresh } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.type === 'admin') router.push('/admin');
      else if (user.type === 'faculty') router.push('/faculty');
      else router.push('/dashboard');
    }
    fetch('/api/departments').then(r => r.json()).then(d => setDepartments(d.departments || []));
  }, [user, router]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm_password) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 8) {
      return setError('Password must be at least 8 characters');
    }

    setLoading(true);
    try {
      const payload: any = {
        type: role,
        full_name: form.full_name,
        name: form.full_name,
        email: form.email,
        department_id: form.department_id ? parseInt(form.department_id) : undefined,
        password: form.password,
      };

      if (role === 'student') {
        payload.vt_number = form.vt_number;
        payload.academic_year = form.academic_year;
        payload.skills = form.skills;
      } else {
        payload.designation = form.designation;
        payload.expertise = form.expertise;
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else {
        await refresh();
        if (role === 'faculty') {
          router.push('/faculty');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      console.error(err);
      setError('Registration error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      pageTitle={
        <>
          <strong>Account</strong> Registration
        </>
      }
      headerAction={
        <Link href="/auth/login" className="btn-pill btn-pill-secondary btn-pill-sm">
          Already registered? Sign In &rarr;
        </Link>
      }
    >
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 12px' }}>
        <div className="saas-card" style={{ width: '100%', maxWidth: '520px', padding: '36px' }}>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <div style={{
              width: '46px', height: '46px', background: '#191A1D', color: '#FFFFFF', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
              fontWeight: 800, fontSize: '18px',
            }}>X</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              {role === 'faculty' ? 'Faculty Mentor Registration' : 'Student Portal Registration'}
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              X-Hub Hackathon 2026 &bull; Vel Tech University
            </p>
          </div>

          {/* Role selector */}
          <div style={{ display: 'flex', background: '#F1F3F5', borderRadius: 'var(--radius-pill)', padding: '3px', marginBottom: '22px' }}>
            {[
              { value: 'student', label: 'Student Candidate' },
              { value: 'faculty', label: 'Faculty Mentor' }
            ].map(r => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value as any)}
                style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
                  fontSize: '12.5px', fontWeight: 700, transition: 'all 0.15s ease',
                  background: role === r.value ? '#191A1D' : 'transparent',
                  color: role === r.value ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >{r.label}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Full Name *
              </label>
              <input
                type="text"
                placeholder={role === 'faculty' ? 'Dr. / Prof. Full Name' : 'As per university records'}
                value={form.full_name}
                onChange={set('full_name')}
                required
              />
            </div>

            {role === 'student' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    VT Number *
                  </label>
                  <input type="text" placeholder="e.g. 21BCE0001"
                    value={form.vt_number} onChange={set('vt_number')} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Academic Year
                  </label>
                  <select value={form.academic_year} onChange={set('academic_year')}>
                    <option value="">Select year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Designation *
                </label>
                <select value={form.designation} onChange={set('designation')}>
                  <option value="Assistant Professor">Assistant Professor</option>
                  <option value="Associate Professor">Associate Professor</option>
                  <option value="Professor">Professor</option>
                  <option value="Head of Department">Head of Department (HoD)</option>
                  <option value="Industry Mentor">Industry Mentor</option>
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                University Email *
              </label>
              <input
                type="email"
                placeholder={role === 'faculty' ? 'facultyname@veltech.edu.in' : 'vtnumber@veltech.edu.in'}
                value={form.email}
                onChange={set('email')}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Department *
              </label>
              <select value={form.department_id} onChange={set('department_id')} required>
                <option value="">Select Department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>

            {role === 'student' ? (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Technical Skills &amp; Domain Interests
                </label>
                <input
                  type="text"
                  placeholder="e.g. React, Python, Computer Vision, CAD, Embedded C"
                  value={form.skills}
                  onChange={set('skills')}
                />
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Areas of Expertise / Research Specialization
                </label>
                <input
                  type="text"
                  placeholder="e.g. Artificial Intelligence, Robotics, Mechatronics, IoT, VLSI"
                  value={form.expertise}
                  onChange={set('expertise')}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Password *
                </label>
                <input type="password" placeholder="Min 8 chars"
                  value={form.password} onChange={set('password')} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Confirm Password *
                </label>
                <input type="password" placeholder="Repeat password"
                  value={form.confirm_password} onChange={set('confirm_password')} required />
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', fontSize: '12.5px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-pill btn-pill-primary"
              style={{ width: '100%', marginTop: '6px' }}
            >
              {loading ? 'Creating Account...' : `Register as ${role === 'faculty' ? 'Faculty Mentor' : 'Student'} →`}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
