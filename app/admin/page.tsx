'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AppShell from '@/components/AppShell';

interface Metrics {
  totalPS: number;
  totalStudents: number;
  totalFaculty: number;
  totalRegistrations: number;
  totalTeams: number;
  pendingInvitations: number;
  needsReview: number;
  openPS: number;
  fullPS: number;
}

interface StudentRegistration {
  registration_id: number;
  registration_status: string;
  registered_at: string;
  student_id: number;
  student_name: string;
  vt_number: string;
  student_email: string;
  academic_year?: string;
  skills?: string;
  department_id?: number;
  department_name?: string;
  department_code?: string;
  problem_statement_id: number;
  ps_id: string;
  problem_title: string;
  company_id: number;
  company_name: string;
  team_id?: number | null;
}

interface CompanyCount {
  company: string;
  count: number;
  students?: StudentRegistration[];
}

interface DeptCount {
  department: string;
  code?: string;
  count: number;
  students?: StudentRegistration[];
}

interface Problem {
  id: number;
  ps_id: string;
  sno: number;
  title: string;
  company_name: string;
  department_raw: string;
  max_registrations: number;
  max_pings_per_student: number;
  max_team_members: number;
  registration_open: number;
  needs_config_review: number;
  registration_count: number;
  team_count: number;
  pending_pings: number;
}

interface FacultyMember {
  id: number;
  name: string;
  email: string;
  phone?: string;
  designation: string;
  expertise?: string;
  department_id?: number;
  department_name?: string;
  department_code?: string;
  assigned_ps_count: number;
  assigned_problems?: {
    problem_statement_id: number;
    ps_id: string;
    title: string;
    company_name: string;
  }[];
}

interface AdminTeam {
  id: number;
  name: string;
  status: string;
  created_at: string;
  problem_statement_id: number;
  ps_id: string;
  problem_title: string;
  max_team_members: number;
  company_name: string;
  lead_name: string;
  lead_vt: string;
  lead_email: string;
  lead_dept_code: string;
  member_count: number;
  members: {
    student_id: number;
    student_name: string;
    vt_number: string;
    email: string;
    department_code: string;
    role: string;
  }[];
}

