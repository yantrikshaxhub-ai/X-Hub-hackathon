'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/AppShell';

interface MentorInfo {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  designation: string;
  expertise?: string;
  department_name?: string;
  department_code?: string;
}

interface Registration {
  id: number;
  status: string;
  registered_at: string;
  ps_db_id: number;
  ps_id: string;
  title: string;
  company_name: string;
  max_registrations: number;
  max_pings_per_student: number;
  max_team_members: number;
  registration_open: number;
  total_registered: number;
  pings_sent: number | null;
  team_id: number | null;
  mentors?: MentorInfo[];
}

interface Invitation {
  id: number;
  status: string;
  created_at: string;
  sender_name?: string;
  sender_vt?: string;
  sender_dept?: string;
  recipient_name?: string;
  ps_id: string;
  ps_title: string;
  company_name: string;
}

interface Team {
  id: number;
  status: string;
  ps_id: string;
  ps_title: string;
  company_name: string;
  max_team_members: number;
  member_count: number;
  slots_remaining: number | null;
  members: { id: number; full_name: string; vt_number: string; department_name: string; role: string }[];
  mentors?: MentorInfo[];
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [received, setReceived] = useState<Invitation[]>([]);
  const [sent, setSent] = useState<Invitation[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [tab, setTab] = useState<'overview' | 'registrations' | 'invitations' | 'teams'>('overview');

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [regRes, invRes, teamRes, notifRes] = await Promise.all([
        fetch('/api/registrations'),
        fetch('/api/invitations?direction=all'),
        fetch('/api/teams'),
        fetch('/api/notifications'),
      ]);
      const [regData, invData, teamData, notifData] = await Promise.all([
        regRes.json(), invRes.json(), teamRes.json(), notifRes.json(),
      ]);
      setRegistrations(regData.registrations || []);
      setReceived(invData.received || []);
      setSent(invData.sent || []);
      setTeams(teamData.teams || []);
      setNotifications(notifData.notifications || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleInvitation = async (id: number, action: 'accept' | 'reject') => {
    setActionMsg('');
    try {
      const res = await fetch(`/api/invitations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setActionMsg(res.ok ? data.message : data.error);
      if (res.ok) fetchAll();
    } catch {
      setActionMsg('Action failed');
    }
  };

  const handleWithdraw = async (regId: number) => {
    if (!confirm('Withdraw from this problem statement?')) return;
    const res = await fetch(`/api/registrations/${regId}`, { method: 'DELETE' });
    const data = await res.json();
    setActionMsg(res.ok ? data.message : data.error);
    if (res.ok) fetchAll();
  };

  const cancelInvitation = async (id: number) => {
    const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' });
    const data = await res.json();
    setActionMsg(res.ok ? data.message : data.error);
    if (res.ok) fetchAll();
  };

  if (authLoading || !user) {
    return (
      <AppShell>
        <div className="loading"><div className="spinner" /> Loading dashboard...</div>
      </AppShell>
    );
  }

  const pendingReceived = received.filter(i => i.status === 'pending');
  const activeRegs = registrations.filter(r => r.status === 'active');
  const displayName = user.name || (user as { full_name?: string }).full_name || 'Student';
  const firstName = displayName.split(' ')[0] || 'Student';

  return (
    <AppShell
      pageTitle={
        <>
          <strong>Welcome back,</strong> {firstName}
        </>
      }
      headerAction={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {(user as { vt_number?: string }).vt_number && (
            <span className="badge-clean gray" style={{ fontFamily: 'monospace' }}>
              {(user as { vt_number?: string }).vt_number}
            </span>
          )}
          <Link href="/problems" className="btn-pill btn-pill-primary btn-pill-sm">
            + Explore Statements
          </Link>
        </div>
      }
    >
      {/* Alert Messages */}
      {actionMsg && (
        <div className={`alert ${actionMsg.includes('failed') || actionMsg.includes('error') || actionMsg.includes('cannot') ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '20px' }}>
          <span>{actionMsg}</span>
          <button onClick={() => setActionMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}>✕</button>
        </div>
      )}

      {/* Summary Statistics Cards */}
      <div className="stats-row">
        {/* Active Registrations Card */}
        <div className="pastel-stat-card lavender">
          <div>
            <div className="stat-card-header">
              <div className="stat-icon-circle">🎯</div>
              <span className="stat-badge">Enrolled</span>
            </div>
            <div className="stat-number">{activeRegs.length}</div>
            <div className="stat-title">Active Registrations</div>
          </div>
          <div className="stat-footer-text">
            Problem statements selected for Hackathon
          </div>
        </div>

        {/* Pending Invites Card */}
        <div className="pastel-stat-card blue">
          <div>
            <div className="stat-card-header">
              <div className="stat-icon-circle">📬</div>
              <span className="stat-badge">{pendingReceived.length > 0 ? 'Action Needed' : 'Up to Date'}</span>
            </div>
            <div className="stat-number">{pendingReceived.length}</div>
            <div className="stat-title">Pending Invitations</div>
          </div>
          <div className="stat-footer-text">
            Incoming squad requests awaiting decision
          </div>
        </div>

        {/* Confirmed Teams Card */}
        <div className="pastel-stat-card mint">
          <div>
            <div className="stat-card-header">
              <div className="stat-icon-circle">👥</div>
              <span className="stat-badge">Squads</span>
            </div>
            <div className="stat-number">{teams.length}</div>
            <div className="stat-title">Confirmed Teams</div>
          </div>
          <div className="stat-footer-text">
            Official formed multidisciplinary squads
          </div>
        </div>

        {/* Dark Charcoal Contrast Card */}
        <div className="pastel-stat-card charcoal">
          <div>
            <div className="stat-card-header">
              <div className="stat-icon-circle">⚡</div>
              <span className="stat-badge">Dispatched</span>
            </div>
            <div className="stat-number">{sent.length}</div>
            <div className="stat-title">Invitations Sent</div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <Link href="/problems" className="btn-pill btn-pill-mint btn-pill-sm" style={{ width: '100%' }}>
              Find Teammates &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Pill Navigation Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <div className="pill-tabs">
          {[
            { key: 'overview', label: '📊 Overview' },
            { key: 'registrations', label: `🎯 Registrations (${activeRegs.length})` },
            { key: 'invitations', label: `📬 Invitations${pendingReceived.length > 0 ? ` (${pendingReceived.length})` : ''}` },
            { key: 'teams', label: `👥 Teams (${teams.length})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`pill-tab ${tab === t.key ? 'active' : ''}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading dashboard content...</div>
      ) : (
        <>
          {/* Overview Tab */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
              {/* Active Registrations Overview */}
              <div className="saas-card">
                <div className="card-header-clean">
                  <h3 className="card-title-clean">Active Registrations</h3>
                  <Link href="/problems" style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 700, textDecoration: 'none' }}>
                    + Browse &rarr;
                  </Link>
                </div>

                {activeRegs.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '12px 0' }}>
                    No active registrations yet. <Link href="/problems" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Explore 101 problem statements &rarr;</Link>
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeRegs.slice(0, 4).map(r => (
                      <div key={r.id} style={{
                        padding: '14px', background: '#F8F9FA', borderRadius: 'var(--radius-md)',
                        display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #EFF1F4',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="badge-clean charcoal" style={{ fontSize: '10.5px' }}>{r.ps_id}</span>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                {r.title ? r.title.slice(0, 28) + '...' : r.ps_id}
                              </span>
                            </div>
                            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>{r.company_name}</div>
                          </div>
                          <div>
                            {r.team_id ? (
                              <span className="badge-clean mint">In Team</span>
                            ) : (
                              <Link href={`/problems/${r.ps_db_id}/students`} className="btn-pill btn-pill-secondary btn-pill-sm" style={{ padding: '4px 10px', fontSize: '11.5px' }}>
                                Find Peers
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Assigned Faculty Mentor snippet */}
                        {r.mentors && r.mentors.length > 0 && (
                          <div style={{
                            fontSize: '11.5px', background: '#FFFFFF', padding: '6px 10px',
                            borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex',
                            alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px',
                          }}>
                            <div>
                              <strong style={{ color: '#2B576D' }}>👨‍🏫 Mentor:</strong> {r.mentors[0].name}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {r.mentors[0].phone && (
                                <a href={`tel:${r.mentors[0].phone}`} style={{ color: '#047857', fontWeight: 700, textDecoration: 'none' }}>
                                  📞 {r.mentors[0].phone}
                                </a>
                              )}
                              <a href={`mailto:${r.mentors[0].email}`} style={{ color: '#0284C7', textDecoration: 'none' }}>
                                ✉️ Email
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Invites Overview */}
              <div className="saas-card">
                <div className="card-header-clean">
                  <h3 className="card-title-clean">Pending Team Invites ({pendingReceived.length})</h3>
                </div>

                {pendingReceived.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '12px 0' }}>
                    No pending invitations awaiting response.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {pendingReceived.slice(0, 3).map(inv => (
                      <div key={inv.id} style={{ padding: '14px', background: '#F8F9FA', borderRadius: 'var(--radius-md)', border: '1px solid #EFF1F4' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>From: {inv.sender_name}</span>
                          <span className="badge-clean lavender">Invite</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                          {inv.sender_dept} &bull; Statement: <strong>{inv.ps_id}</strong> ({inv.company_name})
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-pill btn-pill-primary btn-pill-sm" onClick={() => handleInvitation(inv.id, 'accept')}>
                            ✓ Accept
                          </button>
                          <button className="btn-pill btn-pill-secondary btn-pill-sm" onClick={() => handleInvitation(inv.id, 'reject')}>
                            ✕ Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications Overview */}
              {notifications.length > 0 && (
                <div className="saas-card" style={{ gridColumn: '1 / -1' }}>
                  <div className="card-header-clean">
                    <h3 className="card-title-clean">Recent Notifications</h3>
                    <span className="badge-clean blue">{notifications.length} Updates</span>
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {notifications.slice(0, 5).map(n => (
                      <div key={n.id} style={{
                        padding: '12px 16px', background: n.is_read ? '#FFFFFF' : '#F8F9FA',
                        borderRadius: 'var(--radius-md)', border: '1px solid #EFF1F4',
                        display: 'flex', alignItems: 'flex-start', gap: '12px',
                      }}>
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px',
                          background: n.is_read ? '#CBD5E1' : '#191A1D', flexShrink: 0,
                        }} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: n.is_read ? 600 : 700, color: 'var(--text-primary)' }}>{n.title}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{n.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Registrations Tab */}
          {tab === 'registrations' && (
            <div>
              <div className="card-header-clean">
                <h2 className="card-title-clean" style={{ fontSize: '17px' }}>My Statement Registrations</h2>
                <Link href="/problems" className="btn-pill btn-pill-primary btn-pill-sm">+ Browse Statements</Link>
              </div>

              {registrations.length === 0 ? (
                <div className="saas-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎯</div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>No registrations yet</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '400px', margin: '0 auto 16px auto' }}>
                    Explore 101 authentic industry partner problem statements to enroll.
                  </p>
                  <Link href="/problems" className="btn-pill btn-pill-primary btn-pill-sm">Explore Statements</Link>
                </div>
              ) : (
                <div className="saas-table-container">
                  <table className="saas-table">
                    <thead>
                      <tr>
                        <th>PS ID</th>
                        <th>Problem Statement Title</th>
                        <th>Company / Sponsor</th>
                        <th>Assigned Faculty Mentor</th>
                        <th>Status</th>
                        <th>Ping Quota</th>
                        <th>Team Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map(r => (
                        <tr key={r.id}>
                          <td><span className="badge-clean charcoal">{r.ps_id}</span></td>
                          <td style={{ fontSize: '13.5px', fontWeight: 600, maxWidth: '240px' }}>{r.title || '—'}</td>
                          <td><span className="badge-clean blue">{r.company_name || '—'}</span></td>
                          <td>
                            {r.mentors && r.mentors.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                {r.mentors.map(m => (
                                  <div key={m.id} style={{ fontSize: '12px' }}>
                                    <div style={{ fontWeight: 700, color: '#191A1D' }}>👨‍🏫 {m.name}</div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                                      {m.designation} {m.department_code ? `(${m.department_code})` : ''}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px', fontSize: '11px' }}>
                                      {m.phone && (
                                        <a href={`tel:${m.phone}`} style={{ color: '#047857', fontWeight: 700, textDecoration: 'none' }}>
                                          📞 {m.phone}
                                        </a>
                                      )}
                                      <a href={`mailto:${m.email}`} style={{ color: '#0284C7', textDecoration: 'none' }}>
                                        ✉️ {m.email}
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '11.5px', fontStyle: 'italic' }}>
                                Pending assignment
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`badge-clean ${r.status === 'active' ? 'mint' : 'pink'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td style={{ fontSize: '13px', fontWeight: 600 }}>
                            {r.max_pings_per_student > 0 ? `${r.pings_sent || 0} / ${r.max_pings_per_student}` : 'Unlimited'}
                          </td>
                          <td>
                            {r.team_id ? (
                              <span className="badge-clean mint">In team</span>
                            ) : (
                              <Link href={`/problems/${r.ps_db_id}/students`} className="btn-pill btn-pill-secondary btn-pill-sm" style={{ padding: '4px 10px', fontSize: '11.5px' }}>
                                ⚡ Find Peers
                              </Link>
                            )}
                          </td>
                          <td>
                            {r.status === 'active' && (
                              <button className="btn-pill btn-pill-danger btn-pill-sm" style={{ padding: '4px 10px', fontSize: '11.5px' }} onClick={() => handleWithdraw(r.id)}>
                                Withdraw
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Invitations Tab */}
          {tab === 'invitations' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
              {/* Received */}
              <div className="saas-card">
                <h3 className="card-title-clean" style={{ marginBottom: '16px' }}>Received Invitations ({received.length})</h3>
                {received.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No invitations received yet.</p>
                ) : (
                  received.map(inv => (
                    <div key={inv.id} style={{ padding: '14px', background: '#F8F9FA', borderRadius: 'var(--radius-md)', border: '1px solid #EFF1F4', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 700 }}>From: {inv.sender_name}</span>
                        <span className={`badge-clean ${inv.status === 'pending' ? 'lavender' : inv.status === 'accepted' ? 'mint' : 'pink'}`}>{inv.status}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        {inv.sender_dept} &bull; Statement: <strong>{inv.ps_id}</strong> ({inv.company_name})
                      </div>
                      {inv.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-pill btn-pill-primary btn-pill-sm" onClick={() => handleInvitation(inv.id, 'accept')}>Accept Invite</button>
                          <button className="btn-pill btn-pill-secondary btn-pill-sm" onClick={() => handleInvitation(inv.id, 'reject')}>Decline</button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Sent */}
              <div className="saas-card">
                <h3 className="card-title-clean" style={{ marginBottom: '16px' }}>Sent Invitations ({sent.length})</h3>
                {sent.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No invitations sent yet.</p>
                ) : (
                  sent.map(inv => (
                    <div key={inv.id} style={{ padding: '14px', background: '#F8F9FA', borderRadius: 'var(--radius-md)', border: '1px solid #EFF1F4', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 700 }}>To: {inv.recipient_name}</span>
                        <span className={`badge-clean ${inv.status === 'pending' ? 'lavender' : inv.status === 'accepted' ? 'mint' : 'pink'}`}>{inv.status}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                        Problem: <strong>{inv.ps_id}</strong> ({inv.company_name})
                      </div>
                      {inv.status === 'pending' && (
                        <button className="btn-pill btn-pill-secondary btn-pill-sm" onClick={() => cancelInvitation(inv.id)}>
                          Cancel Invitation
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Teams Tab */}
          {tab === 'teams' && (
            <div>
              {teams.length === 0 ? (
                <div className="saas-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>👥</div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>No teams formed yet</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '400px', margin: '0 auto 16px auto' }}>
                    Send team invitations or accept received pings to finalize your official hackathon squad.
                  </p>
                  <Link href="/problems" className="btn-pill btn-pill-primary btn-pill-sm">Explore Candidates</Link>
                </div>
              ) : (
                teams.map(team => (
                  <div key={team.id} className="saas-card" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span className="badge-clean charcoal">{team.ps_id}</span>
                          <span className="badge-clean blue">{team.company_name}</span>
                        </div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0' }}>{team.ps_title}</h3>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge-clean ${team.status === 'confirmed' ? 'mint' : 'lavender'}`}>
                          {team.status === 'confirmed' ? '✓ Confirmed Squad' : 'Forming'}
                        </span>
                        {team.max_team_members > 0 && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', fontWeight: 600 }}>
                            {team.member_count} / {team.max_team_members} members
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                      {team.members.map(m => (
                        <div key={m.id} style={{
                          background: '#F8F9FA', border: '1px solid #EFF1F4',
                          borderRadius: 'var(--radius-md)', padding: '12px 16px', display: 'flex', flexDirection: 'column',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13.5px' }}>{m.full_name}</span>
                            {m.role === 'leader' && <span className="badge-clean charcoal" style={{ fontSize: '10px' }}>Lead</span>}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace' }}>
                            {m.vt_number} &bull; {m.department_name}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Assigned Faculty Mentors for Squad */}
                    <div style={{ marginTop: '16px', borderTop: '1px solid #EFF1F4', paddingTop: '14px' }}>
                      <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                        👨‍🏫 Assigned Faculty Mentor{team.mentors && team.mentors.length > 1 ? 's' : ''}
                      </div>
                      {(!team.mentors || team.mentors.length === 0) ? (
                        <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          No faculty mentor assigned yet by admin.
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
                          {team.mentors.map(m => (
                            <div key={m.id} style={{
                              background: '#F0F9FF', border: '1px solid #BAE6FD',
                              borderRadius: 'var(--radius-md)', padding: '12px 14px',
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, color: '#0369A1', fontSize: '13px' }}>{m.name}</span>
                                <span className="badge-clean mint" style={{ fontSize: '10px' }}>{m.department_code || m.department_name || 'Mentor'}</span>
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                {m.designation}
                              </div>
                              <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '12px' }}>
                                {m.phone && (
                                  <a href={`tel:${m.phone}`} style={{ color: '#047857', fontWeight: 700, textDecoration: 'none' }}>
                                    📞 {m.phone}
                                  </a>
                                )}
                                <a href={`mailto:${m.email}`} style={{ color: '#0284C7', textDecoration: 'none', fontWeight: 600 }}>
                                  ✉️ {m.email}
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {team.slots_remaining !== null && team.slots_remaining > 0 && (
                      <div style={{ fontSize: '12.5px', color: 'var(--pastel-mint-text)', fontWeight: 600, marginTop: '14px' }}>
                        ⚡ {team.slots_remaining} slot{team.slots_remaining !== 1 ? 's' : ''} available in this squad
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
