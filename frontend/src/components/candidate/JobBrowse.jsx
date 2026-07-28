import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FiSearch, FiMapPin, FiBriefcase, FiCheckCircle, FiUpload, FiFileText, FiX, FiDollarSign, FiClock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getJobs, getMyResumes, applyForJob, uploadResume, getMyApplications, getErrorMessage } from '../../api';

const JobBrowse = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());

  // Apply Modal state
  const [applyingJob, setApplyingJob] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([getJobs(), getMyApplications()]);
      setJobs(jobsRes.data || []);
      const activeApps = (appsRes.data || []).filter(a => a.status !== 'rejected');
      const ids = new Set(activeApps.map(a => a.job_id));
      setAppliedJobIds(ids);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load jobs'));
    } finally {
      setLoading(false);
    }
  };

  const fetchResumes = async () => {
    try {
      const res = await getMyResumes();
      const docs = res.data || [];
      setResumes(docs);
      if (docs.length > 0) setSelectedResumeId(docs[0].id);
    } catch { }
  };

  useEffect(() => { fetchAll(); fetchResumes(); }, []);

  const openApplyModal = (job) => {
    setApplyingJob(job);
    fetchResumes();
  };

  const handleFileUploadOnApply = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await uploadResume(formData);
      toast.success('Resume uploaded!');
      await fetchResumes();
      setSelectedResumeId(res.data.id);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to upload resume'));
    } finally {
      setUploading(false);
    }
  };

  const handleApplySubmit = async () => {
    if (!applyingJob || !applyingJob.id) {
      toast.error('No job selected for application');
      return;
    }
    if (!selectedResumeId) {
      toast.error('Please select or upload a resume first');
      return;
    }
    setSubmitting(true);
    try {
      await applyForJob({ job_id: applyingJob.id, resume_id: selectedResumeId });
      toast.success(`Applied for ${applyingJob?.title || 'job'}!`);
      
      const appliedId = applyingJob.id;
      setAppliedJobIds(prev => new Set([...prev, appliedId]));
      setJobs(prevJobs => prevJobs.map(j => j.id === appliedId ? { ...j, applicant_count: (j.applicant_count || 0) + 1 } : j));
      setApplyingJob(null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit application'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = job.title.toLowerCase().includes(q) || (job.location || '').toLowerCase().includes(q) || job.description.toLowerCase().includes(q);
    const matchesSkill = !selectedSkill ||
      (job.must_have_skills?.some(s => s.toLowerCase().includes(selectedSkill.toLowerCase()))) ||
      (job.nice_to_have_skills?.some(s => s.toLowerCase().includes(selectedSkill.toLowerCase())));
    return matchesSearch && matchesSkill;
  });

  return (
    <div className="space-y-5">
      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search job title, description, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <input
          type="text"
          placeholder="Filter by skill (e.g. React)"
          value={selectedSkill}
          onChange={(e) => setSelectedSkill(e.target.value)}
          className="md:w-52 px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{filteredJobs.length} positions found</p>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-500 animate-pulse">Loading open positions...</div>
      ) : filteredJobs.length === 0 ? (
        <Card className="text-center py-12">
          <FiBriefcase className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No Jobs Found</h3>
          <p className="text-xs text-gray-500 mt-1">Try adjusting your search filters.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => {
            const alreadyApplied = appliedJobIds.has(job.id);
            return (
              <div key={job.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 transition-all">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Title + salary */}
                    <div className="flex items-start justify-between flex-wrap gap-2">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">{job.title}</h3>
                      {job.salary_range && (
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg">
                          ₹ {job.salary_range}
                        </span>
                      )}
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center"><FiMapPin className="mr-1 w-3 h-3" />{job.location || 'Remote'}</span>
                      <span className="flex items-center"><FiClock className="mr-1 w-3 h-3" />{job.experience_required || 'Any experience'}</span>
                      <span>Posted {new Date(job.created_at).toLocaleDateString('en-IN')}</span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2.5 line-clamp-2">{job.description}</p>

                    {/* Skills */}
                    {job.must_have_skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {job.must_have_skills.map((skill, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md border border-indigo-100 dark:border-indigo-900">
                            {skill}
                          </span>
                        ))}
                        {job.nice_to_have_skills?.slice(0, 2).map((skill, idx) => (
                          <span key={`nice-${idx}`} className="px-2 py-0.5 text-[10px] font-medium bg-gray-50 dark:bg-gray-700 text-gray-500 rounded-md border border-gray-200 dark:border-gray-600">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Apply Button */}
                  <div className="flex-shrink-0">
                    {alreadyApplied ? (
                      <span className="inline-flex items-center px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                        <FiCheckCircle className="mr-1.5 w-4 h-4" /> Applied ✓
                      </span>
                    ) : (
                      <Button variant="primary" size="sm" onClick={() => openApplyModal(job)}>
                        Apply Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Apply Modal */}
      {applyingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Apply for {applyingJob.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{applyingJob.location || 'Remote'} · {applyingJob.experience_required || 'Any exp'}</p>
              </div>
              <button onClick={() => setApplyingJob(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Select Resume
                </label>
                {resumes.length > 0 ? (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {resumes.map((r) => (
                      <label
                        key={r.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs cursor-pointer transition ${
                          selectedResumeId === r.id
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 font-semibold text-indigo-800 dark:text-indigo-200'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <FiFileText className="text-indigo-500 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{r.filename}</span>
                        </div>
                        <input type="radio" name="resume" value={r.id} checked={selectedResumeId === r.id} onChange={() => setSelectedResumeId(r.id)} className="text-indigo-600" />
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/40 p-3 rounded-xl">No saved resumes. Upload one below.</p>
                )}
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <FiUpload className="inline mr-1" /> Upload from device
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileUploadOnApply}
                  disabled={uploading}
                  className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                {uploading && <p className="text-[10px] text-indigo-500 mt-1 animate-pulse">Uploading to cloud...</p>}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <Button variant="secondary" size="sm" onClick={() => setApplyingJob(null)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleApplySubmit} isLoading={submitting}>
                  Submit Application
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobBrowse;
