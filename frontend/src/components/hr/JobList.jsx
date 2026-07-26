import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FiEdit2, FiTrash2, FiUsers, FiMapPin, FiBriefcase, FiPlus, FiTrendingUp, FiX, FiAward, FiFileText, FiDownload, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getJobs, deleteJob, updateJob, getScreeningResults, getJobApplications } from '../../api';
import JobForm from './JobForm';
import EvidenceModal from './EvidenceModal';

// ─── Status Badge (neon text) ──────────────────────────────────────────────────
const StatusText = ({ status }) => (
  <span className={`text-[11px] font-bold uppercase tracking-wider ${
    status === 'open'
      ? 'text-emerald-500 drop-shadow-[0_0_6px_rgba(52,211,153,0.8)]'
      : 'text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.7)]'
  }`}>
    ● {status === 'open' ? 'OPEN' : 'CLOSED'}
  </span>
);

// ─── Analytics & Candidate Detail Modal ──────────────────────────────────────
const JobAnalyticsModal = ({ job, onClose, onViewApplicants }) => {
  const [screeningResults, setScreeningResults] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedResultForEvidence, setSelectedResultForEvidence] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [srRes, appRes] = await Promise.all([
          getScreeningResults(job.id),
          getJobApplications(job.id),
        ]);
        setScreeningResults(srRes.data || []);
        setApplications(appRes.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [job.id]);

  const top3 = screeningResults.filter(r => r.status === 'completed').slice(0, 3);
  const statusCounts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const stageLabels = {
    applied: 'Applied',
    under_review: 'Under Review',
    shortlisted: 'Shortlisted',
    rejected: 'Rejected',
    hired: 'Hired',
  };

  // Map candidate email to application resume
  const appMap = applications.reduce((acc, app) => {
    acc[app.candidate_id] = app;
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{job.title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {job.applicant_count || applications.length} applicants · {job.location || 'Remote'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onClose(); onViewApplicants(job); }}
            >
              <FiUsers className="mr-1.5" /> View All Applicants ({applications.length})
            </Button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center text-sm text-gray-500 py-8">Loading analytics...</div>
          ) : (
            <>
              {/* Application Funnel */}
              <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                  <FiTrendingUp className="mr-2 text-indigo-500" /> Application Funnel
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(stageLabels).map(([key, label]) => {
                    const count = statusCounts[key] || 0;
                    const pct = applications.length ? Math.round((count / applications.length) * 100) : 0;
                    return (
                      <div key={key} className="text-center bg-gray-50 dark:bg-gray-700/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="text-xl font-bold text-gray-900 dark:text-white">{count}</div>
                        <div className="text-[10px] font-medium text-gray-500 mt-0.5">{label}</div>
                        <div className="mt-1.5 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-1 bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top AI-Screened Candidates with Full Analytics & Resume Link */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center">
                    <FiAward className="mr-2 text-amber-500" /> Top AI-Screened Candidates & Match Insights
                  </h4>
                </div>
                {top3.length === 0 ? (
                  <div className="text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 text-center">
                    No AI screening results yet. Candidates are screened automatically upon submission.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {top3.map((r, idx) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      const score = r.overall_score || 0;
                      const scoreColor = score >= 75 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-rose-600';
                      const matchedApp = appMap[r.candidate_id] || {};
                      const resume = matchedApp.resume;

                      return (
                        <div key={r.id} className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">{medals[idx]}</span>
                              <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">{r.candidate_id}</p>
                                <div className="flex items-center space-x-2 text-[10px] text-gray-500 mt-0.5">
                                  <span>Skills: {r.scores?.skill_match || 0}/100</span>
                                  <span>·</span>
                                  <span>Exp: {r.scores?.experience_match || 0}/100</span>
                                  <span>·</span>
                                  <span>Proj: {r.scores?.project_relevance || 0}/100</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <div className={`text-2xl font-bold ${scoreColor}`}>{score}</div>
                                <div className="text-[9px] text-gray-400">Match Score</div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedResultForEvidence(r)}
                                className="text-xs"
                              >
                                <FiZap className="mr-1 text-indigo-500" /> Full AI Report
                              </Button>
                            </div>
                          </div>

                          {/* Strengths & Missing skills preview */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-200 dark:border-gray-600">
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Top Strengths:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {(r.strengths || []).length > 0 ? (
                                  r.strengths.slice(0, 3).map((s, i) => (
                                    <span key={i} className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-md">
                                      ✓ {s}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-gray-400">None highlighted</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">Resume File:</span>
                              <div className="mt-1">
                                {resume ? (
                                  <a
                                    href={resume.presigned_url || resume.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                  >
                                    <FiFileText className="mr-1" /> {resume.filename} <FiDownload className="ml-1 w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-gray-400">Resume on file</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Job Requirements Summary */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3">
                  <p className="text-gray-400 mb-1">Salary Range</p>
                  <p className="font-bold text-gray-900 dark:text-white">
                    {job.salary_range ? `₹ ${job.salary_range}` : 'Not specified'}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3">
                  <p className="text-gray-400 mb-1">Experience Required</p>
                  <p className="font-bold text-gray-900 dark:text-white">{job.experience_required || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3 col-span-2">
                  <p className="text-gray-400 mb-1">Must-Have Skills Tagged</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(job.must_have_skills || []).map((s, i) => (
                      <span key={i} className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Full AI Evidence & Reasoning Modal */}
      {selectedResultForEvidence && (
        <EvidenceModal
          result={selectedResultForEvidence}
          candidateId={selectedResultForEvidence.candidate_id}
          onClose={() => setSelectedResultForEvidence(null)}
        />
      )}
    </div>
  );
};

// ─── Main JobList ─────────────────────────────────────────────────────────────
const JobList = ({ onSelectJobForApplicants, showPostButton = false }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [analyticsJob, setAnalyticsJob] = useState(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await getJobs();
      setJobs(res.data || []);
    } catch (err) {
      toast.error('Failed to load job postings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchJobs(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this job posting?')) return;
    try {
      await deleteJob(id);
      toast.success('Job deleted');
      fetchJobs();
    } catch { toast.error('Failed to delete job'); }
  };

  const toggleStatus = async (job) => {
    const newStatus = job.status === 'open' ? 'closed' : 'open';
    try {
      await updateJob(job.id, { status: newStatus });
      toast.success(`Job ${newStatus}`);
      fetchJobs();
    } catch { toast.error('Failed to update status'); }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      (job.title || '').toLowerCase().includes(q) ||
      (job.department || '').toLowerCase().includes(q) ||
      (job.location || '').toLowerCase().includes(q) ||
      (job.description || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Job Postings</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{filteredJobs.length} of {jobs.length} postings shown · Click card for applicants</p>
        </div>
        {showPostButton && (
          <Button variant="primary" size="md" onClick={() => { setEditingJob(null); setIsFormOpen(true); }}>
            <FiPlus className="mr-2" /> Post New Job
          </Button>
        )}
      </div>

      {/* HR Search & Status Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search job title, location, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-4 py-2 text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs font-semibold bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open Only</option>
          <option value="closed">Closed Only</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500 animate-pulse">Loading job postings...</div>
      ) : filteredJobs.length === 0 ? (
        <Card className="text-center py-12">
          <FiBriefcase className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No Job Postings Matched</h3>
          <p className="text-xs text-gray-500 mt-1">Try adjusting your search criteria.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex flex-col justify-between hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all cursor-pointer group"
              onClick={() => onSelectJobForApplicants && onSelectJobForApplicants(job)}
            >
              <div>
                {/* Title + Status */}
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {job.title}
                  </h3>
                  <StatusText status={job.status} />
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                  <span className="flex items-center"><FiMapPin className="mr-1 w-3 h-3" />{job.location || 'Remote'}</span>
                  <span>·</span>
                  <span>{job.experience_required || 'Any'}</span>
                  {job.salary_range && (
                    <>
                      <span>·</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">₹ {job.salary_range}</span>
                    </>
                  )}
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2 mb-3">{job.description}</p>

                {/* Skills */}
                {job.must_have_skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {job.must_have_skills.slice(0, 4).map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md">
                        {skill}
                      </span>
                    ))}
                    {job.must_have_skills.length > 4 && (
                      <span className="px-2 py-0.5 text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-md">
                        +{job.must_have_skills.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                {/* Applicant count + View */}
                <button
                  onClick={() => onSelectJobForApplicants && onSelectJobForApplicants(job)}
                  className="flex items-center space-x-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                  <FiUsers className="w-3.5 h-3.5" />
                  <span>{job.applicant_count || 0} Applicants</span>
                </button>

                {/* Actions */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => toggleStatus(job)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                      job.status === 'open'
                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                        : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                    }`}
                    title={job.status === 'open' ? 'Close job' : 'Reopen job'}
                  >
                    {job.status === 'open' ? 'CLOSE' : 'REOPEN'}
                  </button>
                  <button
                    onClick={() => { setEditingJob(job); setIsFormOpen(true); }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                    title="Edit"
                  >
                    <FiEdit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                    title="Delete"
                  >
                    <FiTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isFormOpen && (
        <JobForm
          initialData={editingJob}
          onClose={() => setIsFormOpen(false)}
          onSuccess={fetchJobs}
        />
      )}

      {analyticsJob && (
        <JobAnalyticsModal
          job={analyticsJob}
          onClose={() => setAnalyticsJob(null)}
          onViewApplicants={(job) => {
            if (onSelectJobForApplicants) onSelectJobForApplicants(job);
          }}
        />
      )}
    </div>
  );
};

export default JobList;
