import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  FiArrowLeft, FiFileText, FiDownload, FiUser, FiMail, FiCalendar,
  FiZap, FiRefreshCw, FiSearch, FiFilter, FiChevronDown, FiChevronUp,
  FiCheckCircle, FiAlertTriangle, FiXCircle, FiCpu, FiShield, FiPieChart,
  FiChevronLeft, FiChevronRight, FiUsers, FiVideo, FiX
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getJobApplications, updateApplicationStatus, triggerBulkScreening, scheduleInterview, getErrorMessage } from '../../api';
import ScreeningPanel from './ScreeningPanel';
import EvidenceModal from './EvidenceModal';

const STAGE_OPTIONS = [
  { value: 'all', label: 'All Stages' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected', label: 'Rejected' },
];

const ACTION_STAGE_OPTIONS = [
  { value: 'under_review', label: 'Under Review', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
  { value: 'shortlisted', label: 'Shortlisted', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' },
];

const SORT_OPTIONS = [
  { value: 'score_desc', label: 'Highest Score First' },
  { value: 'score_asc', label: 'Lowest Score First' },
  { value: 'applied_at_desc', label: 'Most Recent' },
  { value: 'applied_at_asc', label: 'Oldest' },
];

// ─── Score Badge Component ───────────────────────────────────────────────────
const ScoreBadge = ({ score }) => {
  if (score === undefined || score === null) return null;
  let bg = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
  if (score >= 80) {
    bg = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
  } else if (score >= 50) {
    bg = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
  }

  return (
    <div className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl border font-bold ${bg}`}>
      <span className="text-base leading-none">{score}</span>
      <span className="text-[9px] font-semibold opacity-75 uppercase tracking-wider mt-0.5">Match</span>
    </div>
  );
};

// ─── Skeleton Loading Cards ──────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 space-y-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-1.5">
          <div className="w-36 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="w-24 h-3 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
      <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  </div>
);

// ─── Expandable Applicant Card ───────────────────────────────────────────────
const ApplicantCard = ({ app, onStatusChange, onOpenEvidence, fetchApplications, onSchedule }) => {
  const [expanded, setExpanded] = useState(false);
  const screening = app.screening;
  const isScreened = screening && screening.status === 'completed';
  const score = isScreened ? screening.overall_score : null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all overflow-hidden">
      {/* Header Row (Always Visible) */}
      <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Candidate Identity */}
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-base flex-shrink-0 shadow-inner">
            {(app.candidate_name || app.candidate_id)[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {app.candidate_name || app.candidate_id.split('@')[0]}
              </h3>
              {score !== null && <ScoreBadge score={score} />}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span className="flex items-center"><FiMail className="mr-1 w-3 h-3 text-gray-400" />{app.candidate_id}</span>
              <span>·</span>
              <span className="flex items-center"><FiCalendar className="mr-1 w-3 h-3 text-gray-400" />Applied {new Date(app.applied_at).toLocaleDateString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          {/* Stage Action Dropdown */}
          <div className="relative">
            <select
              value={ACTION_STAGE_OPTIONS.some(o => o.value === app.status) ? app.status : 'under_review'}
              onChange={(e) => onStatusChange(app.id, e.target.value)}
              className="appearance-none pl-3 pr-7 py-1.5 text-xs font-bold rounded-xl bg-gray-50 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm transition"
            >
              {ACTION_STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <FiChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-2.5 pointer-events-none" />
          </div>

          {/* Schedule Interview Button */}
          <button
            onClick={() => onSchedule(app)}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 transition shadow-sm cursor-pointer"
            title="Schedule Google Meet Interview"
          >
            <FiCalendar className="w-3.5 h-3.5" />
            <span>Schedule</span>
          </button>

          {/* AI Screening Status */}
          <ScreeningPanel application={app} onScreeningStarted={fetchApplications} />

          {/* Expand Toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            title={expanded ? 'Collapse details' : 'Expand AI insights'}
          >
            {expanded ? <FiChevronUp className="w-5 h-5" /> : <FiChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expanded AI Insights & Evidence Drawer */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4 bg-gray-50/50 dark:bg-gray-900/30">
          {/* macOS-style PDF Resume Preview Card & Quick Drawer */}
          {app.resume && (
            <div className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-12 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg flex flex-col items-center justify-center flex-shrink-0 shadow-sm relative group cursor-pointer">
                  <FiFileText className="w-5 h-5 text-rose-600" />
                  <span className="text-[8px] font-extrabold text-rose-700 uppercase tracking-tighter mt-0.5">PDF</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-xs">{app.resume.filename}</span>
                    <span className="px-2 py-0.5 text-[9px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                      Candidate Document
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">PDF Document · Click preview or download below</p>
                </div>
              </div>

              {(app.resume.presigned_url || app.resume.file_url) && (
                <div className="flex items-center space-x-2">
                  <a
                    href={app.resume.presigned_url || app.resume.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center space-x-1 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 transition shadow-sm"
                  >
                    <FiDownload className="w-3.5 h-3.5" />
                    <span>View / Download PDF</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {isScreened ? (
            <>
              {/* Sub-Score Breakdown Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Skills Match (45%)', score: screening.scores?.skill_match || 0 },
                  { label: 'Experience (35%)', score: screening.scores?.experience_match || 0 },
                  { label: 'Project Match (20%)', score: screening.scores?.project_relevance || 0 },
                ].map(({ label, score }) => {
                  let barBg = 'bg-rose-500';
                  if (score >= 75) barBg = 'bg-emerald-500';
                  else if (score >= 50) barBg = 'bg-amber-500';
                  return (
                    <div key={label} className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="flex justify-between text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        <span>{label}</span>
                        <span className="font-bold">{score}/100</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                        <div className={`h-1.5 rounded-full ${barBg} transition-all duration-500`} style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI Reasoning Summary */}
              {screening.reasoning && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-bold text-gray-900 dark:text-white mb-1 flex items-center">
                    <FiCpu className="mr-1.5 text-indigo-500" /> AI Executive Fit Summary
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{screening.reasoning}</p>
                </div>
              )}

              {/* Tag Pills: Strengths, Weaknesses, Missing Skills */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Strengths */}
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center uppercase tracking-wider">
                    <FiCheckCircle className="mr-1" /> Key Strengths
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(screening.strengths || []).length > 0 ? (
                      screening.strengths.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800">
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-400">None highlighted</span>
                    )}
                  </div>
                </div>

                {/* Weaknesses */}
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center uppercase tracking-wider">
                    <FiAlertTriangle className="mr-1" /> Considerations
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(screening.weaknesses || []).length > 0 ? (
                      screening.weaknesses.map((w, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-md border border-amber-200 dark:border-amber-800">
                          {w}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-400">None flagged</span>
                    )}
                  </div>
                </div>

                {/* Missing Skills */}
                <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-2 flex items-center uppercase tracking-wider">
                    <FiXCircle className="mr-1" /> Missing Must-Have Skills
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(screening.missing_skills || []).length > 0 ? (
                      screening.missing_skills.map((m, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-md border border-rose-200 dark:border-rose-800">
                          {m}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] text-gray-400">All must-haves matched</span>
                    )}
                  </div>
                </div>
              </div>

              {/* View Full Interactive Report Button */}
              <div className="flex justify-end pt-1">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenEvidence(screening, app.candidate_id)}
                  className="text-xs"
                >
                  <FiZap className="mr-1.5" /> Open Full AI Evidence & Bias Audit Report
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              Candidate has not been AI screened yet. Click <strong>Run AI Screen</strong> above to analyze skills, experience, and project evidence.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Fairness & Distribution Report Modal ─────────────────────────────────────
const FairnessModal = ({ applications, onClose }) => {
  const screenedApps = applications.filter(a => a.screening?.status === 'completed');
  const scores = screenedApps.map(a => a.screening?.overall_score || 0);

  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const highMatch = scores.filter(s => s >= 80).length;
  const goodMatch = scores.filter(s => s >= 50 && s < 80).length;
  const lowMatch = scores.filter(s => s < 50).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <FiShield className="w-5 h-5 text-indigo-500" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">AI Screening Fairness & Score Analytics</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-xl">
            <p className="text-xl font-bold text-gray-900 dark:text-white">{screenedApps.length}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Screened</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl">
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{highMatch}</p>
            <p className="text-[10px] text-emerald-600/80 mt-0.5">≥ 80 Match</p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl">
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{goodMatch}</p>
            <p className="text-[10px] text-amber-600/80 mt-0.5">50-79 Match</p>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl">
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{lowMatch}</p>
            <p className="text-[10px] text-rose-600/80 mt-0.5">&lt; 50 Match</p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl">
          <p className="font-bold text-gray-900 dark:text-white mb-1">🛡️ Anti-Bias & Merit Guardrails Active:</p>
          <p>• All personal identifiers (candidate name, university name, gender pronouns) are automatically redacted prior to LLM evaluation.</p>
          <p>• Evaluation relies exclusively on objective criteria: skill overlap, verified domain experience, and technical project complexity.</p>
        </div>
      </div>
    </div>
  );
};

// ─── Schedule Interview Modal ────────────────────────────────────────────────
const ScheduleModal = ({ app, onClose, onSuccess }) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const [selectedDateStr, setSelectedDateStr] = useState(tomorrow.toISOString().split('T')[0]);
  const [selectedTimeStr, setSelectedTimeStr] = useState('10:00');
  const [duration, setDuration] = useState('45 mins');
  const [loading, setLoading] = useState(false);

  // Compute min date string
  const todayStr = new Date().toISOString().split('T')[0];

  const applyPreset = (daysFromNow, hour = 10) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setSelectedDateStr(d.toISOString().split('T')[0]);
    setSelectedTimeStr(`${hour < 10 ? '0' + hour : hour}:00`);
    toast.success(`Preset applied: ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${hour}:00`);
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDateStr || !selectedTimeStr) {
      toast.error('Please select both date and time');
      return;
    }

    const combinedDateTime = new Date(`${selectedDateStr}T${selectedTimeStr}`);
    if (combinedDateTime < new Date()) {
      toast.error('Cannot schedule an interview in the past. Please pick a future date & time.');
      return;
    }

    setLoading(true);
    try {
      const formattedDate = combinedDateTime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      await scheduleInterview({
        application_id: app.id,
        scheduled_time: `${formattedDate} (${duration})`,
      });
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to schedule interview'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-7 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
              <FiCalendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Schedule Interview Call</h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Candidate: <strong className="text-slate-800 dark:text-slate-200">{app.candidate_name || 'Candidate'}</strong> ({app.candidate_id})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Date Presets Bar */}
        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            ⚡ Quick Presets
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => applyPreset(1, 10)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition text-center cursor-pointer"
            >
              Tomorrow (10 AM)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(2, 14)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition text-center cursor-pointer"
            >
              In 2 Days (2 PM)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(7, 11)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition text-center cursor-pointer"
            >
              Next Week (11 AM)
            </button>
          </div>
        </div>

        <form onSubmit={handleScheduleSubmit} className="space-y-5">
          {/* Separate Date and Time Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Interview Date *
              </label>
              <input
                type="date"
                min={todayStr}
                value={selectedDateStr}
                onChange={(e) => setSelectedDateStr(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Start Time *
              </label>
              <input
                type="time"
                value={selectedTimeStr}
                onChange={(e) => setSelectedTimeStr(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Session Duration Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Call Duration
            </label>
            <div className="flex space-x-2">
              {['30 mins', '45 mins', '60 mins'].map((dur) => (
                <button
                  type="button"
                  key={dur}
                  onClick={() => setDuration(dur)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    duration === dur
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {dur}
                </button>
              ))}
            </div>
          </div>

          {/* Google Meet Info Banner */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-slate-900/60 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-1 text-xs text-indigo-900 dark:text-indigo-200">
            <p className="font-extrabold flex items-center text-indigo-700 dark:text-indigo-300">
              <FiVideo className="mr-2 w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              Automated Google Meet Call Invite
            </p>
            <p className="text-[11px] opacity-85 leading-relaxed">
              A live Google Meet meeting URL will be auto-generated and dispatched immediately to candidate <strong>{app.candidate_id}</strong> via email.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await API.post(`/offers/generate/${app.id}`, { salary: "$120,000 / year", joining_date: "1st of Next Month" });
                  toast.success("Offer Letter auto-generated!");
                  onClose();
                } catch (err) {
                  toast.error("Failed to generate offer letter");
                }
              }}
            >
              Offer Letter
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" isLoading={loading} size="sm" className="font-bold shadow-md">
                Confirm & Send Invite
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main ApplicantsView Component ───────────────────────────────────────────
const ApplicantsView = ({ job, onBack }) => {
  const [applications, setApplications] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Search, Filter, Sort, Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [sortBy, setSortBy] = useState('score_desc');
  const [page, setPage] = useState(1);
  const limit = 10;

  const [selectedResultForEvidence, setSelectedResultForEvidence] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [showFairnessModal, setShowFairnessModal] = useState(false);
  const [schedulingApp, setSchedulingApp] = useState(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * limit;
      const res = await getJobApplications(job.id, {
        stage: selectedStage,
        sort_by: sortBy,
        skip,
        limit,
      });
      setApplications(res.data.items || []);
      setTotalCount(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (job) fetchApplications();
  }, [job, selectedStage, sortBy, page]);

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await updateApplicationStatus(appId, newStatus);
      toast.success('Status updated');
      fetchApplications();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleBulkScreening = async () => {
    setBulkLoading(true);
    try {
      const res = await triggerBulkScreening(job.id);
      toast.success(res.data.message || 'Bulk AI screening started!');
      fetchApplications();
    } catch (err) {
      toast.error('Failed to start bulk screening');
    } finally {
      setBulkLoading(false);
    }
  };

  // Client-side search filter
  const filteredApps = applications.filter((app) => {
    const query = searchQuery.toLowerCase();
    const name = (app.candidate_name || '').toLowerCase();
    const email = (app.candidate_id || '').toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  const totalPages = Math.ceil(totalCount / limit) || 1;
  const screenedCount = applications.filter(a => a.screening?.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={onBack}>
            <FiArrowLeft className="mr-1" /> Back to Jobs
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Applicants — {job.title}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {totalCount} Total Candidates · {screenedCount} Screened
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFairnessModal(true)}
            className="text-xs"
          >
            <FiShield className="mr-1.5 text-indigo-500" /> Fairness Report
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleBulkScreening}
            isLoading={bulkLoading}
            className="text-xs"
          >
            <FiZap className="mr-1.5" /> Run AI Screening for All
          </Button>
        </div>
      </div>

      {/* Toolbar: Search, Stage Filter, Sort */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <FiSearch className="absolute left-3.5 top-3 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search candidate by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Stage Filter */}
        <select
          value={selectedStage}
          onChange={(e) => { setSelectedStage(e.target.value); setPage(1); }}
          className="px-3 py-2 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          {STAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
          className="px-3 py-2 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Applicant Cards List */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredApps.length === 0 ? (
        <Card className="text-center py-16">
          <FiUsers className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No Applicants Found</h3>
          <p className="text-xs text-gray-500 mt-1">
            {searchQuery ? 'Try adjusting your search query or filters.' : 'No candidates have applied for this position yet.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app) => (
            <ApplicantCard
              key={app.id}
              app={app}
              onStatusChange={handleStatusChange}
              onOpenEvidence={(res, cid) => {
                setSelectedResultForEvidence(res);
                setSelectedCandidateId(cid);
              }}
              fetchApplications={fetchApplications}
              onSchedule={(targetApp) => setSchedulingApp(targetApp)}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 text-xs">
          <span className="text-gray-500">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalCount} candidates)
          </span>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <FiChevronLeft className="mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next <FiChevronRight className="ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      {schedulingApp && (
        <ScheduleModal
          app={schedulingApp}
          onClose={() => setSchedulingApp(null)}
          onSuccess={() => {
            fetchApplications();
            toast.success('Interview scheduled! Email sent to candidate.');
          }}
        />
      )}

      {/* Evidence Modal */}
      {selectedResultForEvidence && (
        <EvidenceModal
          result={selectedResultForEvidence}
          candidateId={selectedCandidateId}
          onClose={() => { setSelectedResultForEvidence(null); setSelectedCandidateId(''); }}
        />
      )}

      {/* Fairness Analytics Modal */}
      {showFairnessModal && (
        <FairnessModal
          applications={applications}
          onClose={() => setShowFairnessModal(false)}
        />
      )}
    </div>
  );
};

export default ApplicantsView;
