'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/AppShell';

interface AssignedProblem {
  id: number;
  ps_id: string;
  sno: number;
  title: string;
  description: string;
  expected_outcome?: string;
  company_name: string;
  registration_count: number;
  team_count: number;
  max_registrations: number;
  max_team_members: number;
  assigned_at: string;
}

interface Candidate {
  registration_id: number;
  registered_at: string;
  student_id: number;
  student_name: string;
  vt_number: string;
  student_email: string;
  academic_year?: string;
  skills?: string;
  department_name: string;
  department_code: string;
  problem_statement_id: number;
  ps_id: string;
  problem_title: string;
  company_name: string;
  team_id?: number | null;
}

interface Team {
  id: number;
  name: string;
  status: string;
  created_at: string;
  problem_statement_id: number;
  ps_id: string;
  problem_title: string;
  company_name: string;
  lead_name: string;
  lead_vt: string;
  lead_email: string;
  members: {
    student_id: number;
    full_name: string;
    vt_number: string;
    email: string;
    department_code: string;
    role: string;
  }[];
}

export default function FacultyPortalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'problems' | 'candidates' | 'teams'>('problems');
  const [profile, setProfile] = useState<any>(null);
  const [assignedProblems, setAssignedProblems] = useState<AssignedProblem[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.type !== 'faculty')) {
      router.push('/auth/login?role=faculty');
    }
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/faculty/overview');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setAssignedProblems(data.assignedProblems || []);
        setCandidates(data.candidates || []);
        setTeams(data.teams || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.type === 'faculty') {
      fetchData();
    }
  }, [user, fetchData]);

  const filteredCandidates = candidates.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.student_name || '').toLowerCase().includes(q) ||
      (c.vt_number || '').toLowerCase().includes(q) ||
      (c.ps_id || '').toLowerCase().includes(q) ||
      (c.problem_title || '').toLowerCase().includes(q) ||
      (c.skills || '').toLowerCase().includes(q)
    );
  });

  return (
    <AppShell
      pageTitle={
        <>
          <strong>Faculty Mentor</strong> Portal
        </>
      }
      headerAction={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge-clean mint">Mentor Access Active</span>
        </div>
      }
    >
      {/* Mentor Profile Header Banner */}
      <div className="saas-card" style={{
        padding: '24px 28px',
        marginBottom: '24px',
        background: 'radial-gradient(ellipse at 85% 20%, rgba(169, 181, 245, 0.15) 0%, transparent 60%), #FFFFFF',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: '#191A1D',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 800,
          }}>
            👨‍🏫
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#191A1D', margin: 0 }}>
              {profile?.name || user?.name || 'Faculty Mentor'}
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
              {profile?.designation || 'Faculty Member'} &bull; {profile?.department_name || 'Academic Department'} &bull; <a href={`mailto:${profile?.email || user?.email}`} style={{ color: '#191A1D', fontWeight: 600 }}>{profile?.email || user?.email}</a>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href="/problems" className="btn-pill btn-pill-secondary btn-pill-sm">
            Browse All 101 Statements &rarr;
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stats-row" style={{ marginBottom: '24px' }}>
        <div className="pastel-stat-card lavender">
          <div>
            <div className="stat-card-header">
              <div className="stat-icon-circle">🎯</div>
              <span className="stat-badge">Mentoring</span>
            </div>
            <div className="stat-number">{loading ? '...' : assignedProblems.length}</div>
            <div className="stat-title">Assigned Problem Statements</div>
          </div>
          <div className="stat-footer-text">
            Under your academic guidance
          </div>
        </div>

        <div className="pastel-stat-card blue">
          <div>
            <div className="stat-card-header">
              <div className="stat-icon-circle">👨‍🎓</div>
              <span className="stat-badge">Candidates</span>
            </div>
            <div className="stat-number">{loading ? '...' : candidates.length}</div>
            <div className="stat-title">Registered Student Mentees</div>
          </div>
          <div className="stat-footer-text">
            Across multidisciplinary engineering branches
          </div>
        </div>

        <div className="pastel-stat-card mint">
          <div>
            <div className="stat-card-header">
              <div className="stat-icon-circle">👥</div>
              <span className="stat-badge">Active</span>
            </div>
            <div className="stat-number">{loading ? '...' : teams.length}</div>
            <div className="stat-title">Formed Squads &amp; Teams</div>
          </div>
          <div className="stat-footer-text">
            Collaborating on your problem statements
          </div>
        </div>
      </div>

      {/* Pill Navigation Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <div className="pill-tabs">
          <button
            onClick={() => setActiveTab('problems')}
            className={`pill-tab ${activeTab === 'problems' ? 'active' : ''}`}
          >
            📋 Assigned Statements ({assignedProblems.length})
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`pill-tab ${activeTab === 'candidates' ? 'active' : ''}`}
          >
            👨‍🎓 Student Candidates ({candidates.length})
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`pill-tab ${activeTab === 'teams' ? 'active' : ''}`}
          >
            👥 Formed Squads ({teams.length})
          </button>
        </div>
      </div>

      {/* TAB 1: ASSIGNED PROBLEM STATEMENTS */}
      {activeTab === 'problems' && (
        <div>
          {loading ? (
            <div className="loading"><div className="spinner" /> Loading assigned statements...</div>
          ) : assignedProblems.length === 0 ? (
            <div className="saas-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📌</div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#191A1D', margin: 0 }}>
                No Problem Statements Assigned Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px', maxWidth: '480px', margin: '6px auto 16px' }}>
                Your administrator will assign you to one or more industry problem statements as the faculty mentor.
              </p>
              <Link href="/problems" className="btn-pill btn-pill-primary btn-pill-sm">
                Explore Available Problem Statements &rarr;
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {assignedProblems.map(p => (
                <div key={p.id} className="saas-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge-clean charcoal">{p.ps_id}</span>
                        <span className="badge-clean blue">{p.company_name}</span>
                      </div>
                      <span className="badge-clean mint">Active Mentor</span>
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#191A1D', lineHeight: 1.4, marginBottom: '8px' }}>
                      {p.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
                      {p.description}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid #EFF1F4', paddingTop: '16px', marginTop: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        👥 <strong style={{ color: '#191A1D' }}>{p.registration_count}</strong> candidates &bull; <strong style={{ color: '#191A1D' }}>{p.team_count}</strong> squads
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Capacity: {p.max_registrations} max
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Link
                        href={`/problems/${p.id}/students`}
                        className="btn-pill btn-pill-primary btn-pill-sm"
                        style={{ flex: 1, textAlign: 'center' }}
                      >
                        View Candidate Roster &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CANDIDATE DIRECTORY */}
      {activeTab === 'candidates' && (
        <div className="saas-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div>
              <h3 className="card-title-clean" style={{ margin: 0, fontSize: '16px' }}>
                👨‍🎓 Student Candidates Under Your Assigned Problems
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12.5px', margin: '4px 0 0 0' }}>
                Reach out, guide squad formation, and monitor candidate participation.
              </p>
            </div>

            <input
              type="text"
              placeholder="Search by candidate, VT, skills, PS..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '9999px',
                border: '1px solid #D1D5DB',
                fontSize: '13px',
                minWidth: '240px',
              }}
            />
          </div>

          {filteredCandidates.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>
              No student candidates found.
            </p>
          ) : (
            <div className="saas-table-container">
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>VT Number</th>
                    <th>Branch</th>
                    <th>Assigned Problem Statement</th>
                    <th>Registered At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map(c => (
                    <tr key={c.registration_id}>
                      <td>
                        <div style={{ fontWeight: 800, color: '#191A1D', fontSize: '13.5px' }}>
                          {c.student_name}
                        </div>
                        <a href={`mailto:${c.student_email}`} style={{ fontSize: '11.5px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                          {c.student_email}
                        </a>
                      </td>
                      <td>
                        <span className="badge-clean charcoal">{c.vt_number}</span>
                      </td>
                      <td>
                        <span className="badge-clean mint">{c.department_code || c.department_name}</span>
                      </td>
                      <td style={{ maxWidth: '260px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#2B576D' }}>
                          {c.ps_id} &bull; {c.company_name}
                        </div>
                        <div style={{ fontSize: '12.5px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.problem_title}
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(c.registered_at).toLocaleDateString()}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setSelectedCandidate(c)}
                            className="btn-pill btn-pill-secondary btn-pill-sm"
                          >
                            Inspect &rarr;
                          </button>
                          <a
                            href={`mailto:${c.student_email}?subject=Vel Tech Hackathon Mentorship - ${c.ps_id}`}
                            className="btn-pill btn-pill-primary btn-pill-sm"
                          >
                            Email
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TEAMS & SQUADS */}
      {activeTab === 'teams' && (
        <div>
          {teams.length === 0 ? (
            <div className="saas-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>👥</div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#191A1D', margin: 0 }}>
                No Squads Formed Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
                Students are currently sending peer invitations and forming multidisciplinary teams.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {teams.map(t => (
                <div key={t.id} className="saas-card" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => setSelectedTeam(t)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="badge-clean charcoal">{t.ps_id}</span>
                    <span className="badge-clean mint">{t.status.toUpperCase()}</span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#191A1D', margin: '0 0 6px 0' }}>
                    {t.name || `Squad #${t.id}`}
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                    🎯 {t.problem_title} ({t.company_name})
                  </div>

                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Squad Members ({t.members.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                    {t.members.map(m => (
                      <div key={m.student_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#F8F9FA', borderRadius: '8px', fontSize: '12.5px' }}>
                        <div>
                          <strong>{m.full_name}</strong> <span style={{ color: 'var(--text-muted)' }}>({m.vt_number})</span>
                        </div>
                        <span className="badge-clean gray" style={{ fontSize: '10px' }}>{m.department_code || 'Dept'}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedTeam(t); }}
                      className="btn-pill btn-pill-secondary btn-pill-sm"
                      style={{ flex: 1 }}
                    >
                      View Details &rarr;
                    </button>
                    <a
                      href={`mailto:${t.lead_email}?subject=Vel Tech Hackathon - Squad ${t.name || t.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="btn-pill btn-pill-primary btn-pill-sm"
                    >
                      Email Lead
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CANDIDATE DETAIL MODAL */}
      {selectedCandidate && (
        <div className="modal-backdrop" onClick={() => setSelectedCandidate(null)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge-clean charcoal">{selectedCandidate.vt_number}</span>
                <span className="badge-clean mint">{selectedCandidate.department_name || selectedCandidate.department_code}</span>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="modal-close">&times;</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {selectedCandidate.student_name}
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Email: <a href={`mailto:${selectedCandidate.student_email}`} style={{ color: '#191A1D', fontWeight: 600 }}>{selectedCandidate.student_email}</a>
              </div>
            </div>

            <div className="saas-card" style={{ padding: '16px', marginBottom: '20px', background: '#F8F9FA' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Assigned Problem Statement
              </div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#191A1D' }}>
                {selectedCandidate.ps_id}: {selectedCandidate.problem_title}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                <span className="badge-clean blue">🏢 {selectedCandidate.company_name}</span>
                <span className="badge-clean charcoal">
                  📅 {new Date(selectedCandidate.registered_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {selectedCandidate.skills && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Student Skills &amp; Domain Expertise
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedCandidate.skills.split(',').map((s, i) => (
                    <span key={i} className="badge-clean gray" style={{ fontSize: '11.5px' }}>{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <a
                href={`mailto:${selectedCandidate.student_email}?subject=Vel Tech Hackathon Mentorship - ${selectedCandidate.ps_id}`}
                className="btn-pill btn-pill-primary btn-pill-sm"
              >
                Send Email to Student &rarr;
              </a>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="btn-pill btn-pill-secondary btn-pill-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEAM DETAIL MODAL */}
      {selectedTeam && (
        <div className="modal-backdrop" onClick={() => setSelectedTeam(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-clean charcoal">{selectedTeam.ps_id}</span>
                <span className="badge-clean mint">{selectedTeam.status.toUpperCase()}</span>
                <span className="badge-clean blue">{selectedTeam.company_name}</span>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="modal-close">&times;</button>
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#191A1D', margin: '0 0 6px 0' }}>
              {selectedTeam.name || `Squad #${selectedTeam.id}`}
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              🎯 {selectedTeam.problem_title}
            </div>

            <div className="saas-card" style={{ padding: '16px', background: '#F8F9FA', marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Squad Leader
              </div>
              <div style={{ fontWeight: 800, fontSize: '14.5px', color: '#191A1D' }}>
                {selectedTeam.lead_name} <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>({selectedTeam.lead_vt})</span>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                <a href={`mailto:${selectedTeam.lead_email}`} style={{ color: '#191A1D', fontWeight: 600 }}>{selectedTeam.lead_email}</a>
              </div>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Squad Members ({selectedTeam.members?.length || 0})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {selectedTeam.members?.map(m => (
                <div key={m.student_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #F0F2F4' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#191A1D', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                      {m.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#191A1D' }}>
                        {m.full_name} <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>({m.vt_number})</span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{m.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="badge-clean lavender" style={{ fontSize: '11px' }}>{m.department_code || 'Dept'}</span>
                    {m.role === 'leader' && <span className="badge-clean charcoal" style={{ fontSize: '10px' }}>Lead</span>}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <a
                href={`mailto:${selectedTeam.lead_email}?subject=Vel Tech Hackathon - Squad ${selectedTeam.name || selectedTeam.id}`}
                className="btn-pill btn-pill-primary btn-pill-sm"
              >
                Email Squad Lead &rarr;
              </a>
              <button onClick={() => setSelectedTeam(null)} className="btn-pill btn-pill-secondary btn-pill-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
