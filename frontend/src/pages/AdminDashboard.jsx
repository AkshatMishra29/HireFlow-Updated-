import React, { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import { Card, StatCard } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FiUsers, FiBriefcase, FiUserCheck, FiUserPlus, FiTrash2, FiPower, FiPlus, FiX, FiCalendar, FiVideo, FiClock, FiUser, FiUploadCloud, FiFileText, FiKey } from 'react-icons/fi';
import toast from 'react-hot-toast';
import JobList from '../components/hr/JobList';
import ApplicantsView from '../components/hr/ApplicantsView';
import AiAssistant from '../components/candidate/AiAssistant';
import RecruiterCopilot from '../components/hr/RecruiterCopilot';
import OfferLettersView from '../components/hr/OfferLettersView';
import RecruitmentAnalytics from '../components/hr/RecruitmentAnalytics';
import API, { getJobs, getHrInterviews, deleteInterview, getErrorMessage } from '../api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedJobForApplicants, setSelectedJobForApplicants] = useState(null);
  const [stats, setStats] = useState({ activeJobs: 0, totalApplicants: 0, scheduledInterviews: 0, total_hr: 0 });
  const [hrList, setHrList] = useState([]);
  const [scheduledList, setScheduledList] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  // Modify Password Modal State
  const [selectedUserForPassword, setSelectedUserForPassword] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const [hrSearchQuery, setHrSearchQuery] = useState('');

  const filteredHrList = hrList.filter(hr => {
    const q = hrSearchQuery.toLowerCase();
    return (hr.name || '').toLowerCase().includes(q) || (hr.email || '').toLowerCase().includes(q);
  });

  const fetchStatsAndHR = async () => {
    try {
      const [jobsRes, hrRes, intRes] = await Promise.all([
        getJobs().catch(() => ({ data: [] })),
        API.get('/admin/hr').catch(() => ({ data: [] })),
        getHrInterviews().catch(() => ({ data: [] }))
      ]);

      const jobsList = jobsRes.data || [];
      const hrData = hrRes.data || [];
      const intData = intRes.data || [];

      const activeJobs = jobsList.filter(j => j.status === 'open').length;
      const totalApplicants = jobsList.reduce((sum, j) => sum + (j.applicant_count || 0), 0);

      setStats({
        activeJobs,
        totalApplicants,
        scheduledInterviews: intData.length,
        total_hr: hrData.length
      });
      setHrList(hrData);
      setScheduledList(intData);
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    }
  };

  useEffect(() => {
    fetchStatsAndHR();
    const interval = setInterval(fetchStatsAndHR, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectJobForApplicants = (job) => {
    setSelectedJobForApplicants(job);
    setActiveTab('applicants');
  };

  const handleCreateHR = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await API.post('/admin/hr', { ...formData, role: 'hr' });
      toast.success(`HR account for ${formData.name} created successfully!`);
      setFormData({ name: '', email: '', password: '' });
      setShowModal(false);
      fetchStatsAndHR();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create HR account'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleDeactivate = async (id, currentStatus, name) => {
    try {
      await API.patch(`/admin/hr/${id}/deactivate`);
      toast.success(`HR account ${name} ${currentStatus ? 'Deactivated' : 'Reactivated'}`);
      fetchStatsAndHR();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update HR account status'));
    }
  };

  const handleDeleteHR = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete HR account for ${name}?`)) {
      try {
        await API.delete(`/admin/hr/${id}`);
        toast.success(`HR account ${name} deleted successfully`);
        fetchStatsAndHR();
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to delete HR account'));
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar role="admin" activeTab={activeTab} setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'applicants') setSelectedJobForApplicants(null);
        }} />

        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Workspace Overview</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Full administrative power — manage HR team, job postings, and candidate interviews.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                <div 
                  onClick={() => setActiveTab('hr_management')}
                  className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm hover:border-indigo-400 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      HR Managers
                    </p>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {stats.total_hr}
                    </p>
                    <p className="text-[10px] text-indigo-500 font-medium">Manage HR accounts →</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <FiUserCheck className="w-6 h-6" />
                  </div>
                </div>

                <StatCard title="Active Openings" value={stats.activeJobs.toString()} icon={FiBriefcase} />
                <StatCard title="Total Applicants" value={stats.totalApplicants.toString()} icon={FiUsers} />

                <div 
                  onClick={() => setActiveTab('interviews')}
                  className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 shadow-sm hover:border-indigo-400 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Interviews Scheduled
                    </p>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {stats.scheduledInterviews}
                    </p>
                    <p className="text-[10px] text-indigo-500 font-medium">View Meet invites →</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <FiCalendar className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <JobList onSelectJobForApplicants={handleSelectJobForApplicants} showPostButton />
            </div>
          )}

          {/* Dedicated HR Account Creation / Management Page */}
          {activeTab === 'hr_management' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                    <FiUserCheck className="text-indigo-600 dark:text-indigo-400" />
                    <span>HR Account Management & Provisioning</span>
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Directly create HR credentials, deactivate users, or delete HR accounts.
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="relative w-64">
                    <FiUsers className="absolute left-3 top-2.5 text-gray-400 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Search HR name or email..."
                      value={hrSearchQuery}
                      onChange={(e) => setHrSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                  </div>
                  <Button onClick={() => setShowModal(true)}>
                    <FiPlus className="mr-1.5" /> Create HR Account
                  </Button>
                </div>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        <th className="p-4">Name</th>
                        <th className="p-4">Email</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
                      {filteredHrList.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="p-8 text-center text-gray-400">
                            No HR accounts matched your search query.
                          </td>
                        </tr>
                      ) : (
                        filteredHrList.map((hr) => (
                          <tr key={hr.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition">
                            <td className="p-4 font-bold text-gray-900 dark:text-white">{hr.name}</td>
                            <td className="p-4 font-mono text-gray-500 dark:text-gray-400">{hr.email}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                                hr.is_active !== false
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 border-emerald-200'
                                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 border-rose-200'
                              }`}>
                                {hr.is_active !== false ? 'Active' : 'Deactivated'}
                              </span>
                            </td>
                            <td className="p-4 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedUserForPassword({ id: hr.id, name: hr.name, email: hr.email });
                                  setNewPasswordVal('');
                                }}
                                className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-lg transition inline-flex items-center space-x-1"
                              >
                                <FiKey className="w-3 h-3 mr-1" />
                                <span>Modify Password</span>
                              </button>
                              <button
                                onClick={() => handleToggleDeactivate(hr.id, hr.is_active !== false, hr.name)}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                                  hr.is_active !== false
                                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/40'
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40'
                                }`}
                              >
                                {hr.is_active !== false ? 'Deactivate' : 'Reactivate'}
                              </button>
                              <button
                                onClick={() => handleDeleteHR(hr.id, hr.name)}
                                className="px-2.5 py-1 text-xs font-semibold bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 rounded-lg transition"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'jobs' && (
            <JobList onSelectJobForApplicants={handleSelectJobForApplicants} showPostButton />
          )}

          {activeTab === 'interviews' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <FiCalendar className="text-indigo-600 dark:text-indigo-400" />
                  <span>Scheduled Candidate Interviews</span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Organized list of all upcoming candidate interviews with identical Google Meet links.
                </p>
              </div>

              {scheduledList.length === 0 ? (
                <Card className="text-center py-16">
                  <FiCalendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No Scheduled Interviews Yet</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                    Go to Applicants under any active job posting to schedule a Google Meet interview.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {scheduledList.map((item) => (
                    <Card key={item.id} className="p-5 space-y-4 hover:border-indigo-300 dark:hover:border-indigo-800 transition shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider">
                          {item.status || 'Scheduled'}
                        </span>
                        <span className="text-[11px] font-semibold text-gray-400 flex items-center">
                          <FiClock className="mr-1 w-3 h-3" /> {item.scheduled_time}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center space-x-1.5">
                          <FiUser className="w-4 h-4 text-indigo-500" />
                          <span>{item.candidate_name || item.candidate_id}</span>
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Role: <strong>{item.job_title}</strong> ({item.candidate_id})</p>
                        {item.meet_link && (
                          <div className="mt-2 text-xs bg-indigo-50/60 dark:bg-indigo-950/40 p-2 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                            <span className="text-gray-500 font-semibold">Meeting URL: </span>
                            <a href={item.meet_link} target="_blank" rel="noreferrer" className="text-indigo-600 dark:text-indigo-400 font-mono font-bold underline hover:text-indigo-800 break-all">
                              {item.meet_link}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <button
                          onClick={async () => {
                            if (window.confirm('Delete this interview card?')) {
                              try {
                                await deleteInterview(item.id);
                                toast.success('Interview card removed');
                                fetchStatsAndHR();
                              } catch (err) {
                                toast.error('Failed to remove interview card');
                              }
                            }
                          }}
                          className="text-xs font-semibold text-rose-500 hover:text-rose-700 flex items-center space-x-1 transition"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                        {item.meet_link && (
                          <a
                            href={item.meet_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm"
                          >
                            <FiVideo className="mr-1.5 w-3.5 h-3.5" /> Join Meet Call
                          </a>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'copilot' && (
            <RecruiterCopilot />
          )}

          {activeTab === 'offers' && (
            <OfferLettersView />
          )}

          {activeTab === 'analytics' && (
            <RecruitmentAnalytics />
          )}

          {activeTab === 'kb' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                    <FiFileText className="text-indigo-600 dark:text-indigo-400" />
                    <span>Knowledge Base & FAQ File Management</span>
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Upload updated .txt FAQ knowledge base documents to update candidate AI assistant responses in real-time.
                  </p>
                </div>
              </div>

              {/* FAQ File Upload Card */}
              <Card className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-6 border-2 border-dashed border-indigo-200 dark:border-indigo-900/60 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 text-center md:text-left">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center justify-center md:justify-start">
                      <FiUploadCloud className="mr-2 text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                      Upload Updated Candidate FAQ File (.txt)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
                      Upload a plain text (.txt) file containing company FAQs, leave policies, and working hours. The system will instantly rebuild the FAISS vector index.
                    </p>
                  </div>

                  <div>
                    <label className="inline-flex items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer">
                      <FiPlus className="mr-1.5 w-4 h-4" /> Select .txt File
                      <input
                        type="file"
                        accept=".txt"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const res = await API.post('/admin/faq-upload', formData, {
                              headers: { 'Content-Type': 'multipart/form-error' }
                            });
                            toast.success(res.data.message || 'FAQ document uploaded and FAISS RAG index rebuilt!');
                            fetchStatsAndHR();
                          } catch (err) {
                            toast.error(getErrorMessage(err, 'Failed to upload FAQ document'));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </Card>

              {/* RAG Knowledge Base View */}
              <AiAssistant role="admin" />
            </div>
          )}

          {activeTab === 'applicants' && selectedJobForApplicants && (
            <ApplicantsView
              job={selectedJobForApplicants}
              onBack={() => setActiveTab('jobs')}
            />
          )}
        </main>
      </div>

      {/* Create HR Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create HR Account</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHR} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="sarah@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={submitting}>
                  Provision HR Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modify Password Modal */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FiKey className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Modify User Password</h3>
              </div>
              <button onClick={() => setSelectedUserForPassword(null)} className="text-gray-400 hover:text-gray-600">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 rounded-xl text-xs space-y-1">
              <p className="text-gray-600 dark:text-gray-300">Target User: <strong className="text-gray-900 dark:text-white">{selectedUserForPassword.name}</strong></p>
              <p className="text-gray-600 dark:text-gray-300">Email: <span className="font-mono text-indigo-600 dark:text-indigo-400">{selectedUserForPassword.email}</span></p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newPasswordVal || newPasswordVal.length < 6) {
                  toast.error('Password must be at least 6 characters long');
                  return;
                }
                setResettingPassword(true);
                try {
                  const res = await API.patch(`/admin/users/${selectedUserForPassword.id}/reset-password`, {
                    new_password: newPasswordVal
                  });
                  toast.success(res.data.message || 'Password modified successfully!');
                  setSelectedUserForPassword(null);
                  setNewPasswordVal('');
                } catch (err) {
                  toast.error(getErrorMessage(err, 'Failed to update password'));
                } finally {
                  setResettingPassword(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Enter New Password *
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  placeholder="e.g. NewPassword123"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none text-gray-900 dark:text-white"
                  autoFocus
                />
                <p className="text-[10px] text-gray-400 mt-1">Minimum 6 characters. Takes effect immediately.</p>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setSelectedUserForPassword(null)}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={resettingPassword} className="font-bold">
                  Update Password Now
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
