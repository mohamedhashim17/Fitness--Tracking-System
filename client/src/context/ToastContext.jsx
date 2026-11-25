import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, Trophy, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'success', title = '') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type, title }]);
      setTimeout(() => removeToast(id), 4200);
    },
    [removeToast]
  );

  const notifyBadges = useCallback(
    (newlyEarned = []) => {
      newlyEarned.forEach((b) => {
        showToast(`${b.description} (+${b.points} pts)`, 'achievement', `Badge Unlocked: ${b.name}`);
      });
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, notifyBadges }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const iconMap = {
            success: <CheckCircle2 className="w-5 h-5 text-[#39ff14] shrink-0" />,
            error: <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />,
            info: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
            achievement: <Trophy className="w-5 h-5 text-amber-400 shrink-0" />,
          };
          const borderMap = {
            success: 'border-[#39ff14]/40',
            error: 'border-rose-500/40',
            info: 'border-sky-500/40',
            achievement: 'border-amber-400/50 bg-gradient-to-r from-[#181b22] to-[#1f1c12]',
          };

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-[#161920]/95 backdrop-blur-md border shadow-2xl transition-all ${borderMap[t.type] || borderMap.info}`}
            >
              {iconMap[t.type] || iconMap.info}
              <div className="flex-1 min-w-0">
                {t.title && <p className="text-xs font-bold uppercase tracking-wider text-amber-300">{t.title}</p>}
                <p className="text-sm text-zinc-100 leading-snug">{t.message}</p>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
