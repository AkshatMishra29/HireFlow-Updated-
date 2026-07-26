import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { FiCalendar, FiVideo, FiClock, FiBriefcase, FiUser, FiCheckCircle, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { getMyInterviews, deleteInterview, getErrorMessage } from '../../api';

const MyInterviews = () => {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const res = await getMyInterviews();
      setInterviews(res.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load scheduled interviews'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');

  const filteredInterviews = interviews.filter((item) => {
    const q = searchQuery.toLowerCase();
    const role = (item.job_title || '').toLowerCase();
    const time = (item.scheduled_time || '').toLowerCase();
    return role.includes(q) || time.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <FiCalendar className="text-indigo-600 dark:text-indigo-400" />
            <span>My Scheduled Interviews</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {filteredInterviews.length} of {interviews.length} upcoming rounds shown.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchInterviews}>
          <FiRefreshCw className="mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Candidate Search Bar */}
      {interviews.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <input
            type="text"
            placeholder="Search interview by role title or scheduled date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 text-xs bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : filteredInterviews.length === 0 ? (
        <Card className="text-center py-16">
          <FiCalendar className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">No Matching Interviews</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            Try clearing your search query.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInterviews.map((item) => (
            <Card key={item.id} className="p-5 flex flex-col justify-between space-y-4 hover:border-indigo-300 dark:hover:border-indigo-800 transition shadow-sm">
              <div className="space-y-2">
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
                    <FiBriefcase className="w-4 h-4 text-indigo-500" />
                    <span>{item.job_title}</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Candidate: {item.candidate_name}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <button
                  onClick={async () => {
                    if (window.confirm('Remove this interview card?')) {
                      try {
                        await deleteInterview(item.id);
                        toast.success('Interview card removed');
                        fetchInterviews();
                      } catch (err) {
                        toast.error('Failed to remove card');
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
                    <FiVideo className="mr-1.5 w-3.5 h-3.5" /> Join Call
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyInterviews;
