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
            margin: '0 auto 28px auto',
          }}>
            Connecting students across all 8 Vel Tech engineering departments with <strong style={{ color: '#191A1D' }}>101 authentic industry problem statements</strong> from pioneering technology partners. Discover challenges, ping peers, and form winning squads.
          </p>

          {/* Active Deadlines Quick Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #E5E7EB',
            borderRadius: '9999px',
            padding: '8px 20px',
            marginBottom: '32px',
            boxShadow: '0 2px 14px rgba(0,0,0,0.04)',
            backdropFilter: 'blur(10px)',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#065F46',
              background: '#D1FAE5',
              padding: '3px 10px',
              borderRadius: '9999px',
            }}>
              <span className="live-pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
              Phase 1 Active
            </span>
            <span style={{ fontSize: '13px', color: '#1F2937', fontWeight: 600 }}>
              PS Selection Deadline: <strong style={{ color: '#0F172A', fontWeight: 800 }}>23 Oct 2026</strong>
            </span>
            <span style={{ color: '#D1D5DB' }}>&bull;</span>
            <span style={{ fontSize: '13px', color: '#1F2937', fontWeight: 600 }}>
              Abstract Submission: <strong style={{ color: '#0F172A', fontWeight: 800 }}>05 Nov 2026</strong>
            </span>
            <a
              href="#timeline"
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#2563EB',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                marginLeft: '4px',
              }}
            >
              Timeline &darr;
            </a>
          </div>

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

      {/* Important Deadlines & Hackathon Roadmap Section */}
      <section id="timeline" style={{ padding: '68px 24px 60px 24px', borderBottom: '1px solid #EFF1F4', background: '#FFFFFF' }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto' }}>
          
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '44px' }}>
            <span style={{
              display: 'inline-block',
              background: '#EDF7F1',
              border: '1px solid #C9EBD6',
              color: '#24633E',
              padding: '4px 14px',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}>
              🗓️ Official Hackathon Timeline
            </span>
            <h2 style={{ fontSize: 'clamp(1.9rem, 3.8vw, 2.4rem)', fontWeight: 800, color: '#191A1D', margin: 0, letterSpacing: '-0.02em' }}>
              Key Deadlines &amp; Submission Milestones
            </h2>
            <p style={{ color: '#737780', fontSize: '15px', marginTop: '10px', maxWidth: '620px', margin: '10px auto 0 auto', lineHeight: 1.6 }}>
              Assemble your interdisciplinary squad, reserve your industry problem statement, and submit your proposal on time.
            </p>
          </div>

          {/* 3 Step Milestone Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
            gap: '22px',
            marginBottom: '36px',
          }}>
            
            {/* Step 1: 23rd October 2026 */}
            <div
              className="milestone-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1.5px solid #10B981',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(16, 185, 129, 0.08)',
                position: 'relative',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#065F46',
                    background: '#D1FAE5',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}>
                    <span className="live-pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                    Active Stage &bull; Step 01
                  </span>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#059669', background: '#ECFDF5', padding: '3px 9px', borderRadius: '6px' }}>
                    Action Required
                  </span>
                </div>

                {/* Date Display Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
                  border: '1px solid #A7F3D0',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  marginBottom: '18px',
                }}>
                  <div style={{
                    background: '#10B981',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '6px 12px',
                    textAlign: 'center',
                    minWidth: '58px',
                  }}>
                    <div style={{ fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.05em' }}>OCT</div>
                    <div style={{ fontSize: '22px', fontWeight: 900, lineHeight: 1 }}>23</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Cutoff Date
                    </div>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#064E3B' }}>
                      23rd October 2026
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#191A1D', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                  Confirm Participation &amp; PS Selection
                </h3>
                <p style={{ fontSize: '13.5px', color: '#555A64', lineHeight: 1.6, margin: 0 }}>
                  Lock your selected challenge from <strong style={{ color: '#191A1D' }}>101 authentic industry problem statements</strong>. Form your multidisciplinary squad across engineering branches before statement capacity closes.
                </p>
              </div>

              <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
                <Link
                  href="/problems"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#059669',
                    textDecoration: 'none',
                  }}
                >
                  Browse Statements &amp; Lock PS &rarr;
                </Link>
              </div>
            </div>

            {/* Step 2: 05th November 2026 */}
            <div
              className="milestone-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1.5px solid #6366F1',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.08)',
                position: 'relative',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#4338CA',
                    background: '#EEF2FF',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}>
                    📝 Core Submission &bull; Step 02
                  </span>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#4F46E5', background: '#EEF2FF', padding: '3px 9px', borderRadius: '6px' }}>
                    Major Milestone
                  </span>
                </div>

                {/* Date Display Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
                  border: '1px solid #C7D2FE',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  marginBottom: '18px',
                }}>
                  <div style={{
                    background: '#6366F1',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '6px 12px',
                    textAlign: 'center',
                    minWidth: '58px',
                  }}>
                    <div style={{ fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.05em' }}>NOV</div>
                    <div style={{ fontSize: '22px', fontWeight: 900, lineHeight: 1 }}>05</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#4338CA', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Submission Deadline
                    </div>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#312E81' }}>
                      05th November 2026
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#191A1D', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                  Idea / Abstract Submission
                </h3>
                <p style={{ fontSize: '13.5px', color: '#555A64', lineHeight: 1.6, margin: 0 }}>
                  Submit your team's concept proposal, technical architecture, and implementation blueprint. Dedicated faculty and industry mentors will be assigned directly to your squad based on submitted abstracts.
                </p>
              </div>

              <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: '12.5px', color: '#6B7280', fontWeight: 600 }}>
                  💡 Mentors assigned following abstract acceptance
                </span>
              </div>
            </div>

            {/* Step 3: 30th November 2026 */}
            <div
              className="milestone-card"
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1.5px solid #F59E0B',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.08)',
                position: 'relative',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: '#B45309',
                    background: '#FEF3C7',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}>
                    🏆 Grand Finale &bull; Step 03
                  </span>
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '3px 9px', borderRadius: '6px' }}>
                    Campus Demo Day
                  </span>
                </div>

                {/* Date Display Badge */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                  border: '1px solid #FDE68A',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  marginBottom: '18px',
                }}>
                  <div style={{
                    background: '#F59E0B',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '6px 12px',
                    textAlign: 'center',
                    minWidth: '58px',
                  }}>
                    <div style={{ fontSize: '9.5px', fontWeight: 800, letterSpacing: '0.05em' }}>NOV</div>
                    <div style={{ fontSize: '22px', fontWeight: 900, lineHeight: 1 }}>30</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Hackathon Day
                    </div>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#78350F' }}>
                      30th November 2026
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#191A1D', marginBottom: '8px', letterSpacing: '-0.01em' }}>
                  Internal Hackathon &amp; Jury Pitch
                </h3>
                <p style={{ fontSize: '13.5px', color: '#555A64', lineHeight: 1.6, margin: 0 }}>
                  Live working prototype evaluation at <strong style={{ color: '#191A1D' }}>Vel Tech Campus, Chennai</strong>. Compete for company awards, patent pathways, and startup incubation support up to ₹8 Lakhs!
                </p>
              </div>

              <div style={{ marginTop: '22px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
                <span style={{ fontSize: '12.5px', color: '#B45309', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  📍 Venue: Vel Tech Campus, Chennai
                </span>
              </div>
            </div>

          </div>

          {/* Student Attraction Perks Banner - Clean & Lightweight */}
          <div style={{
            background: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '16px',
            padding: '16px 20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
            alignItems: 'center',
          }}>
            <div className="perk-pill" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '10px' }}>
              <span style={{ fontSize: '20px' }}>🎓</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#191A1D' }}>Zero Registration Fee</div>
                <div style={{ fontSize: '11.5px', color: '#737780' }}>100% Internal for Vel Tech students</div>
              </div>
            </div>

            <div className="perk-pill" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '10px' }}>
              <span style={{ fontSize: '20px' }}>🚀</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#191A1D' }}>Up to ₹8 Lakhs Support</div>
                <div style={{ fontSize: '11.5px', color: '#737780' }}>Incubation via Vel Tech TBI (DST)</div>
              </div>
            </div>

            <div className="perk-pill" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '10px' }}>
              <span style={{ fontSize: '20px' }}>🤝</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#191A1D' }}>2500+ Industry Network</div>
                <div style={{ fontSize: '11.5px', color: '#737780' }}>Direct partner &amp; recruiter exposure</div>
              </div>
            </div>

            <div className="perk-pill" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '10px' }}>
              <span style={{ fontSize: '20px' }}>📜</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#191A1D' }}>Patents &amp; Startups</div>
                <div style={{ fontSize: '11.5px', color: '#737780' }}>Dedicated industry expert mentorship</div>
              </div>
            </div>
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
