'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/lib/auth-context';

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

interface Problem {
  id: number;
  ps_id: string;
  sno: number;
  title: string;
  description: string;
  background?: string | null;
  expected_outcome?: string | null;
  remarks?: string | null;
  company_name: string;
  department_raw: string;
  departments: { id: number; name: string; code: string }[];
  mentors?: Mentor[];
  registration_count: number;
  max_registrations: number;
  max_pings_per_student: number;
  max_team_members: number;
  registration_open: number;
  registration_slots_remaining: number | null;
  team_count: number;
  needs_config_review: number;
}

const DEPARTMENTS_LIST = [
  { name: 'All Departments', code: 'ALL' },
  { name: 'School of Computing', code: 'SoC' },
  { name: 'Mechanical Engineering', code: 'MECH' },
  { name: 'Electronics and Communication Engineering', code: 'ECE' },
  { name: 'Master of Business Administration', code: 'MBA' },
  { name: 'Mechatronics Engineering', code: 'MECT' },
  { name: 'Artificial Intelligence and Data Science', code: 'AI&DS' },
  { name: 'Civil Engineering', code: 'CIVIL' },
  { name: 'Electrical and Electronics Engineering', code: 'EEE' },
];

function CapacityBar({ current, max }: { current: number; max: number }) {
  if (!max) return <span className="badge-clean gray">No limit</span>;
  const pct = Math.min(100, (current / max) * 100);
  const isFull = current >= max;
  return (
    <div style={{ width: '100%', marginTop: '6px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: 600 }}>
        <span>{current} / {max} registered</span>
        <span style={{ color: isFull ? '#991B1B' : 'var(--text-primary)' }}>
          {isFull ? 'Full' : `${max - current} slots left`}
        </span>
      </div>
      <div style={{ width: '100%', height: '6px', background: '#F1F3F6', borderRadius: '9999px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: isFull ? '#EF4444' : 'var(--pastel-mint-text)',
            borderRadius: '9999px',
            transition: 'width 0.4s ease'
          }}
        />
      </div>
    </div>
  );
}

function ProblemCard({ problem, onView }: { problem: Problem; onView: () => void }) {
  const isFull = problem.max_registrations > 0 && problem.registration_count >= problem.max_registrations;
  const isOpen = problem.registration_open === 1;

  return (
    <div
      onClick={onView}
      className="saas-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        minHeight: '280px',
      }}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge-clean charcoal">{problem.ps_id}</span>
            <span className="badge-clean blue" style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {problem.company_name}
            </span>
          </div>
          <div>
            {!isOpen ? (
              <span className="badge-clean gray">Closed</span>
            ) : isFull ? (
              <span className="badge-clean pink">Full</span>
            ) : (
              <span className="badge-clean mint">Open</span>
            )}
          </div>
        </div>

        <h3 style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1.4, color: 'var(--text-primary)', marginBottom: '8px' }}>
          {problem.title || 'Untitled Problem Statement'}
        </h3>

        <p style={{
          fontSize: '12.5px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          marginBottom: '14px'
        }}>
          {problem.description || problem.background || 'No description provided.'}
        </p>
      </div>

      <div>
        {/* Department Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
          {problem.departments && problem.departments.length > 0 ? (
            problem.departments.slice(0, 3).map(d => (
              <span key={d.id} className="badge-clean lavender">
                {d.code || d.name}
              </span>
            ))
          ) : problem.department_raw ? (
            <span className="badge-clean lavender">{problem.department_raw}</span>
          ) : (
            <span className="badge-clean gray">All Depts</span>
          )}
          {problem.departments && problem.departments.length > 3 && (
            <span className="badge-clean gray">+{problem.departments.length - 3}</span>
          )}
        </div>

        <CapacityBar current={problem.registration_count} max={problem.max_registrations} />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid #F3F5F7',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}>
          <span>{problem.team_count} squads formed</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
            Inspect &rarr;
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ProblemsPage() {
  const { user } = useAuth();
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedCompany, setSelectedCompany] = useState('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [viewMode, setViewMode] = useState<'company' | 'grid'>('company');

  // Modal
  const [activeModal, setActiveModal] = useState<Problem | null>(null);
  const [registering, setRegistering] = useState(false);
  const [regMsg, setRegMsg] = useState<{ text: string; success: boolean } | null>(null);

  // Load problems
  const loadProblems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/problems?limit=all');
      if (res.ok) {
        const data = await res.json();
        setAllProblems(data.problems || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProblems();
  }, [loadProblems]);

  // Extract unique companies
  const companiesList = useMemo(() => {
    const set = new Set<string>();
    for (const p of allProblems) {
      if (p.company_name) set.add(p.company_name);
    }
    return Array.from(set).sort();
  }, [allProblems]);

  // Filter problems
  const filteredProblems = useMemo(() => {
    return allProblems.filter(p => {
      if (search) {
        const q = search.toLowerCase();
        const matchesId = p.ps_id.toLowerCase().includes(q);
        const matchesTitle = (p.title || '').toLowerCase().includes(q);
        const matchesComp = (p.company_name || '').toLowerCase().includes(q);
        const matchesDesc = (p.description || '').toLowerCase().includes(q);
        if (!matchesId && !matchesTitle && !matchesComp && !matchesDesc) return false;
      }

      if (selectedDept !== 'ALL') {
        const deptNorm = selectedDept.toLowerCase();
        const hasDeptTag = p.departments?.some(d =>
          d.name.toLowerCase().includes(deptNorm) || d.code.toLowerCase().includes(deptNorm)
        );
        const hasRaw = (p.department_raw || '').toLowerCase().includes(deptNorm);
        if (!hasDeptTag && !hasRaw) return false;
      }

      if (selectedCompany !== 'ALL') {
        if (p.company_name !== selectedCompany) return false;
      }

      if (statusFilter === 'open' && p.registration_open !== 1) return false;
      if (statusFilter === 'closed' && p.registration_open === 1) return false;

      return true;
    });
  }, [allProblems, search, selectedDept, selectedCompany, statusFilter]);

  // Group by company
  const problemsByCompany = useMemo(() => {
    const map = new Map<string, Problem[]>();
    for (const p of filteredProblems) {
      const comp = p.company_name || 'Individual / Vel Tech Innovation';
      if (!map.has(comp)) map.set(comp, []);
      map.get(comp)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredProblems]);

  const handleRegister = async (problemId: number) => {
    if (!user) {
      window.location.href = '/auth/login';
      return;
    }
    setRegistering(true);
    setRegMsg(null);
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_statement_id: problemId }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegMsg({ text: 'Registration successful! You are now enrolled.', success: true });
        loadProblems();
      } else {
        setRegMsg({ text: data.error || 'Registration failed', success: false });
      }
    } catch {
      setRegMsg({ text: 'Network error occurred', success: false });
    } finally {
      setRegistering(false);
    }
  };

  return (
    <AppShell
      pageTitle={
        <>
          <strong>Problem Statements</strong> Directory
        </>
      }
      headerAction={
        <div style={{ display: 'flex', gap: '8px' }}>
          {user?.type === 'student' && (
            <Link href="/dashboard" className="btn-pill btn-pill-secondary">
              My Dashboard &rarr;
            </Link>
          )}
        </div>
      }
    >
      {/* Search & Main Filter Controls Toolbar */}
      <div style={{
        background: '#F8F9FA',
        border: '1px solid #EFF1F4',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by PS-ID (e.g. PS - 01), company, keyword..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                paddingLeft: '38px',
                background: '#FFFFFF',
              }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>
              🔍
            </span>
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >✕</button>
            )}
          </div>

          {/* Company Selector */}
          <div style={{ minWidth: '200px' }}>
            <select
              value={selectedCompany}
              onChange={e => setSelectedCompany(e.target.value)}
              style={{ fontWeight: 600, color: 'var(--text-primary)' }}
            >
              <option value="ALL">🏢 All Companies ({companiesList.length})</option>
              {companiesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status Filter Toggle */}
          <div className="pill-tabs">
            {(['all', 'open', 'closed'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setStatusFilter(mode)}
                className={`pill-tab ${statusFilter === mode ? 'active' : ''}`}
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="pill-tabs">
            <button
              onClick={() => setViewMode('company')}
              className={`pill-tab ${viewMode === 'company' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              🏢 By Company
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`pill-tab ${viewMode === 'grid' ? 'active' : ''}`}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              🔲 All Grid
            </button>
          </div>
        </div>

        {/* Department Filter Pills */}
        <div>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
            Filter by Department Eligibility:
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
            {DEPARTMENTS_LIST.map(d => {
              const isActive = selectedDept === (d.code === 'ALL' ? 'ALL' : d.name);
              return (
                <button
                  key={d.code}
                  onClick={() => setSelectedDept(d.code === 'ALL' ? 'ALL' : d.name)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: isActive ? '#191A1D' : '#E2E6EB',
                    background: isActive ? '#191A1D' : '#FFFFFF',
                    color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{d.code}</span> &bull; <span>{d.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        fontSize: '13px',
        color: 'var(--text-secondary)',
      }}>
        <div>
          Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredProblems.length}</strong> problem statements
          {selectedDept !== 'ALL' && <span> in <strong>{selectedDept}</strong></span>}
          {selectedCompany !== 'ALL' && <span> for <strong>{selectedCompany}</strong></span>}
        </div>

        {(selectedDept !== 'ALL' || selectedCompany !== 'ALL' || search || statusFilter !== 'all') && (
          <button
            onClick={() => {
              setSelectedDept('ALL');
              setSelectedCompany('ALL');
              setSearch('');
              setStatusFilter('all');
            }}
            style={{
              background: 'none', border: 'none', color: '#191A1D',
              fontWeight: 700, cursor: 'pointer', fontSize: '12.5px',
            }}
          >
            Reset filters ↺
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Loading problem statements...</div>
      ) : filteredProblems.length === 0 ? (
        <div className="saas-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔎</div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No matching statements found
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 16px auto', fontSize: '13px' }}>
            Try adjusting your search criteria, department filter, or company selection.
          </p>
          <button
            onClick={() => {
              setSelectedDept('ALL');
              setSelectedCompany('ALL');
              setSearch('');
              setStatusFilter('all');
            }}
            className="btn-pill btn-pill-secondary btn-pill-sm"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'company' ? (
        /* BY COMPANY VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {problemsByCompany.map(([companyName, companyProblems]) => (
            <div key={companyName}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 18px',
                background: '#F8F9FA',
                border: '1px solid #EFF1F4',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'var(--pastel-blue)', color: 'var(--pastel-blue-text)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '13px',
                  }}>
                    {companyName.charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                      {companyName}
                    </h2>
                  </div>
                </div>
                <span className="badge-clean blue">
                  {companyProblems.length} {companyProblems.length === 1 ? 'Statement' : 'Statements'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
                {companyProblems.map(p => (
                  <ProblemCard key={p.id} problem={p} onView={() => { setActiveModal(p); setRegMsg(null); }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* GRID VIEW */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
          {filteredProblems.map(p => (
            <ProblemCard key={p.id} problem={p} onView={() => { setActiveModal(p); setRegMsg(null); }} />
          ))}
        </div>
      )}

      {/* DETAIL & REGISTRATION MODAL */}
      {activeModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setActiveModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge-clean charcoal">{activeModal.ps_id}</span>
                  <span className="badge-clean blue">{activeModal.company_name}</span>
                </div>
                <h2 className="modal-title" style={{ fontSize: '18px', lineHeight: 1.35 }}>
                  {activeModal.title}
                </h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="modal-close">✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {regMsg && (
                <div className={`alert ${regMsg.success ? 'alert-success' : 'alert-error'}`}>
                  {regMsg.text}
                </div>
              )}

              {activeModal.background && (
                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                    Background / Context
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                    {activeModal.background}
                  </p>
                </div>
              )}

              {activeModal.description && (
                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                    Problem Description
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                    {activeModal.description}
                  </p>
                </div>
              )}

              {activeModal.expected_outcome && (
                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                    Expected Outcome
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                    {activeModal.expected_outcome}
                  </p>
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  Eligible Departments
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {activeModal.departments && activeModal.departments.length > 0 ? (
                    activeModal.departments.map(d => (
                      <span key={d.id} className="badge-clean lavender">
                        {d.name} ({d.code})
                      </span>
                    ))
                  ) : (
                    <span className="badge-clean gray">Open to all departments</span>
                  )}
                </div>
              </div>

              {/* Assigned Faculty Mentors */}
              {activeModal.mentors && activeModal.mentors.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                    👨‍🏫 Assigned Faculty Mentor{activeModal.mentors.length > 1 ? 's' : ''}
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '8px' }}>
                    {activeModal.mentors.map(m => (
                      <div key={m.id} style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', padding: '10px 12px', borderRadius: '8px', fontSize: '12px' }}>
                        <div style={{ fontWeight: 700, color: '#0369A1' }}>{m.name}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                          {m.designation} {m.department_code ? `(${m.department_code})` : ''}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '11px' }}>
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
                </div>
              )}

              {/* Quotas */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px',
                background: '#F8F9FA', padding: '14px', borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>CAPACITY</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {activeModal.max_registrations > 0 ? activeModal.max_registrations : 'Unlimited'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>PINGS / STUDENT</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--pastel-mint-text)', marginTop: '2px' }}>
                    {activeModal.max_pings_per_student > 0 ? activeModal.max_pings_per_student : 'Unlimited'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>TEAM SIZE</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {activeModal.max_team_members > 0 ? activeModal.max_team_members : 'Standard'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #EFF1F4',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px',
            }}>
              <div>
                {user?.type === 'student' && (
                  <Link href={`/problems/${activeModal.id}/students`} className="btn-pill btn-pill-secondary btn-pill-sm">
                    👥 Discover Interested Students &rarr;
                  </Link>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" onClick={() => setActiveModal(null)} className="btn-pill btn-pill-secondary btn-pill-sm">
                  Close
                </button>
                {activeModal.registration_open === 1 ? (
                  <button
                    type="button"
                    onClick={() => handleRegister(activeModal.id)}
                    disabled={registering || (activeModal.max_registrations > 0 && activeModal.registration_count >= activeModal.max_registrations)}
                    className="btn-pill btn-pill-primary btn-pill-sm"
                  >
                    {registering ? 'Enrolling...' : (activeModal.max_registrations > 0 && activeModal.registration_count >= activeModal.max_registrations) ? 'Capacity Full' : 'Register for Statement'}
                  </button>
                ) : (
                  <button disabled className="btn-pill btn-pill-secondary btn-pill-sm">
                    Closed
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
