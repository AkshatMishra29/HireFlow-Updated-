import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});


API.interceptors.request.use((req) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Response interceptor — handle 401 token expiry and network errors
API.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Safely extract a human-readable error string from an Axios error.
 * Handles FastAPI Pydantic v2 validation errors where detail is an array
 * of {type, loc, msg, input} objects instead of a plain string.
 */
export const getErrorMessage = (err, fallback = 'An unexpected error occurred') => {
  const detail = err?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => {
      const field = Array.isArray(d.loc) ? d.loc.slice(1).join('.') : '';
      return field ? `${field}: ${d.msg}` : d.msg;
    }).join(' | ');
  }
  return fallback;
};

// Auth
export const loginUser = (formData) => API.post('/login', formData);
export const registerUser = (formData) => API.post('/register', formData);

// Jobs
export const getJobs = () => API.get('/jobs');
export const getJobById = (id) => API.get(`/jobs/${id}`);
export const createJob = (data) => API.post('/jobs', data);
export const updateJob = (id, data) => API.put(`/jobs/${id}`, data);
export const deleteJob = (id) => API.delete(`/jobs/${id}`);
export const parseJobDescription = (formData) => API.post('/jobs/parse-jd', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

// Resumes (now S3-backed)
export const uploadResume = (formData) => API.post('/resumes/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const getMyResumes = () => API.get('/resumes/me');
export const deleteResume = (id) => API.delete(`/resumes/${id}`);

// Applications
export const applyForJob = (data) => API.post('/applications', data);
export const getMyApplications = () => API.get('/applications/me');
export const getJobApplications = (jobId, params = {}) => API.get(`/applications/job/${jobId}`, { params });
export const updateApplicationStatus = (id, status) => API.patch(`/applications/${id}/status`, { status });

// Notifications
export const getMyNotifications = () => API.get('/notifications/me');
export const markNotificationRead = (id) => API.patch(`/notifications/${id}/read`);

// --- Module 3: AI Screening ---
export const triggerScreening = (payload) => API.post('/screening/run', payload);
export const triggerBulkScreening = (jobId) => API.post(`/screening/run-all/${jobId}`);
export const getScreeningResults = (jobId) => API.get(`/screening/results/${jobId}`);
export const getScreeningResultDetail = (resultId) => API.get(`/screening/result/${resultId}`);
export const getAuditLogs = (resultId) => API.get(`/screening/audit/${resultId}`);
export const getParsedResume = (resumeId) => API.get(`/screening/parsed-resume/${resumeId}`);

// --- Module 4: Interviews & AI Assistant Suite ---
export const scheduleInterview = (data) => API.post('/interviews/schedule', data);
export const getMyInterviews = () => API.get('/interviews/candidate/me');
export const getHrInterviews = () => API.get('/interviews/hr/all');
export const getJobInterviews = (jobId) => API.get(`/interviews/job/${jobId}`);
export const rescheduleInterview = (id, data) => API.patch(`/interviews/${id}/reschedule`, data);
export const deleteInterview = (id) => API.delete(`/interviews/${id}`);

export const addCompanyDoc = (data) => API.post('/assistant/company-docs', data);
export const getCompanyDocs = () => API.get('/assistant/company-docs');
export const deleteCompanyDoc = (id) => API.delete(`/assistant/company-docs/${id}`);

export const askFaqAgent = (question) => API.post('/assistant/faq', { question });
export const getResumeAdvice = (data) => API.post('/assistant/resume-advice', data);
export const getInterviewPrep = (data) => API.post('/assistant/interview-coach', data);

export default API;
