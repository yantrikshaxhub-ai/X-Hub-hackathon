'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';

export default function HomePage() {
  const { user, loading } = useAuth();

  return (
    <div className="landing-page-wrapper" style={{ background: '#FFFFFF', minHeight: '100vh', width: '100%' }}>
      {/* Standalone Full-Width Navigation */}
      <Navbar />

      {/* Hero Section */}
      <section style={{
        padding: '84px 24px 72px 24px',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at 50% 10%, rgba(200, 225, 212, 0.4) 0%, rgba(255, 255, 255, 1) 75%), #FFFFFF',
        borderBottom: '1px solid #EFF1F4',
        position: 'relative',
      }}>
        <div style={{ maxWidth: '960px', margin: '0 auto' }}>
          
          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#EDF7F1',
            border: '1px solid #C9EBD6',
            color: '#24633E',
            padding: '6px 18px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            marginBottom: '28px',
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#24633E' }}></span>
            <span>VEL TECH UNIVERSITY &bull; X-HUB HACKATHON 2026 EDITION</span>
          </div>

          {/* Main Title */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5.5vw, 4.2rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            color: '#191A1D',
            marginBottom: '22px',
            letterSpacing: '-0.03em',
          }}>
            Industry Problem Statements.<br />
            <span style={{ color: '#191A1D' }}>Multidisciplinary Squad Formation.</span>
          </h1>

          {/* Description */}
          <p style={{
            fontSize: '17px',
            color: '#555A64',
            lineHeight: 1.7,
            maxWidth: '680px',
            margin: '0 auto 36px auto',
          }}>
            Connecting students across all 8 Vel Tech engineering departments with <strong style={{ color: '#191A1D' }}>101 authentic industry problem statements</strong> from pioneering technology partners. Discover challenges, ping peers, and form winning squads.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '36px' }}>
            <Link
              href="/problems"
              className="btn-pill btn-pill-primary"
              style={{
                padding: '14px 34px',
                fontSize: '15px',
                fontWeight: 700,
                background: '#191A1D',
                color: '#FFFFFF',
                borderRadius: '9999px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
              }}
            >
              Explore 101 Statements &rarr;
            </Link>
            {!loading && !user && (
              <Link
                href="/auth/register"
                className="btn-pill btn-pill-secondary"
                style={{
                  padding: '14px 34px',
                  fontSize: '15px',
                  fontWeight: 700,
                  background: '#FFFFFF',
                  color: '#191A1D',
                  border: '1px solid #D1D5DB',
                  borderRadius: '9999px',
                  textDecoration: 'none',
                }}
              >
                Register as Student
              </Link>
            )}
            {user?.type === 'student' && (
              <Link
                href="/dashboard"
                className="btn-pill btn-pill-secondary"
                style={{
                  padding: '14px 34px',
                  fontSize: '15px',
                  fontWeight: 700,
                  background: '#FFFFFF',
                  color: '#191A1D',
                  border: '1px solid #D1D5DB',
                  borderRadius: '9999px',
                  textDecoration: 'none',
                }}
              >
                Go to Student Dashboard &rarr;
              </Link>
            )}
            {user?.type === 'admin' && (
              <Link
                href="/admin"
                className="btn-pill btn-pill-secondary"
                style={{
                  padding: '14px 34px',
                  fontSize: '15px',
                  fontWeight: 700,
                  background: '#FFFFFF',
                  color: '#191A1D',
                  border: '1px solid #D1D5DB',
                  borderRadius: '9999px',
                  textDecoration: 'none',
                }}
              >
                Go to Admin Control Center &rarr;
              </Link>
            )}
          </div>

          {/* Department tags */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#737780' }}>Participating Branches:</span>
            {['SoC', 'MECH', 'ECE', 'MBA', 'MECT', 'AI&DS', 'CIVIL', 'EEE'].map(dept => (
              <span
                key={dept}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  background: '#F3F4F6',
                  color: '#374151',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  border: '1px solid #E5E7EB',
                }}
              >
                {dept}
              </span>
            ))}
          </div>

        </div>
      </section>

      {/* Stats Bar */}
      <section style={{ padding: '48px 24px', borderBottom: '1px solid #EFF1F4', background: '#F9FAFB' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: '20px',
          }}>
            {[
              { value: '101', label: 'Problem Statements', sub: 'From verified technology partners', icon: '🎯' },
              { value: '8', label: 'Academic Departments', sub: 'SoC, MECH, ECE, MBA, MECT, AI&DS, etc.', icon: '🏛️' },
              { value: '100%', label: 'Collaboration Ready', sub: 'Peer discovery, ping quotas & team lock', icon: '🤝' },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E5E7EB',
                  padding: '24px',
                  textAlign: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{stat.icon}</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#191A1D', letterSpacing: '-0.02em', lineHeight: 1 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#191A1D', marginTop: '8px' }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: '12px', color: '#737780', marginTop: '4px' }}>
                  {stat.sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '80px 24px', borderBottom: '1px solid #EFF1F4', background: '#FFFFFF' }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <span style={{
              display: 'inline-block',
              background: '#EDF6FA',
              border: '1px solid #C8E3EE',
              color: '#2B576D',
              padding: '4px 14px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              marginBottom: '12px',
            }}>
              PARTICIPATION WORKFLOW
            </span>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#191A1D', margin: 0, letterSpacing: '-0.02em' }}>
              How X-Hub Hackathon Works
            </h2>
            <p style={{ color: '#737780', fontSize: '15px', marginTop: '8px' }}>
              Three simple steps to explore challenges and build your multidisciplinary team.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {[
              {
                step: '01',
                title: 'Browse & Filter Statements',
                desc: 'Explore 101 authentic problem statements grouped by industry partner and filter by department eligibility with live capacity metrics.',
              },
              {
                step: '02',
                title: 'Register & Discover Peers',
                desc: 'Register individual interest to instantly unlock the candidate directory. View fellow students across Mech, ECE, SoC, and AI&DS.',
              },
              {
                step: '03',
                title: 'Send Pings & Lock Squads',
                desc: 'Use your allocated ping quota to invite prospective teammates. Once invitations are accepted, squads are finalized.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '18px',
                  border: '1px solid #E5E7EB',
                  padding: '32px 28px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  background: '#191A1D',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 800,
                }}>
                  {item.step}
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#191A1D', margin: 0 }}>
                  {item.title}
                </h3>
                <p style={{ fontSize: '13.5px', color: '#555A64', lineHeight: 1.6, margin: 0 }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Direct Call to Action Section */}
      <section style={{ padding: '64px 24px', background: '#191A1D', color: '#FFFFFF', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '16px' }}>
            Ready to Build the Future?
          </h2>
          <p style={{ fontSize: '15px', color: '#A0AEC0', marginBottom: '32px', maxWidth: '580px', margin: '0 auto 32px auto', lineHeight: 1.6 }}>
            Join hundreds of Vel Tech engineers, designers, and innovators. Find your statement, assemble your team, and present to industry leaders.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/problems"
              style={{
                background: '#FFFFFF',
                color: '#191A1D',
                padding: '14px 32px',
                borderRadius: '9999px',
                fontWeight: 700,
                fontSize: '14.5px',
                textDecoration: 'none',
              }}
            >
              Browse All Statements &rarr;
            </Link>
            {!user && (
              <Link
                href="/auth/register"
                style={{
                  background: 'transparent',
                  color: '#FFFFFF',
                  border: '1px solid #4A5568',
                  padding: '14px 32px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '14.5px',
                  textDecoration: 'none',
                }}
              >
                Register Now
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '40px 24px', textAlign: 'center', color: '#737780', fontSize: '13px', background: '#FFFFFF', borderTop: '1px solid #E5E7EB' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          <div style={{ fontWeight: 700, color: '#191A1D' }}>
            Vel Tech Rangarajan Dr. Sagunthala R&amp;D Institute of Science and Technology &bull; X-Hub Hackathon 2026
          </div>
          <div style={{ marginTop: '8px', color: '#9CA3AF' }}>
            Powered by Next.js &bull; Distributed TiDB Cloud Serverless &bull; Clean SaaS Architecture
          </div>
        </div>
      </footer>
    </div>
  );
}
