'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/AppShell';

interface Student {
  id: number;
  full_name: string;
  vt_number: string;
  academic_year: string;
  skills: string;
  department_name: string;
  is_me: number;
  pending_invite_status: string | null;
  has_team: number | null;
}

interface Quota {
  pings_sent: number;
  max_pings_per_student: number;
  remaining: number | null;
}

interface Mentor {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  designation: string;
  expertise?: string;
  department_name?: string;
  department_code?: string;
}

interface PSDetail {
  id: number;
  ps_id: string;
  title: string;
  company_name: string;
  registration_open: number;
  max_team_members: number;
  mentors?: Mentor[];
}

export default function PSStudentsPage({ params }: { params: Promise<{ id: string }> }) {
  const [psId, setPsId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [psDetail, setPsDetail] = useState<PSDetail | null>(null);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error'>('success');
  const [inviteStudent, setInviteStudent] = useState<Student | null>(null);
  const [selectedStudentModal, setSelectedStudentModal] = useState<Student | null>(null);
  const [inviteMsg, setInviteMsg] = useState('');
  const [sending, setSending] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    params.then(p => setPsId(p.id));
  }, [params]);

  const fetchData = useCallback(async () => {
    if (!psId) return;
    setLoading(true);
    try {
      const [studRes, psRes] = await Promise.all([
        fetch(`/api/problems/${psId}/students`),
        fetch(`/api/problems/${psId}`),
      ]);

      if (!studRes.ok) {
        const err = await studRes.json();
        setMsg(err.error || 'Could not load students');
        setMsgType('error');
      } else {
        const studData = await studRes.json();
        setStudents(studData.students || []);
        setQuota(studData.quota);
        if (studData.mentors) {
          setMentors(studData.mentors);
        }
      }

      if (psRes.ok) {
        const psData = await psRes.json();
        setPsDetail(psData.problem);
        if (psData.problem?.mentors && (!studRes.ok || mentors.length === 0)) {
          setMentors(psData.problem.mentors);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [psId]);

  useEffect(() => {
    if (!user) { router.push('/auth/login'); return; }
    fetchData();
  }, [user, router, fetchData]);

  const sendInvitation = async () => {
    if (!inviteStudent || !psId) return;
    setSending(true);
    setInviteMsg('');
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_id: inviteStudent.id,
          problem_statement_id: parseInt(psId),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteMsg('Invitation sent!');
        setMsg(`Team invitation sent to ${inviteStudent.full_name}`);
        setMsgType('success');
        setInviteStudent(null);
        fetchData();
      } else {
        setInviteMsg(data.error || 'Failed to send invitation');
      }
    } finally {
      setSending(false);
    }
  };

  const canSendPing = quota && (quota.remaining === null || quota.remaining > 0);

  return (
    <AppShell
      pageTitle={
        <>
          <strong>Candidate</strong> Directory
        </>
      }
      headerAction={
        <button
          onClick={() => router.push('/problems')}
          className="btn-pill btn-pill-secondary btn-pill-sm"
        >
          &larr; Back to Statements
        </button>
      }
    >
      {/* Problem Header Information */}
      {psDetail && (
        <div className="saas-card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge-clean charcoal">{psDetail.ps_id}</span>
            <span className="badge-clean blue">{psDetail.company_name}</span>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            {psDetail.title || 'Problem Statement'}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Registered candidates for collaboration and squad formation.
          </p>
        </div>
      )}

      {/* Quota & Limit Metrics */}
      {quota && (
        <div className="stats-row">
          <div className="pastel-stat-card lavender">
            <div>
              <div className="stat-card-header">
                <div className="stat-icon-circle">⚡</div>
                <span className="stat-badge">Quota</span>
              </div>
              <div className="stat-number">
                {quota.pings_sent} <span style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 500 }}>/ {quota.max_pings_per_student || '∞'}</span>
              </div>
              <div className="stat-title">Invitations Sent</div>
            </div>
            {quota.remaining !== null && (
              <div className="stat-footer-text" style={{ fontWeight: 600, color: quota.remaining === 0 ? '#991B1B' : 'var(--pastel-mint-text)' }}>
                {quota.remaining === 0 ? 'Quota limit reached' : `${quota.remaining} pings remaining`}
              </div>
            )}
          </div>

          <div className="pastel-stat-card mint">
            <div>
              <div className="stat-card-header">
                <div className="stat-icon-circle">👥</div>
                <span className="stat-badge">Candidates</span>
              </div>
              <div className="stat-number">{students.length}</div>
              <div className="stat-title">Registered Candidates</div>
            </div>
            <div className="stat-footer-text">
              Students available for this statement
            </div>
          </div>

          <div className="pastel-stat-card blue">
            <div>
              <div className="stat-card-header">
                <div className="stat-icon-circle">🎯</div>
                <span className="stat-badge">Squad Size</span>
              </div>
              <div className="stat-number">{psDetail?.max_team_members || '4'}</div>
              <div className="stat-title">Max Members</div>
            </div>
            <div className="stat-footer-text">
              Official hackathon team limit
            </div>
          </div>
        </div>
      )}

      {/* Assigned Faculty Mentors Banner */}
      {mentors.length > 0 && (
        <div className="saas-card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #F0F9FF 0%, #FFFFFF 100%)', border: '1px solid #BAE6FD' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>👨‍🏫</span>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0369A1', margin: 0 }}>
                  Assigned Faculty Mentor{mentors.length > 1 ? 's' : ''}
                </h3>
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Assigned academic guide & domain specialist for this problem statement
                </div>
              </div>
            </div>
            <span className="badge-clean mint" style={{ fontSize: '11px' }}>
              {mentors.length} Mentor{mentors.length > 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {mentors.map(m => (
              <div key={m.id} style={{
                background: '#FFFFFF', border: '1px solid #E0F2FE', borderRadius: 'var(--radius-md)',
                padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: 0 }}>{m.name}</h4>
                    <span className="badge-clean lavender" style={{ fontSize: '10px' }}>{m.department_code || m.department_name || 'Academic'}</span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {m.designation}
                  </div>
                  {m.expertise && (
                    <div style={{ fontSize: '11.5px', color: '#334155', background: '#F8FAFC', padding: '6px 10px', borderRadius: '6px', marginBottom: '10px' }}>
                      🔬 <strong>Expertise:</strong> {m.expertise}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '8px', fontSize: '12px' }}>
                  {m.phone && (
                    <a href={`tel:${m.phone}`} style={{ color: '#047857', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      📞 {m.phone}
                    </a>
                  )}
                  <a href={`mailto:${m.email}`} style={{ color: '#0284C7', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ✉️ {m.email}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {msg && (
        <div className={`alert alert-${msgType}`} style={{ marginBottom: '20px' }}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px' }}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading candidates...</div>
      ) : students.length === 0 ? (
        <div className="saas-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>👥</div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>No candidates registered yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '400px', margin: '0 auto' }}>
            Be the first to register for this problem statement to initiate peer collaboration.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '18px' }}>
          {students.map(s => (
            <div
              key={s.id}
              className="saas-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => setSelectedStudentModal(s)}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {s.full_name}
                      {s.is_me === 1 && <span className="badge-clean charcoal" style={{ fontSize: '10px' }}>You</span>}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '2px' }}>
                      {s.vt_number}
                    </div>
                  </div>
                  <div>
                    {s.has_team ? (
                      <span className="badge-clean gray">In Squad</span>
                    ) : s.pending_invite_status ? (
                      <span className="badge-clean lavender">Invited</span>
                    ) : (
                      <span className="badge-clean mint">Available</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'inline-flex', padding: '3px 8px', background: '#F8F9FA', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '10px', border: '1px solid #EFF1F4' }}>
                  {s.department_name} {s.academic_year ? `&bull; ${s.academic_year}` : ''}
                </div>

                {s.skills && (
                  <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', marginBottom: '14px', lineHeight: 1.4, background: '#FAFAFB', padding: '8px 10px', borderRadius: '8px', border: '1px solid #F0F2F4' }}>
                    <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>
                      Skills
                    </span>
                    {s.skills}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F3F5F7' }}>
                {s.is_me !== 1 && !s.has_team && !s.pending_invite_status && (
                  <button
                    className="btn-pill btn-pill-primary btn-pill-sm"
                    style={{ width: '100%', justifyContent: 'center' }}
                    disabled={!canSendPing}
                    onClick={(e) => {
                      e.stopPropagation();
                      setInviteStudent(s);
                    }}
                  >
                    ⚡ Send Team Invite
                  </button>
                )}
                {s.pending_invite_status && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', fontWeight: 600 }}>
                    Invitation {s.pending_invite_status}
                  </div>
                )}
                {s.has_team ? (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    Already in a squad
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Profile Modal */}
      {selectedStudentModal && (
        <div className="modal-backdrop" onClick={() => setSelectedStudentModal(null)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-clean charcoal">{selectedStudentModal.vt_number}</span>
                <span className="badge-clean mint">{selectedStudentModal.department_name}</span>
              </div>
              <button className="modal-close" onClick={() => setSelectedStudentModal(null)}>✕</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {selectedStudentModal.full_name}
              </h2>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {selectedStudentModal.department_name} {selectedStudentModal.academic_year ? `• Year ${selectedStudentModal.academic_year}` : ''}
              </div>
            </div>

            {selectedStudentModal.skills && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Skills &amp; Domain Expertise
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedStudentModal.skills.split(',').map((s, i) => (
                    <span key={i} className="badge-clean gray" style={{ fontSize: '11.5px' }}>{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: '1px solid #EFF1F4', paddingTop: '14px' }}>
              <button className="btn-pill btn-pill-secondary btn-pill-sm" onClick={() => setSelectedStudentModal(null)}>
                Close
              </button>
              {selectedStudentModal.is_me !== 1 && !selectedStudentModal.has_team && !selectedStudentModal.pending_invite_status && (
                <button
                  className="btn-pill btn-pill-primary btn-pill-sm"
                  disabled={!canSendPing}
                  onClick={() => {
                    const target = selectedStudentModal;
                    setSelectedStudentModal(null);
                    setInviteStudent(target);
                  }}
                >
                  ⚡ Send Team Invite
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {inviteStudent && (
        <div className="modal-backdrop" onClick={() => setInviteStudent(null)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ fontSize: '18px' }}>Send Team Invitation</h2>
              <button className="modal-close" onClick={() => setInviteStudent(null)}>✕</button>
            </div>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Send an official hackathon team invitation to <strong>{inviteStudent.full_name}</strong> ({inviteStudent.vt_number}) for statement <strong>{psDetail?.ps_id}</strong>?
            </p>
            {inviteMsg && (
              <div className={`alert ${inviteMsg.includes('!') ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: '14px' }}>
                {inviteMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-pill btn-pill-secondary btn-pill-sm" onClick={() => setInviteStudent(null)}>Cancel</button>
              <button className="btn-pill btn-pill-primary btn-pill-sm" onClick={sendInvitation} disabled={sending}>
                {sending ? 'Sending...' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