interface Batch {
  id: number;
  filename: string;
  total_rows: number;
  imported_rows: number;
  skipped_rows: number;
  error_rows: number;
  status: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'overview' | 'problems' | 'teams' | 'faculty' | 'import'>('overview');
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [byCompany, setByCompany] = useState<CompanyCount[]>([]);
  const [byDept, setByDept] = useState<DeptCount[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<StudentRegistration[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // Overview search & filters
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterCompFilter, setRosterCompFilter] = useState('ALL');
  const [rosterDeptFilter, setRosterDeptFilter] = useState('ALL');
  const [selectedCompanyModal, setSelectedCompanyModal] = useState<CompanyCount | null>(null);
  const [companySearchInModal, setCompanySearchInModal] = useState('');
  const [selectedDeptModal, setSelectedDeptModal] = useState<DeptCount | null>(null);
  const [deptSearchInModal, setDeptSearchInModal] = useState('');
  const [selectedTeamModal, setSelectedTeamModal] = useState<AdminTeam | null>(null);
  const [selectedStudentModal, setSelectedStudentModal] = useState<StudentRegistration | null>(null);

  // Problems state
  const [problems, setProblems] = useState<Problem[]>([]);
  const [totalProblems, setTotalProblems] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [editForm, setEditForm] = useState({
    max_registrations: 0,
    max_pings_per_student: 0,
    max_team_members: 0,
    registration_open: 0,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Teams state
  const [teams, setTeams] = useState<AdminTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamSearch, setTeamSearch] = useState('');

  // Faculty state
  const [facultyList, setFacultyList] = useState<FacultyMember[]>([]);
  const [loadingFaculty, setLoadingFaculty] = useState(false);
  const [departments, setDepartments] = useState<{ id: number; name: string; code: string }[]>([]);
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [facultyForm, setFacultyForm] = useState({
    name: '',
    email: '',
    phone: '',
    department_id: '',
    designation: 'Assistant Professor',
    expertise: '',
    password: '',
  });
  const [savingFaculty, setSavingFaculty] = useState(false);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<number[]>([]);
  const [selectedPsIds, setSelectedPsIds] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);

  // Import state
  const [batches, setBatches] = useState<Batch[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    message: string;
    imported: number;
    updated: number;
    errors: number;
    success: boolean;
  } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (!authLoading && (!user || user.type !== 'admin')) {
      router.push('/auth/login?role=admin');
    }
  }, [user, authLoading, router]);

  // Load metrics & detailed rosters
  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setByCompany(data.byCompany || []);
        setByDept(data.byDepartment || []);
        setAllRegistrations(data.detailedRegistrations || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  // Load problems
  const fetchProblems = useCallback(async () => {
    setLoadingProblems(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '150',
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/problems?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProblems(data.problems || []);
        setTotalProblems(data.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingProblems(false);
    }
  }, [page, search]);

  // Load teams
  const fetchTeams = useCallback(async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch('/api/admin/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  // Load faculty
  const fetchFaculty = useCallback(async () => {
    setLoadingFaculty(true);
    try {
      const res = await fetch('/api/admin/faculty');
      if (res.ok) {
        const data = await res.json();
        setFacultyList(data.faculty || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFaculty(false);
    }
  }, []);

  // Load batches & departments
  const fetchAux = useCallback(async () => {
    try {
      const [bRes, dRes] = await Promise.all([
        fetch('/api/admin/batches'),
        fetch('/api/departments')
      ]);
      if (bRes.ok) {
        const data = await bRes.json();
        setBatches(data.batches || []);
      }
      if (dRes.ok) {
        const data = await dRes.json();
        setDepartments(data.departments || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (user?.type === 'admin') {
      fetchMetrics();
      fetchProblems();
      fetchTeams();
      fetchFaculty();
      fetchAux();
    }
  }, [user, fetchMetrics, fetchProblems, fetchTeams, fetchFaculty, fetchAux]);

  // Export specific Company Candidates to CSV
  const handleExportCompanyCSV = (comp: CompanyCount) => {
    const list = comp.students && comp.students.length > 0
      ? comp.students
      : allRegistrations.filter(r => r.company_name === comp.company);
    if (list.length === 0) {
      showToast('error', 'No candidates to export for this company.');
      return;
    }
    const headers = ['Registration ID', 'Student Name', 'VT Number', 'Email', 'Department', 'Problem ID', 'Problem Title', 'Registered At'];
    const rows = list.map(r => [
      r.registration_id,
      `"${r.student_name.replace(/"/g, '""')}"`,
      `"${r.vt_number}"`,
      `"${r.student_email}"`,
      `"${r.department_name || r.department_code || ''}"`,
      `"${r.ps_id}"`,
      `"${(r.problem_title || '').replace(/"/g, '""')}"`,
      `"${new Date(r.registered_at).toLocaleString()}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `XHub_${comp.company.replace(/[^a-zA-Z0-9]/g, '_')}_Candidates.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `${comp.company} candidates exported!`);
  };

  // Export specific Dept Candidates to CSV
  const handleExportDeptCSV = (dept: DeptCount) => {
    const list = dept.students && dept.students.length > 0
      ? dept.students
      : allRegistrations.filter(r => r.department_name === dept.department || r.department_code === dept.code);
    if (list.length === 0) {
      showToast('error', 'No candidates to export for this department.');
      return;
    }
    const headers = ['Registration ID', 'Student Name', 'VT Number', 'Email', 'Department', 'Company', 'Problem ID', 'Problem Title', 'Registered At'];
    const rows = list.map(r => [
      r.registration_id,
      `"${r.student_name.replace(/"/g, '""')}"`,
      `"${r.vt_number}"`,
      `"${r.student_email}"`,
      `"${r.department_name || r.department_code || ''}"`,
      `"${(r.company_name || '').replace(/"/g, '""')}"`,
      `"${r.ps_id}"`,
      `"${(r.problem_title || '').replace(/"/g, '""')}"`,
      `"${new Date(r.registered_at).toLocaleString()}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `XHub_${(dept.code || dept.department).replace(/[^a-zA-Z0-9]/g, '_')}_Candidates.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', `${dept.department} candidates exported!`);
  };

  // Filtered registrations roster
  const filteredRoster = useMemo(() => {
    return allRegistrations.filter(r => {
      if (rosterCompFilter !== 'ALL' && r.company_name !== rosterCompFilter) return false;
      if (rosterDeptFilter !== 'ALL' && r.department_name !== rosterDeptFilter && r.department_code !== rosterDeptFilter) return false;
      if (rosterSearch) {
        const q = rosterSearch.toLowerCase();
        const matchesName = (r.student_name || '').toLowerCase().includes(q);
        const matchesVt = (r.vt_number || '').toLowerCase().includes(q);
        const matchesEmail = (r.student_email || '').toLowerCase().includes(q);
        const matchesPs = (r.ps_id || '').toLowerCase().includes(q);
        const matchesTitle = (r.problem_title || '').toLowerCase().includes(q);
        const matchesComp = (r.company_name || '').toLowerCase().includes(q);
        const matchesDept = (r.department_name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesVt && !matchesEmail && !matchesPs && !matchesTitle && !matchesComp && !matchesDept) {
          return false;
        }
      }
      return true;
    });
  }, [allRegistrations, rosterSearch, rosterCompFilter, rosterDeptFilter]);

  // Filtered teams
  const filteredTeams = useMemo(() => {
    return teams.filter(t => {
      if (!teamSearch) return true;
      const q = teamSearch.toLowerCase();
      return (
        (t.name || '').toLowerCase().includes(q) ||
        (t.ps_id || '').toLowerCase().includes(q) ||
        (t.problem_title || '').toLowerCase().includes(q) ||
        (t.lead_name || '').toLowerCase().includes(q) ||
        (t.company_name || '').toLowerCase().includes(q) ||
        t.members?.some(m => m.student_name.toLowerCase().includes(q) || m.vt_number.toLowerCase().includes(q))
      );
    });
  }, [teams, teamSearch]);

  // Candidates filtered inside company modal
  const modalCompanyStudents = useMemo(() => {
    if (!selectedCompanyModal) return [];
    const list = selectedCompanyModal.students && selectedCompanyModal.students.length > 0
      ? selectedCompanyModal.students
      : allRegistrations.filter(r => r.company_name === selectedCompanyModal.company);
    if (!companySearchInModal) return list;
    const q = companySearchInModal.toLowerCase();
    return list.filter(s =>
      (s.student_name || '').toLowerCase().includes(q) ||
      (s.vt_number || '').toLowerCase().includes(q) ||
      (s.student_email || '').toLowerCase().includes(q) ||
      (s.ps_id || '').toLowerCase().includes(q) ||
      (s.problem_title || '').toLowerCase().includes(q) ||
      (s.department_name || '').toLowerCase().includes(q) ||
      (s.department_code || '').toLowerCase().includes(q)
    );
  }, [selectedCompanyModal, allRegistrations, companySearchInModal]);

  // Candidates filtered inside department modal
  const modalDeptStudents = useMemo(() => {
    if (!selectedDeptModal) return [];
    const list = selectedDeptModal.students && selectedDeptModal.students.length > 0
      ? selectedDeptModal.students
      : allRegistrations.filter(r => r.department_name === selectedDeptModal.department || r.department_code === selectedDeptModal.code);
    if (!deptSearchInModal) return list;
    const q = deptSearchInModal.toLowerCase();
    return list.filter(s =>
      (s.student_name || '').toLowerCase().includes(q) ||
      (s.vt_number || '').toLowerCase().includes(q) ||
      (s.student_email || '').toLowerCase().includes(q) ||
      (s.company_name || '').toLowerCase().includes(q) ||
      (s.ps_id || '').toLowerCase().includes(q) ||
      (s.problem_title || '').toLowerCase().includes(q)
    );
  }, [selectedDeptModal, allRegistrations, deptSearchInModal]);

  // Export Roster to CSV
  const handleExportCSV = () => {
    if (allRegistrations.length === 0) {
      showToast('error', 'No registration data to export.');
      return;
    }

    const headers = ['Registration ID', 'Student Name', 'VT Number', 'Email', 'Department', 'Academic Year', 'Problem ID', 'Problem Title', 'Industry Partner', 'Registered At'];
    const rows = allRegistrations.map(r => [
      r.registration_id,
      `"${r.student_name.replace(/"/g, '""')}"`,
      `"${r.vt_number}"`,
      `"${r.student_email}"`,
      `"${r.department_name || ''}"`,
      `"${r.academic_year || ''}"`,
      `"${r.ps_id}"`,
      `"${(r.problem_title || '').replace(/"/g, '""')}"`,
      `"${(r.company_name || '').replace(/"/g, '""')}"`,
      `"${new Date(r.registered_at).toLocaleString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `XHub_Student_Registrations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Roster exported to CSV successfully!');
  };

  // Export Teams to CSV
  const handleExportTeamsCSV = () => {
    if (teams.length === 0) {
      showToast('error', 'No teams data to export.');
      return;
    }

    const headers = ['Team ID', 'Team Name', 'Problem Statement', 'Company', 'Lead Name', 'Lead VT', 'Members Count', 'Members Details', 'Status', 'Created At'];
    const rows = teams.map(t => [
      t.id,
      `"${(t.name || `Squad #${t.id}`).replace(/"/g, '""')}"`,
      `"${t.ps_id}: ${(t.problem_title || '').replace(/"/g, '""')}"`,
      `"${t.company_name || ''}"`,
      `"${t.lead_name || ''}"`,
      `"${t.lead_vt || ''}"`,
      t.member_count,
      `"${t.members?.map(m => `${m.student_name} (${m.vt_number}) [${m.department_code}]`).join('; ')}"`,
      t.status,
      `"${new Date(t.created_at).toLocaleString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `XHub_Formed_Teams_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Teams exported to CSV successfully!');
  };

  const handleOpenEdit = (p: Problem) => {
    setEditingProblem(p);
    setEditForm({
      max_registrations: p.max_registrations || 0,
      max_pings_per_student: p.max_pings_per_student || 0,
      max_team_members: p.max_team_members || 0,
      registration_open: p.registration_open || 0,
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProblem) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/problems/${editingProblem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Settings updated successfully!');
        setEditingProblem(null);
        fetchProblems();
        fetchMetrics();
      } else {
        showToast('error', data.error || 'Failed to update settings');
      }
    } catch (e) {
      console.error(e);
      showToast('error', 'Network error occurred');
    } finally {
      setSavingEdit(false);
    }
  };

  // Add Faculty Submit
  const handleCreateFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFaculty(true);
    try {
      const res = await fetch('/api/admin/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...facultyForm,
          department_id: facultyForm.department_id ? parseInt(facultyForm.department_id) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', 'Faculty mentor added successfully!');
        setFacultyModalOpen(false);
        setFacultyForm({ name: '', email: '', phone: '', department_id: '', designation: 'Assistant Professor', expertise: '', password: '' });
        fetchFaculty();
        fetchMetrics();
      } else {
        showToast('error', data.error || 'Failed to add faculty');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error');
    } finally {
      setSavingFaculty(false);
    }
  };

  // Assign Mentors Submit
  const handleAssignMentors = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFacultyIds.length === 0 || selectedPsIds.length === 0) {
      showToast('error', 'Please select at least one faculty member and one problem statement.');
      return;
    }

    setAssigning(true);
    try {
      const res = await fetch('/api/admin/faculty/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faculty_ids: selectedFacultyIds,
          problem_statement_ids: selectedPsIds,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || 'Mentor assignment completed!');
        setAssignModalOpen(false);
        setSelectedFacultyIds([]);
        setSelectedPsIds([]);
        fetchFaculty();
      } else {
        showToast('error', data.error || 'Failed to assign mentors');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error during assignment');
    } finally {
      setAssigning(false);
    }
  };

  // Unassign Mentor
  const handleUnassignMentor = async (facultyId: number, psId: number) => {
    if (!confirm('Unassign this faculty member from this problem statement?')) return;
    try {
      const res = await fetch(`/api/admin/faculty/assign?faculty_id=${facultyId}&problem_statement_id=${psId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('success', 'Mentor unassigned.');
        fetchFaculty();
      } else {
        showToast('error', 'Failed to unassign mentor');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    setImportResult(null);

    try {
      const res = await fetch('/api/admin/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setImportResult({
          message: data.message || 'Excel imported successfully',
          imported: data.imported || 0,
          updated: data.updated || 0,
          errors: data.errors || 0,
          success: true,
        });
        showToast('success', 'Excel dataset synced with TiDB cluster!');
        fetchMetrics();
        fetchProblems();
        fetchAux();
      } else {
        setImportResult({
          message: data.error || 'Import failed',
          imported: 0,
          updated: 0,
          errors: 1,
          success: false,
        });
        showToast('error', data.error || 'Import error');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Network error during upload');
    } finally {
      setImporting(false);
    }
  };

  return (
    <AppShell
      pageTitle={
        <>
          <strong>Admin</strong> Command Center
        </>
      }
      headerAction={
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            className="btn-pill btn-pill-secondary btn-pill-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>📥</span> Export Roster (.csv)
          </button>
          <span className="badge-clean mint">TiDB Cloud Live</span>
        </div>
      }
    >
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: 'var(--radius-pill)',
          background: toast.type === 'success' ? '#191A1D' : '#991B1B',
          color: '#FFFFFF',
          fontWeight: 700,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
        }}>
          {toast.message}
        </div>
      )}

      {/* Pill Navigation Tabs */}
      <div style={{ marginBottom: '24px' }}>
        <div className="pill-tabs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pill-tab ${activeTab === 'overview' ? 'active' : ''}`}
          >
            📊 Overview &amp; Metrics
          </button>
          <button
            onClick={() => setActiveTab('problems')}
            className={`pill-tab ${activeTab === 'problems' ? 'active' : ''}`}
          >
            📋 Problem Statements (101)
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`pill-tab ${activeTab === 'teams' ? 'active' : ''}`}
          >
            👥 Formed Squads ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab('faculty')}
            className={`pill-tab ${activeTab === 'faculty' ? 'active' : ''}`}
          >
            👨‍🏫 Faculty Mentors ({facultyList.length})
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`pill-tab ${activeTab === 'import' ? 'active' : ''}`}
          >
            📤 Excel Sync
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & DETAILED REGISTRATIONS */}
      {activeTab === 'overview' && (
        <div>
          {/* Stat Cards */}
          <div className="stats-row">
            <div className="pastel-stat-card lavender">
              <div>
                <div className="stat-card-header">
                  <div className="stat-icon-circle">🎯</div>
                  <span className="stat-badge">{metrics?.openPS || 101} Open</span>
                </div>
                <div className="stat-number">{loadingMetrics ? '...' : metrics?.totalPS || 101}</div>
                <div className="stat-title">Total Problem Statements</div>
              </div>
              <div className="stat-footer-text">
                101 open challenges across industry partners
              </div>
            </div>

            <div className="pastel-stat-card blue">
              <div>
                <div className="stat-card-header">
                  <div className="stat-icon-circle">👨‍🎓</div>
                  <span className="stat-badge">{allRegistrations.length} Enrollments</span>
                </div>
                <div className="stat-number">{loadingMetrics ? '...' : metrics?.totalStudents || allRegistrations.length}</div>
                <div className="stat-title">Registered Students</div>
              </div>
              <div className="stat-footer-text">
                Across 8 Vel Tech engineering branches
              </div>
            </div>

            <div className="pastel-stat-card mint">
              <div>
                <div className="stat-card-header">
                  <div className="stat-icon-circle">👥</div>
                  <span className="stat-badge">Squads</span>
                </div>
                <div className="stat-number">{loadingMetrics ? '...' : teams.length}</div>
                <div className="stat-title">Teams Formed</div>
              </div>
              <div className="stat-footer-text">
                Collaborative multidisciplinary squads
              </div>
            </div>

            <div className="pastel-stat-card charcoal">
              <div>
                <div className="stat-card-header">
                  <div className="stat-icon-circle">⚡</div>
                  <span className="stat-badge">Active</span>
                </div>
                <div className="stat-number">{loadingMetrics ? '...' : allRegistrations.length}</div>
                <div className="stat-title">Total Registrations</div>
              </div>
              <div style={{ marginTop: '10px' }}>
                <button onClick={handleExportCSV} className="btn-pill btn-pill-mint btn-pill-sm" style={{ width: '100%' }}>
                  Download CSV Roster &rarr;
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Distribution Grids (Clicking opens Centered Popup Modals) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', marginBottom: '32px' }}>
            
            {/* By Industry Partner */}
            <div className="saas-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h3 className="card-title-clean" style={{ margin: 0, fontSize: '16px' }}>
                    🏢 Registrations by Industry Partner
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '3px 0 0 0' }}>
                    Click any partner to open candidate roster popup
                  </p>
                </div>
                <span className="badge-clean blue">{byCompany.length} Partners</span>
              </div>

              {byCompany.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No registrations recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {byCompany.map((c, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedCompanyModal(c);
                        setCompanySearchInModal('');
                      }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: '#F8F9FA',
                        borderRadius: '12px',
                        border: '1px solid #EFF1F4',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#EDF6FA';
                        e.currentTarget.style.borderColor = '#BDE0FE';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#F8F9FA';
                        e.currentTarget.style.borderColor = '#EFF1F4';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#E0F2FE',
                          color: '#0369A1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '13px',
                        }}>
                          🏢
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                            {c.company}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Click to inspect candidates
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge-clean blue" style={{ fontWeight: 700 }}>
                          {c.count} {c.count === 1 ? 'candidate' : 'candidates'}
                        </span>
                        <span style={{ fontSize: '13px', color: '#0369A1', fontWeight: 800 }}>↗</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* By Academic Department */}
            <div className="saas-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h3 className="card-title-clean" style={{ margin: 0, fontSize: '16px' }}>
                    🎓 Registrations by Academic Department
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '3px 0 0 0' }}>
                    Click any branch to view enrolled student popup
                  </p>
                </div>
                <span className="badge-clean lavender">{byDept.length} Branches</span>
              </div>

              {byDept.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No department registrations recorded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {byDept.map((d, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedDeptModal(d);
                        setDeptSearchInModal('');
                      }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: '#F8F9FA',
                        borderRadius: '12px',
                        border: '1px solid #EFF1F4',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#F4EFFE';
                        e.currentTarget.style.borderColor = '#DDD6FE';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#F8F9FA';
                        e.currentTarget.style.borderColor = '#EFF1F4';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#EDE9FE',
                          color: '#6D28D9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '13px',
                        }}>
                          🎓
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                            {d.department}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {d.code ? `Branch Code: ${d.code} • ` : ''}Click to open roster
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge-clean lavender" style={{ fontWeight: 700 }}>
                          {d.count} {d.count === 1 ? 'student' : 'students'}
                        </span>
                        <span style={{ fontSize: '13px', color: '#6D28D9', fontWeight: 800 }}>↗</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* MASTER DETAILED REGISTRATION ROSTER TABLE */}
          <div className="saas-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div>
                <h3 className="card-title-clean" style={{ margin: 0, fontSize: '17px' }}>
                  📋 Master Student Registration Roster ({allRegistrations.length} Total)
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Live candidate enrollments across all industry partner problem statements
                </p>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search by student, VT, company, PS..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '9999px',
                    border: '1px solid #D1D5DB',
                    fontSize: '13px',
                    minWidth: '240px',
                    background: '#FFFFFF',
                  }}
                />

                <select
                  value={rosterCompFilter}
                  onChange={(e) => setRosterCompFilter(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '9999px',
                    border: '1px solid #D1D5DB',
                    fontSize: '13px',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="ALL">All Companies</option>
                  {byCompany.map(c => <option key={c.company} value={c.company}>{c.company}</option>)}
                </select>

                <select
                  value={rosterDeptFilter}
                  onChange={(e) => setRosterDeptFilter(e.target.value)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '9999px',
                    border: '1px solid #D1D5DB',
                    fontSize: '13px',
                    background: '#FFFFFF',
                  }}
                >
                  <option value="ALL">All Departments</option>
                  {byDept.map(d => <option key={d.department} value={d.department}>{d.department}</option>)}
                </select>

                <button
                  onClick={handleExportCSV}
                  className="btn-pill btn-pill-primary btn-pill-sm"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Export CSV
                </button>
              </div>
            </div>

            {loadingMetrics ? (
              <div className="loading"><div className="spinner" /> Loading registered students...</div>
            ) : filteredRoster.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>No student registrations match your filter</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>Try resetting the search or selecting "All Companies".</div>
              </div>
            ) : (
              <div className="saas-table-container">
                <table className="saas-table">
                  <thead>
                    <tr>
                      <th>Student Candidate</th>
                      <th>VT Number</th>
                      <th>Branch / Department</th>
                      <th>Problem Statement Selected</th>
                      <th>Industry Partner</th>
                      <th>Registered On</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRoster.map((r) => (
                      <tr key={r.registration_id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: '#191A1D',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 800,
                              flexShrink: 0,
                            }}>
                              {r.student_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                                {r.student_name}
                              </div>
                              <a
                                href={`mailto:${r.student_email}`}
                                style={{ fontSize: '11.5px', color: 'var(--text-secondary)', textDecoration: 'none' }}
                              >
                                {r.student_email}
                              </a>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge-clean charcoal" style={{ fontWeight: 700 }}>
                            {r.vt_number}
                          </span>
                        </td>
                        <td>
                          <span className="badge-clean mint" style={{ fontWeight: 700 }}>
                            {r.department_name || r.department_code || 'Unassigned'}
                          </span>
                        </td>
                        <td style={{ maxWidth: '280px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <span className="badge-clean blue" style={{ fontWeight: 800, fontSize: '10.5px' }}>
                              {r.ps_id}
                            </span>
                          </div>
                          <div style={{
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {r.problem_title}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>
                            {r.company_name}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          {new Date(r.registered_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedStudentModal(r)}
                            className="btn-pill btn-pill-secondary btn-pill-sm"
                          >
                            View Details &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: PROBLEM STATEMENTS MANAGEMENT */}
      {activeTab === 'problems' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
              <input
                type="text"
                placeholder="Search by PS-ID, title, company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Showing {problems.length} of {totalProblems} statements
            </div>
          </div>

          {loadingProblems ? (
            <div className="loading"><div className="spinner" /> Loading problem statements...</div>
          ) : (
            <div className="saas-table-container">
              <table className="saas-table">
                <thead>
                  <tr>
                    <th>PS ID</th>
                    <th>Title &amp; Company</th>
                    <th>Status</th>
                    <th>Max Reg</th>
                    <th>Max Pings</th>
                    <th>Team Size</th>
                    <th>Activity</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {problems.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>
                        <span className="badge-clean charcoal">{p.ps_id}</span>
                      </td>
                      <td style={{ maxWidth: '280px' }}>
                        <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.title || 'Untitled Problem'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          {p.company_name || 'Individual'} &bull; {p.department_raw || 'All Depts'}
                        </div>
                      </td>
                      <td>
                        {p.registration_open ? (
                          <span className="badge-clean mint">Open</span>
                        ) : (
                          <span className="badge-clean gray">Closed</span>
                        )}
                        {p.needs_config_review ? (
                          <span className="badge-clean pink" style={{ marginLeft: '4px' }}>Review</span>
                        ) : null}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {p.max_registrations > 0 ? p.max_registrations : 'Unlimited'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {p.max_pings_per_student > 0 ? p.max_pings_per_student : 'Unlimited'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {p.max_team_members > 0 ? p.max_team_members : 'Unlimited'}
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', fontWeight: 700 }}>
                          {p.registration_count || 0} Registered
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {p.team_count || 0} teams &bull; {p.pending_pings || 0} pings
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="btn-pill btn-pill-secondary btn-pill-sm"
                        >
                          Configure
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FORMED SQUADS & TEAMS */}
      {activeTab === 'teams' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div>
              <h3 className="card-title-clean" style={{ margin: 0, fontSize: '17px' }}>
                👥 Collaborative Hackathon Squads ({teams.length} Formed)
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                Multidisciplinary student teams across engineering branches
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search squads by name, lead, problem..."
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '9999px',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  minWidth: '240px',
                }}
              />
              <button onClick={handleExportTeamsCSV} className="btn-pill btn-pill-primary btn-pill-sm">
                Export Teams CSV
              </button>
            </div>
          </div>

          {loadingTeams ? (
            <div className="loading"><div className="spinner" /> Loading teams...</div>
          ) : filteredTeams.length === 0 ? (
            <div className="saas-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>👥</div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#191A1D', margin: 0 }}>
                No Teams Formed Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
                Teams will automatically appear here as students send peer invitations and lock squads.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {filteredTeams.map(t => (
                <div key={t.id} className="saas-card" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span className="badge-clean charcoal">{t.ps_id}</span>
                    <span className="badge-clean mint">{t.status.toUpperCase()}</span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#191A1D', margin: '0 0 4px 0' }}>
                    {t.name || `Squad #${t.id}`}
                  </h3>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                    🎯 {t.problem_title} ({t.company_name})
                  </div>

                  <div style={{ background: '#F8F9FA', borderRadius: '12px', padding: '12px', marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                      Squad Lead
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#191A1D' }}>
                      {t.lead_name} <span style={{ color: 'var(--text-muted)' }}>({t.lead_vt})</span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      {t.lead_email} &bull; <span className="badge-clean mint" style={{ fontSize: '10px' }}>{t.lead_dept_code || 'Dept'}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Members ({t.members?.length || 0})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {t.members?.map(m => (
                      <div key={m.student_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#F9FAFB', borderRadius: '8px', fontSize: '12px' }}>
                        <div>
                          <strong>{m.student_name}</strong> <span style={{ color: 'var(--text-muted)' }}>({m.vt_number})</span>
                        </div>
                        <span className="badge-clean gray" style={{ fontSize: '10px' }}>{m.department_code || 'Dept'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FACULTY MENTORS */}
      {activeTab === 'faculty' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div>
              <h3 className="card-title-clean" style={{ margin: 0, fontSize: '17px' }}>
                👨‍🏫 Academic Faculty Mentors ({facultyList.length})
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                Assign professors and domain experts to guide student problem statement squads
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setFacultyModalOpen(true)}
                className="btn-pill btn-pill-secondary btn-pill-sm"
              >
                + Add Faculty Member
              </button>
              <button
                onClick={() => {
                  setSelectedFacultyIds([]);
                  setSelectedPsIds([]);
                  setAssignModalOpen(true);
                }}
                className="btn-pill btn-pill-primary btn-pill-sm"
              >
                Assign Mentors to Statements &rarr;
              </button>
            </div>
          </div>

          {loadingFaculty ? (
            <div className="loading"><div className="spinner" /> Loading faculty mentors...</div>
          ) : facultyList.length === 0 ? (
            <div className="saas-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>👨‍🏫</div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#191A1D', margin: 0 }}>
                No Faculty Mentors Added Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px', maxWidth: '480px', margin: '6px auto 16px' }}>
                Add department faculty members and assign them to problem statements for student guidance.
              </p>
              <button onClick={() => setFacultyModalOpen(true)} className="btn-pill btn-pill-primary btn-pill-sm">
                + Add First Faculty Member
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              {facultyList.map(f => (
                <div key={f.id} className="saas-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className="badge-clean lavender">{f.department_code || f.department_name || 'Academic'}</span>
                      <span className="badge-clean mint">{f.designation}</span>
                    </div>

                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#191A1D', margin: '0 0 4px 0' }}>
                      {f.name}
                    </h3>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <a href={`mailto:${f.email}`} style={{ color: '#191A1D', textDecoration: 'none', fontWeight: 600 }}>✉️ {f.email}</a>
                      {f.phone && (
                        <a href={`tel:${f.phone}`} style={{ color: '#2B576D', textDecoration: 'none', fontWeight: 700 }}>📞 {f.phone}</a>
                      )}
                    </div>

                    {f.expertise && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', background: '#F8F9FA', padding: '8px 12px', borderRadius: '8px' }}>
                        🔬 <strong>Expertise:</strong> {f.expertise}
                      </div>
                    )}

                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Assigned Problem Statements ({f.assigned_problems?.length || 0})
                    </div>
                    {(!f.assigned_problems || f.assigned_problems.length === 0) ? (
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '14px' }}>
                        No problem statements assigned yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                        {f.assigned_problems.map(ap => (
                          <div key={ap.problem_statement_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#F9FAFB', borderRadius: '8px', fontSize: '12px' }}>
                            <div style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <strong style={{ color: '#2B576D' }}>{ap.ps_id}:</strong> {ap.title}
                            </div>
                            <button
                              onClick={() => handleUnassignMentor(f.id, ap.problem_statement_id)}
                              style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '12px', fontWeight: 800 }}
                              title="Unassign mentor"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ borderTop: '1px solid #EFF1F4', paddingTop: '14px', marginTop: '10px' }}>
                    <button
                      onClick={() => {
                        setSelectedFacultyIds([f.id]);
                        setSelectedPsIds([]);
                        setAssignModalOpen(true);
                      }}
                      className="btn-pill btn-pill-secondary btn-pill-sm"
                      style={{ width: '100%' }}
                    >
                      Assign Problem Statements &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: EXCEL IMPORT SYNC */}
      {activeTab === 'import' && (
        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <div className="saas-card" style={{ padding: '32px', marginBottom: '24px' }}>
            <h3 className="card-title-clean" style={{ marginBottom: '8px' }}>
              📤 Sync Master Hackathon Excel
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginBottom: '24px', lineHeight: 1.6 }}>
              Upload the latest official partner workbook (e.g., <code>Hackathon 2026.xlsx</code>). The sync pipeline will auto-detect companies, map department eligibilities across all 8 branches, and preserve existing student team records.
            </p>

            <div style={{
              border: '2px dashed #D1D5DB',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 24px',
              textAlign: 'center',
              background: '#F9FAFB',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📊</div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                Select Master Excel Workbook
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12.5px', marginBottom: '18px' }}>
                Supports .xlsx or .xls files
              </div>

              <input
                type="file"
                accept=".xlsx, .xls"
                id="excel-file-input"
                onChange={handleFileUpload}
                disabled={importing}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="excel-file-input"
                className={`btn-pill btn-pill-primary ${importing ? 'disabled' : ''}`}
                style={{ cursor: importing ? 'not-allowed' : 'pointer', display: 'inline-block' }}
              >
                {importing ? 'Processing & Syncing TiDB...' : 'Choose File & Sync Now'}
              </label>
            </div>

            {importResult && (
              <div className={`alert ${importResult.success ? 'alert-success' : 'alert-error'}`}>
                <div>
                  <strong>{importResult.message}</strong>
                  {importResult.success && (
                    <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                      Imported: {importResult.imported} statements | Updated: {importResult.updated} | Errors: {importResult.errors}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* History */}
          <div className="saas-card" style={{ padding: '24px' }}>
            <h3 className="card-title-clean" style={{ marginBottom: '16px' }}>
              🕒 Recent Sync Batches
            </h3>
            {batches.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No previous import history.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {batches.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: '#F8F9FA',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #EFF1F4',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px' }}>{b.filename}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {new Date(b.created_at).toLocaleString()} &bull; {b.imported_rows} rows imported
                      </div>
                    </div>
                    <span className={`badge-clean ${b.status === 'completed' ? 'mint' : 'pink'}`}>
                      {b.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* INDUSTRY PARTNER ROSTER MODAL */}
      {selectedCompanyModal && (
        <div className="modal-backdrop" onClick={() => setSelectedCompanyModal(null)}>
          <div className="modal-card" style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge-clean blue" style={{ fontWeight: 800 }}>🏢 Industry Partner</span>
                  <span className="badge-clean mint">{selectedCompanyModal.count} {selectedCompanyModal.count === 1 ? 'Candidate' : 'Candidates'}</span>
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#191A1D', margin: 0 }}>
                  {selectedCompanyModal.company}
                </h2>
              </div>
              <button onClick={() => setSelectedCompanyModal(null)} className="modal-close">&times;</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search candidates by name, VT, branch, PS ID..."
                value={companySearchInModal}
                onChange={e => setCompanySearchInModal(e.target.value)}
                style={{ flex: 1, minWidth: '240px' }}
              />
              <button
                onClick={() => handleExportCompanyCSV(selectedCompanyModal)}
                className="btn-pill btn-pill-primary btn-pill-sm"
              >
                Export Partner CSV
              </button>
            </div>

            <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {modalCompanyStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>🔍</div>
                  <div style={{ fontWeight: 700 }}>No candidates match search query</div>
                </div>
              ) : (
                modalCompanyStudents.map((st, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: '#F8F9FA',
                      borderRadius: '12px',
                      border: '1px solid #EFF1F4',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: '#191A1D',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}>
                        {st.student_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#191A1D' }}>
                          {st.student_name} <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>({st.vt_number})</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          🎯 <strong style={{ color: '#191A1D' }}>{st.ps_id}:</strong> {st.problem_title}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span className="badge-clean mint" style={{ fontSize: '11px' }}>
                        {st.department_code || st.department_name || 'Dept'}
                      </span>
                      <button
                        onClick={() => setSelectedStudentModal(st)}
                        className="btn-pill btn-pill-secondary btn-pill-sm"
                        style={{ padding: '6px 12px', fontSize: '11.5px' }}
                      >
                        Inspect &rarr;
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px', borderTop: '1px solid #EFF1F4', paddingTop: '14px' }}>
              <button
                onClick={() => setSelectedCompanyModal(null)}
                className="btn-pill btn-pill-secondary btn-pill-sm"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACADEMIC DEPARTMENT ROSTER MODAL */}
      {selectedDeptModal && (
        <div className="modal-backdrop" onClick={() => setSelectedDeptModal(null)}>
          <div className="modal-card" style={{ maxWidth: '780px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge-clean lavender" style={{ fontWeight: 800 }}>🎓 Branch / Dept</span>
                  {selectedDeptModal.code && <span className="badge-clean charcoal">{selectedDeptModal.code}</span>}
                  <span className="badge-clean mint">{selectedDeptModal.count} {selectedDeptModal.count === 1 ? 'Student' : 'Students'}</span>
                </div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#191A1D', margin: 0 }}>
                  {selectedDeptModal.department}
                </h2>
              </div>
              <button onClick={() => setSelectedDeptModal(null)} className="modal-close">&times;</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by student name, VT, company, PS..."
                value={deptSearchInModal}
                onChange={e => setDeptSearchInModal(e.target.value)}
                style={{ flex: 1, minWidth: '240px' }}
              />
              <button
                onClick={() => handleExportDeptCSV(selectedDeptModal)}
                className="btn-pill btn-pill-primary btn-pill-sm"
              >
                Export Branch CSV
              </button>
            </div>

            <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {modalDeptStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-secondary)' }}>
                  <div style={{ fontSize: '28px', marginBottom: '6px' }}>🔍</div>
                  <div style={{ fontWeight: 700 }}>No candidates match search query</div>
                </div>
              ) : (
                modalDeptStudents.map((st, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      background: '#F8F9FA',
                      borderRadius: '12px',
                      border: '1px solid #EFF1F4',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        background: '#3E4B8B',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}>
                        {st.student_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#191A1D' }}>
                          {st.student_name} <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 600 }}>({st.vt_number})</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          🏢 <strong style={{ color: '#191A1D' }}>{st.company_name}:</strong> {st.ps_id} - {st.problem_title}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span className="badge-clean blue" style={{ fontSize: '11px' }}>
                        {st.ps_id}
                      </span>
                      <button
                        onClick={() => setSelectedStudentModal(st)}
                        className="btn-pill btn-pill-secondary btn-pill-sm"
                        style={{ padding: '6px 12px', fontSize: '11.5px' }}
                      >
                        Inspect &rarr;
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px', borderTop: '1px solid #EFF1F4', paddingTop: '14px' }}>
              <button
                onClick={() => setSelectedDeptModal(null)}
                className="btn-pill btn-pill-secondary btn-pill-sm"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SQUAD / TEAM DETAIL MODAL */}
      {selectedTeamModal && (
        <div className="modal-backdrop" onClick={() => setSelectedTeamModal(null)}>
          <div className="modal-card" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge-clean charcoal">{selectedTeamModal.ps_id}</span>
                <span className="badge-clean mint">{selectedTeamModal.status.toUpperCase()}</span>
                <span className="badge-clean blue">{selectedTeamModal.company_name}</span>
              </div>
              <button onClick={() => setSelectedTeamModal(null)} className="modal-close">&times;</button>
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#191A1D', margin: '0 0 6px 0' }}>
              {selectedTeamModal.name || `Squad #${selectedTeamModal.id}`}
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              🎯 {selectedTeamModal.problem_title}
            </div>

            <div className="saas-card" style={{ padding: '16px', background: '#F8F9FA', marginBottom: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Squad Leader
              </div>
              <div style={{ fontWeight: 800, fontSize: '14.5px', color: '#191A1D' }}>
                {selectedTeamModal.lead_name} <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>({selectedTeamModal.lead_vt})</span>
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                <a href={`mailto:${selectedTeamModal.lead_email}`} style={{ color: '#191A1D', fontWeight: 600 }}>{selectedTeamModal.lead_email}</a> &bull; <span className="badge-clean mint" style={{ fontSize: '10.5px' }}>{selectedTeamModal.lead_dept_code || 'Dept'}</span>
              </div>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Squad Members ({selectedTeamModal.members?.length || 0})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {selectedTeamModal.members?.map(m => (
                <div key={m.student_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #F0F2F4' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#191A1D', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                      {m.student_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#191A1D' }}>
                        {m.student_name} <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>({m.vt_number})</span>
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
                href={`mailto:${selectedTeamModal.lead_email}?subject=Vel Tech Hackathon - Squad ${selectedTeamModal.name || selectedTeamModal.id}`}
                className="btn-pill btn-pill-primary btn-pill-sm"
              >
                Email Squad Lead &rarr;
              </a>
              <button onClick={() => setSelectedTeamModal(null)} className="btn-pill btn-pill-secondary btn-pill-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT REGISTRATION DETAIL MODAL */}
      {selectedStudentModal && (
        <div className="modal-backdrop" onClick={() => setSelectedStudentModal(null)}>
          <div className="modal-card" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="badge-clean charcoal">{selectedStudentModal.vt_number}</span>
                <span className="badge-clean mint">{selectedStudentModal.department_name || selectedStudentModal.department_code}</span>
              </div>
              <button onClick={() => setSelectedStudentModal(null)} className="modal-close">&times;</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {selectedStudentModal.student_name}
              </h2>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Email: <a href={`mailto:${selectedStudentModal.student_email}`} style={{ color: '#191A1D', fontWeight: 600 }}>{selectedStudentModal.student_email}</a>
              </div>
            </div>

            <div className="saas-card" style={{ padding: '16px', marginBottom: '20px', background: '#F8F9FA' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Registered Problem Statement
              </div>
              <div style={{ fontWeight: 800, fontSize: '15px', color: '#191A1D' }}>
                {selectedStudentModal.ps_id}: {selectedStudentModal.problem_title}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                <span className="badge-clean blue">🏢 {selectedStudentModal.company_name}</span>
                <span className="badge-clean charcoal">
                  📅 {new Date(selectedStudentModal.registered_at).toLocaleString()}
                </span>
              </div>
            </div>

            {selectedStudentModal.skills && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                  Student Skills &amp; Domain Expertise
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedStudentModal.skills.split(',').map((s, i) => (
                    <span key={i} className="badge-clean gray" style={{ fontSize: '11.5px' }}>{s.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <a
                href={`mailto:${selectedStudentModal.student_email}?subject=Vel Tech X-Hub Hackathon - ${selectedStudentModal.ps_id}`}
                className="btn-pill btn-pill-primary btn-pill-sm"
              >
                Send Email to Student &rarr;
              </a>
              <button
                onClick={() => setSelectedStudentModal(null)}
                className="btn-pill btn-pill-secondary btn-pill-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD FACULTY MODAL */}
      {facultyModalOpen && (
        <div className="modal-backdrop" onClick={() => setFacultyModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#191A1D', margin: 0 }}>
                Add Faculty Mentor
              </h2>
              <button onClick={() => setFacultyModalOpen(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleCreateFaculty} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Faculty Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Rajesh Kumar"
                  value={facultyForm.name}
                  onChange={e => setFacultyForm({ ...facultyForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="rajesh@veltech.edu.in"
                    value={facultyForm.email}
                    onChange={e => setFacultyForm({ ...facultyForm, email: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Phone Number / Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={facultyForm.phone}
                    onChange={e => setFacultyForm({ ...facultyForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Designation
                  </label>
                  <select
                    value={facultyForm.designation}
                    onChange={e => setFacultyForm({ ...facultyForm, designation: e.target.value })}
                  >
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Professor">Professor</option>
                    <option value="Head of Department">Head of Department (HoD)</option>
                    <option value="Industry Mentor">Industry Mentor</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Department
                  </label>
                  <select
                    value={facultyForm.department_id}
                    onChange={e => setFacultyForm({ ...facultyForm, department_id: e.target.value })}
                  >
                    <option value="">Select Department</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Areas of Expertise
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Vision, Robotics, CAD, IoT"
                  value={facultyForm.expertise}
                  onChange={e => setFacultyForm({ ...facultyForm, expertise: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                  Initial Password (Defaults to Faculty@XHub2026)
                </label>
                <input
                  type="password"
                  placeholder="Optional, default will be used if blank"
                  value={facultyForm.password}
                  onChange={e => setFacultyForm({ ...facultyForm, password: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFacultyModalOpen(false)}
                  className="btn-pill btn-pill-secondary btn-pill-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingFaculty}
                  className="btn-pill btn-pill-primary btn-pill-sm"
                >
                  {savingFaculty ? 'Adding...' : 'Create Faculty Mentor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN MENTORS MODAL */}
      {assignModalOpen && (
        <div className="modal-backdrop" onClick={() => setAssignModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '680px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#191A1D', margin: 0 }}>
                Assign Faculty Mentors to Problem Statements
              </h2>
              <button onClick={() => setAssignModalOpen(false)} className="modal-close">&times;</button>
            </div>

            <form onSubmit={handleAssignMentors} style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '14px' }}>
              {/* Select Faculty Members */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  1. Select Faculty Mentor(s) ({selectedFacultyIds.length} selected)
                </label>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {facultyList.map(f => (
                    <label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: selectedFacultyIds.includes(f.id) ? '#EDF6FA' : '#F9FAFB', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="checkbox"
                        checked={selectedFacultyIds.includes(f.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedFacultyIds([...selectedFacultyIds, f.id]);
                          else setSelectedFacultyIds(selectedFacultyIds.filter(id => id !== f.id));
                        }}
                      />
                      <span style={{ fontWeight: 700 }}>{f.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>({f.department_code || f.designation})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Select Problem Statements */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  2. Select Problem Statement(s) ({selectedPsIds.length} selected)
                </label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {problems.map(p => (
                    <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: selectedPsIds.includes(p.id) ? '#EDF7F1' : '#F9FAFB', borderRadius: '8px', cursor: 'pointer', fontSize: '12.5px' }}>
                      <input
                        type="checkbox"
                        checked={selectedPsIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedPsIds([...selectedPsIds, p.id]);
                          else setSelectedPsIds(selectedPsIds.filter(id => id !== p.id));
                        }}
                      />
                      <span className="badge-clean charcoal" style={{ fontSize: '10px' }}>{p.ps_id}</span>
                      <span style={{ fontWeight: 700, color: '#191A1D' }}>{p.title}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({p.company_name})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="btn-pill btn-pill-secondary btn-pill-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="btn-pill btn-pill-primary btn-pill-sm"
                >
                  {assigning ? 'Assigning...' : 'Confirm Mentor Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingProblem && (
        <div className="modal-backdrop" onClick={() => setEditingProblem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="badge-clean charcoal">{editingProblem.ps_id}</span>
                <span className="badge-clean blue" style={{ marginLeft: '8px' }}>{editingProblem.company_name}</span>
              </div>
              <button onClick={() => setEditingProblem(null)} className="modal-close">&times;</button>
            </div>

            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 16px 0' }}>
              Configure Quotas: {editingProblem.title}
            </h2>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Registration Open Status
                </label>
                <select
                  value={editForm.registration_open}
                  onChange={(e) => setEditForm({ ...editForm, registration_open: parseInt(e.target.value) })}
                  style={{ width: '100%', padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid #D1D5DB' }}
                >
                  <option value={1}>🟢 Open for Student Registrations</option>
                  <option value={0}>🔴 Closed (No new enrollments)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Max Total Registrations (0 = Unlimited)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.max_registrations}
                    onChange={(e) => setEditForm({ ...editForm, max_registrations: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                    Max Pings Per Candidate
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.max_pings_per_student}
                    onChange={(e) => setEditForm({ ...editForm, max_pings_per_student: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Max Team Squad Size
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editForm.max_team_members}
                  onChange={(e) => setEditForm({ ...editForm, max_team_members: parseInt(e.target.value) || 4 })}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEditingProblem(null)}
                  className="btn-pill btn-pill-secondary btn-pill-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-pill btn-pill-primary btn-pill-sm"
                >
                  {savingEdit ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
