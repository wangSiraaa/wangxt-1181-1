import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useApp } from '../store/AppContext';

export default function Toast() {
  const { toast, dispatch } = useApp();

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => dispatch({ type: 'HIDE_TOAST' }), 3200);
      return () => clearTimeout(t);
    }
  }, [toast, dispatch]);

  if (!toast) return null;

  const styles = {
    success: 'bg-solar-50 border-solar-500 text-solar-700',
    error: 'bg-danger-50 border-danger-500 text-danger-700',
    info: 'bg-grid-50 border-grid-500 text-grid-700',
    warn: 'bg-warn-50 border-warn-500 text-warn-700'
  } as const;

  const icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warn: AlertTriangle
  } as const;

  const Icon = icons[toast.type];

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-[slideIn_.25s_ease-out]">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-l-4 shadow-lg ${styles[toast.type]} bg-white`}>
        <Icon size={20} />
        <span className="text-sm font-medium">{toast.msg}</span>
        <button
          onClick={() => dispatch({ type: 'HIDE_TOAST' })}
          className="ml-2 text-current opacity-60 hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
