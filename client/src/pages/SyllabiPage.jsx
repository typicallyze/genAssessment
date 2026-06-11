import { useState, useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import api from '../services/api';
import Modal from '../components/Modal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { showToast } from '../store/toastSlice';

export default function SyllabiPage() {
  const [syllabi, setSyllabi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [generating, setGenerating] = useState(null);
  const dispatch = useDispatch();

  const fetchSyllabi = () => {
    api.get('/syllabi').then((res) => {
      setSyllabi(res.data.syllabi);
      setLoading(false);
    });
  };

  useEffect(() => { fetchSyllabi(); }, []);

  const handleGenerate = async (id) => {
    setGenerating(id);
    try {
      const res = await api.post(`/syllabi/${id}/generate`, { mcqCount: 5, subjectiveCount: 3 });
      dispatch(showToast('success', `Generated ${res.data.questions.length} questions!`));
      fetchSyllabi();
    } catch (err) {
      dispatch(showToast('error', err.response?.data?.error || 'Generation failed'));
    }
    setGenerating(null);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this syllabus and all associated data?')) return;
    await api.delete(`/syllabi/${id}`);
    dispatch(showToast('success', 'Syllabus deleted'));
    fetchSyllabi();
  };

  if (loading) return <LoadingSkeleton type="card" />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Syllabi</h1>
          <p>Upload course content and generate AI-powered questions</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>📤 Upload Syllabus</button>
      </div>

      {syllabi.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>No syllabi uploaded</h3>
          <p>Upload a DOCX or TXT file to start generating questions with AI</p>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>Upload Your First Syllabus</button>
        </div>
      ) : (
        <div className="cards-grid">
          {syllabi.map((s) => (
            <div key={s.id} className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{s.title}</h3>
                <span className="chip">📄 {s.question_count || 0} Q</span>
              </div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                Uploaded {new Date(s.created_at).toLocaleDateString()}
              </p>
              {s.raw_text && (
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '16px', lineHeight: 1.5, maxHeight: '60px', overflow: 'hidden' }}>
                  {s.raw_text.substring(0, 150)}...
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={generating === s.id}
                  onClick={() => handleGenerate(s.id)}
                >
                  {generating === s.id ? <><span className="spinner"></span> Generating...</> : '🤖 Generate Questions'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadModal isOpen={showUpload} onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); fetchSyllabi(); }} />
    </div>
  );
}

function UploadModal({ isOpen, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef();
  const dispatch = useDispatch();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title || file.name);
    try {
      await api.post('/syllabi', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      dispatch(showToast('success', 'Syllabus uploaded!'));
      setTitle('');
      setFile(null);
      onSuccess();
    } catch (err) {
      dispatch(showToast('error', err.response?.data?.error || 'Upload failed'));
    }
    setUploading(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Syllabus"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!file || uploading}>
            {uploading ? <><span className="spinner"></span> Uploading...</> : '📤 Upload'}
          </button>
        </>
      }
    >
      <div className="input-group">
        <label>Title (optional)</label>
        <input className="input" placeholder="e.g., CS101 Data Structures" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div
        className={`file-drop-zone ${dragActive ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" hidden accept=".docx,.txt" onChange={(e) => setFile(e.target.files[0])} />
        {file ? (
          <>
            <div className="drop-icon">📎</div>
            <div className="drop-text">{file.name}</div>
            <div className="drop-hint">{(file.size / 1024).toFixed(1)} KB — Click to change</div>
          </>
        ) : (
          <>
            <div className="drop-icon">📁</div>
            <div className="drop-text">Drop your file here or click to browse</div>
            <div className="drop-hint">Supports .docx and .txt files (max 10MB)</div>
          </>
        )}
      </div>
    </Modal>
  );
}
