import { useSelector } from 'react-redux';
import { removeToast } from '../store/toastSlice';
import { useDispatch } from 'react-redux';

export default function ToastContainer() {
  const { toasts } = useSelector((s) => s.toast);
  const dispatch = useDispatch();

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dispatch(removeToast(t.id))}>
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : t.type === 'warning' ? '⚠' : 'ℹ'}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
