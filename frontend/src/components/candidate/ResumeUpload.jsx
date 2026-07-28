import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { FiUploadCloud, FiFileText, FiDownload, FiEye, FiTrash2, FiCheckCircle, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { uploadResume, getMyResumes, deleteResume, getErrorMessage } from '../../api';

// ─── File type icon + color ───────────────────────────────────────────────────
const fileIcon = (filename = '') => {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    pdf:  { bg: 'bg-red-50 dark:bg-red-950/40',     text: 'text-red-600',    label: 'PDF'  },
    docx: { bg: 'bg-blue-50 dark:bg-blue-950/40',   text: 'text-blue-600',   label: 'DOCX' },
    doc:  { bg: 'bg-blue-50 dark:bg-blue-950/40',   text: 'text-blue-600',   label: 'DOC'  },
    txt:  { bg: 'bg-gray-50 dark:bg-gray-700/40',   text: 'text-gray-600',   label: 'TXT'  },
  };
  return map[ext] || map['txt'];
};

// ─── Single Resume Thumbnail Card ─────────────────────────────────────────────
const ResumeCard = ({ resume, onPreview, onDelete }) => {
  const icon = fileIcon(resume.filename);
  const uploadDate = new Date(resume.uploaded_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 transition-all flex flex-col items-center text-center">
      {/* File Thumbnail */}
      <div className={`w-16 h-20 ${icon.bg} rounded-xl flex flex-col items-center justify-center mb-3 shadow-inner relative`}>
        <FiFileText className={`w-7 h-7 ${icon.text}`} />
        <span className={`absolute bottom-1.5 text-[9px] font-bold ${icon.text} tracking-wider`}>
          {icon.label}
        </span>
      </div>

      {/* Filename */}
      <p className="text-xs font-bold text-gray-900 dark:text-white w-full truncate px-1" title={resume.filename}>
        {resume.filename}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">{uploadDate}</p>

      {/* Ready Badge */}
      <span className="mt-2 inline-flex items-center px-2 py-0.5 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800">
        <FiCheckCircle className="w-2.5 h-2.5 mr-1" /> Ready
      </span>

      {/* Action Buttons — appear on hover */}
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center space-x-2">
        <button
          onClick={() => onPreview(resume)}
          className="p-2 bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition"
          title="Preview"
        >
          <FiEye className="w-4 h-4" />
        </button>
        <a
          href={resume.presigned_url || resume.file_url}
          target="_blank"
          rel="noreferrer"
          className="p-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition"
          title="Download"
        >
          <FiDownload className="w-4 h-4" />
        </a>
        <button
          onClick={() => onDelete(resume.id)}
          className="p-2 bg-white dark:bg-gray-700 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl transition"
          title="Delete Resume"
        >
          <FiTrash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// ─── Preview Modal ────────────────────────────────────────────────────────────
const PreviewModal = ({ resume, onClose }) => {
  if (!resume) return null;
  const url = resume.presigned_url || resume.file_url;
  const isPDF = resume.filename?.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${fileIcon(resume.filename).bg}`}>
              <FiFileText className={`w-4 h-4 ${fileIcon(resume.filename).text}`} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-sm">{resume.filename}</p>
              <p className="text-[10px] text-gray-400">
                Uploaded {new Date(resume.uploaded_at).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl hover:bg-indigo-100 transition"
            >
              <FiDownload className="mr-1.5 w-3.5 h-3.5" /> Download
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-4">
          {isPDF && url ? (
            <iframe
              src={url}
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700"
              style={{ height: '65vh' }}
              title="Resume Preview"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-3">
              <FiFileText className="w-12 h-12" />
              <p className="text-sm font-medium">Preview not available for {fileIcon(resume.filename).label} files</p>
              <a href={url} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 underline">
                Open / Download file
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main ResumeUpload ────────────────────────────────────────────────────────
const ResumeUpload = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewResume, setPreviewResume] = useState(null);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const res = await getMyResumes();
      setResumes(res.data || []);
    } catch { toast.error('Failed to load resumes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchResumes(); }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await uploadResume(formData);
      toast.success('Resume uploaded to cloud!');
      fetchResumes();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload failed'));
    } finally { setUploading(false); }
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleUpload(e.dataTransfer.files[0]);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this resume? Applications using this resume may need an updated file.')) return;
    try {
      await deleteResume(id);
      toast.success('Resume deleted');
      fetchResumes();
    } catch {
      toast.error('Failed to delete resume');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">My Resumes</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Upload and manage your resume documents. Hover a card to preview, download, or delete.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 scale-[1.01]'
            : 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/10'
        }`}
      >
        <div className="flex flex-col items-center space-y-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-all ${
            dragActive ? 'bg-indigo-500 text-white scale-110' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600'
          }`}>
            <FiUploadCloud className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {uploading ? 'Uploading to cloud...' : dragActive ? 'Drop to upload' : 'Drag & drop your resume here'}
            </p>
            {!uploading && !dragActive && (
              <p className="text-xs text-gray-400 mt-1">
                or{' '}
                <label className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-semibold">
                  browse files
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                    className="hidden"
                  />
                </label>
                {' · PDF format only (.pdf) · Max 10MB'}
              </p>
            )}
          </div>
          {uploading && (
            <div className="w-48 h-1.5 bg-indigo-100 dark:bg-indigo-900 rounded-full overflow-hidden">
              <div className="h-1.5 bg-indigo-500 rounded-full animate-pulse w-3/4" />
            </div>
          )}
        </div>
      </div>

      {/* Resume Cards Grid (thumbnail style) */}
      <div>
        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">
          Uploaded Resumes
          <span className="ml-2 text-xs font-normal text-gray-400">({resumes.length})</span>
        </h3>

        {loading ? (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 rounded-2xl bg-gray-100 dark:bg-gray-700 animate-pulse" />
            ))}
          </div>
        ) : resumes.length === 0 ? (
          <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <FiFileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No resumes yet. Upload one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {resumes.map((r) => (
              <ResumeCard key={r.id} resume={r} onPreview={setPreviewResume} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewResume && (
        <PreviewModal resume={previewResume} onClose={() => setPreviewResume(null)} />
      )}
    </div>
  );
};

export default ResumeUpload;
