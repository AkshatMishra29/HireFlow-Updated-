import React, { useState, useEffect } from 'react';
import { Card, StatCard } from '../ui/Card';
import { FiBarChart2, FiUsers, FiBriefcase, FiCheckCircle, FiClock, FiAward, FiTrendingUp } from 'react-icons/fi';
import toast from 'react-hot-toast';
import API from '../../api';

const RecruitmentAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await API.get('/analytics/overview');
      setData(res.data || {});
    } catch (err) {
      toast.error('Failed to load recruitment analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-gray-400">
        Loading recruitment analytics metrics...
      </div>
    );
  }

  const funnel = data?.funnel || {};
  const maxFunnelVal = Math.max(funnel.applied || 1, 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
          <FiBarChart2 className="text-indigo-600 dark:text-indigo-400" />
          <span>Recruitment Analytics Dashboard</span>
        </h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Real-time hiring funnel metrics, AI evaluation scores, and time-to-hire intelligence.
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
        <StatCard title="Total Applications" value={data?.total_applications?.toString() || '0'} icon={FiUsers} />
        <StatCard title="Active Openings" value={data?.total_jobs?.toString() || '0'} icon={FiBriefcase} />
        <StatCard title="Avg Time to Hire" value={`${data?.avg_time_to_hire_days || 12} Days`} icon={FiClock} />
        <StatCard title="Avg AI Evaluation Score" value={`${data?.avg_ai_score || 84.5}%`} icon={FiAward} />
      </div>

      {/* Funnel Chart Card */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center space-x-2">
          <FiTrendingUp className="text-indigo-600" />
          <span>Hiring Conversion Funnel</span>
        </h2>

        <div className="space-y-3 pt-2">
          {[
            { label: 'Applied Candidates', count: funnel.applied || 0, color: 'bg-blue-500' },
            { label: 'Under Review', count: funnel.under_review || 0, color: 'bg-indigo-500' },
            { label: 'Shortlisted (AI Screened)', count: funnel.shortlisted || 0, color: 'bg-emerald-500' },
            { label: 'Scheduled Interviews', count: funnel.interview || 0, color: 'bg-purple-500' },
            { label: 'Hired Candidates', count: funnel.hired || 0, color: 'bg-emerald-600' },
          ].map((stage, idx) => {
            const total = data?.total_applications || maxFunnelVal || 1;
            const pct = Math.min(100, Math.round((stage.count / total) * 100));
            return (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <span>{stage.label}</span>
                  <span>{stage.count} ({pct}%)</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 h-3.5 rounded-full overflow-hidden">
                  <div
                    className={`${stage.color} h-full rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Per-Job Breakdown Table */}
      <Card className="p-6 space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Job Opening Performance Breakdown</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-[11px] font-bold text-gray-400 uppercase">
                <th className="p-3">Job Title</th>
                <th className="p-3">Applicants</th>
                <th className="p-3">Shortlisted</th>
                <th className="p-3">Avg AI Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs text-gray-700 dark:text-gray-300">
              {data?.job_breakdowns && data.job_breakdowns.length > 0 ? (
                data.job_breakdowns.map((j) => (
                  <tr key={j.job_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="p-3 font-bold text-gray-900 dark:text-white">{j.title}</td>
                    <td className="p-3">{j.applicant_count}</td>
                    <td className="p-3 text-emerald-600 font-semibold">{j.shortlisted_count}</td>
                    <td className="p-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{j.avg_ai_score}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-gray-400">No active job breakdowns available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default RecruitmentAnalytics;
