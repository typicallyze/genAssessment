import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import api from '../services/api';
import Modal from '../components/Modal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { showToast } from '../store/toastSlice';
import { 
  HelpCircle, 
  Edit2, 
  Trash2, 
  Check, 
  Circle 
} from 'lucide-react';

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', topic: '', difficulty: '' });
  const [editing, setEditing] = useState(null);
  const dispatch = useDispatch();

  const fetchQuestions = () => {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.topic) params.set('topic', filters.topic);
    if (filters.difficulty) params.set('difficulty', filters.difficulty);
    api.get(`/questions?${params}`).then((res) => {
      setQuestions(res.data.questions);
      setLoading(false);
    });
  };

  useEffect(() => { fetchQuestions(); }, [filters]);

  const handleDelete = async (id) => {
    if (!confirm('Remove this question from the bank?')) return;
    await api.delete(`/questions/${id}`);
    dispatch(showToast('success', 'Question removed'));
    fetchQuestions();
  };

  const handleSave = async (id, data) => {
    await api.put(`/questions/${id}`, data);
    dispatch(showToast('success', 'Question updated'));
    setEditing(null);
    fetchQuestions();
  };

  if (loading) return <LoadingSkeleton type="table" count={5} />;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Question Bank</h1>
          <p>{questions.length} questions in your bank</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select className="input" style={{ width: '160px' }} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All Types</option>
          <option value="mcq">MCQ</option>
          <option value="subjective">Subjective</option>
        </select>
        <input className="input" style={{ width: '200px' }} placeholder="Filter by topic..." value={filters.topic} onChange={(e) => setFilters({ ...filters, topic: e.target.value })} />
        <select className="input" style={{ width: '160px' }} value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}>
          <option value="">All Difficulties</option>
          {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>Level {d}</option>)}
        </select>
      </div>

      {questions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <HelpCircle size={36} />
          </div>
          <h3>No questions found</h3>
          <p>Generate questions from a syllabus or adjust your filters</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {questions.map((q, idx) => (
            <div key={q.id} className="card" style={{ animation: `slideUp 0.3s ease-out ${idx * 0.05}s both` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`badge badge-${q.type}`}>{q.type}</span>
                  <span className="chip">{q.topic || 'General'}</span>
                  <div className="difficulty">
                    {[1, 2, 3, 4, 5].map((d) => (
                      <div key={d} className={`difficulty-dot ${d <= q.difficulty ? 'filled' : ''}`}></div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(q)}>
                    <Edit2 size={14} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(q.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p style={{ fontSize: '15px', lineHeight: 1.6 }}>{q.question_text}</p>
              {q.type === 'mcq' && q.options && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                  {q.options.sort((a, b) => a.display_order - b.display_order).map((o) => (
                    <span key={o.id} className="chip" style={o.is_correct ? { borderColor: 'var(--color-success)', color: 'var(--color-success)', gap: '6px' } : { gap: '6px' }}>
                      {o.is_correct ? <Check size={12} /> : <Circle size={10} />} {o.option_text}
                    </span>
                  ))}
                </div>
              )}
              {q.type === 'subjective' && q.rubrics && q.rubrics.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Rubric</span>
                  <div className="rubric-list" style={{ marginTop: '6px' }}>
                    {q.rubrics.map((r) => (
                      <div key={r.id} className="rubric-item">
                        <span className="rubric-criterion">{r.criterion}</span>
                        <span className="rubric-score">{r.max_marks} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                {q.default_marks} marks
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditQuestionModal
          question={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function EditQuestionModal({ question, onClose, onSave }) {
  const [form, setForm] = useState({
    question_text: question.question_text,
    difficulty: question.difficulty,
    topic: question.topic,
    default_marks: question.default_marks,
    options: question.options || [],
    rubrics: question.rubrics || [],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    await onSave(question.id, form);
    setSaving(false);
  };

  const updateOption = (idx, field, value) => {
    const opts = [...form.options];
    opts[idx] = { ...opts[idx], [field]: value };
    if (field === 'is_correct') {
      opts.forEach((o, i) => { if (i !== idx) o.is_correct = false; });
    }
    setForm({ ...form, options: opts });
  };

  const updateRubric = (idx, field, value) => {
    const rubs = [...form.rubrics];
    rubs[idx] = { ...rubs[idx], [field]: value };
    setForm({ ...form, rubrics: rubs });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Edit Question"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </>
      }
    >
      <div className="input-group">
        <label>Question Text</label>
        <textarea className="input" rows={3} value={form.question_text} onChange={(e) => setForm({ ...form, question_text: e.target.value })} />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div className="input-group" style={{ flex: 1 }}>
          <label>Topic</label>
          <input className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
        </div>
        <div className="input-group" style={{ width: '100px' }}>
          <label>Difficulty</label>
          <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: parseInt(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="input-group" style={{ width: '100px' }}>
          <label>Marks</label>
          <input className="input" type="number" min="1" value={form.default_marks} onChange={(e) => setForm({ ...form, default_marks: parseInt(e.target.value) })} />
        </div>
      </div>

      {question.type === 'mcq' && (
        <div>
          <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'block' }}>Options</label>
          {form.options.sort((a, b) => a.display_order - b.display_order).map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <input
                type="radio"
                name="correct"
                checked={o.is_correct}
                onChange={() => updateOption(i, 'is_correct', true)}
                style={{ accentColor: 'var(--color-accent-primary)' }}
              />
              <input
                className="input"
                value={o.option_text}
                onChange={(e) => updateOption(i, 'option_text', e.target.value)}
              />
            </div>
          ))}
        </div>
      )}

      {question.type === 'subjective' && (
        <div>
          <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'block' }}>Rubric Criteria</label>
          {form.rubrics.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input className="input" placeholder="Criterion" value={r.criterion} onChange={(e) => updateRubric(i, 'criterion', e.target.value)} />
              <input className="input" type="number" style={{ width: '80px' }} placeholder="Marks" value={r.max_marks} onChange={(e) => updateRubric(i, 'max_marks', parseInt(e.target.value))} />
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, rubrics: [...form.rubrics, { criterion: '', max_marks: 1, description: '' }] })}>
            + Add Criterion
          </button>
        </div>
      )}
    </Modal>
  );
}
