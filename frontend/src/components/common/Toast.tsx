import React, { useEffect, useState } from 'react';

export type ToastType = 'error' | 'success' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const ICONS: Record<ToastType, string> = {
  error: 'fas fa-times-circle',
  success: 'fas fa-check-circle',
  warning: 'fas fa-exclamation-triangle',
  info: 'fas fa-info-circle',
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string; progress: string }> = {
  error: {
    bg: '#fff5f5',
    border: '#fc8181',
    icon: '#e53e3e',
    progress: 'linear-gradient(90deg, #e53e3e, #fc8181)',
  },
  success: {
    bg: '#f0fff4',
    border: '#68d391',
    icon: '#38a169',
    progress: 'linear-gradient(90deg, #38a169, #68d391)',
  },
  warning: {
    bg: '#fffaf0',
    border: '#f6ad55',
    icon: '#dd6b20',
    progress: 'linear-gradient(90deg, #dd6b20, #f6ad55)',
  },
  info: {
    bg: '#ebf8ff',
    border: '#63b3ed',
    icon: '#2b6cb0',
    progress: 'linear-gradient(90deg, #2b6cb0, #63b3ed)',
  },
};

const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 4000, onClose }) => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const color = COLORS[type];

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setVisible(true), 10);

    // Auto-close
    const closeTimer = setTimeout(() => {
      setLeaving(true);
      setTimeout(onClose, 350);
    }, duration);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setLeaving(true);
    setTimeout(onClose, 350);
  };

  return (
    <>
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes toastSlideOut {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(110%); opacity: 0; }
        }
        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
        .toast-container-custom {
          position: fixed;
          top: 24px;
          right: 24px;
          z-index: 99999;
          pointer-events: none;
        }
        .toast-box {
          pointer-events: all;
          min-width: 320px;
          max-width: 420px;
          border-radius: 14px;
          padding: 16px 18px 0 18px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          gap: 0;
          overflow: hidden;
          border: 1.5px solid;
          animation: toastSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .toast-box.leaving {
          animation: toastSlideOut 0.35s ease-in forwards;
        }
        .toast-body {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding-bottom: 14px;
        }
        .toast-icon {
          font-size: 20px;
          margin-top: 1px;
          flex-shrink: 0;
        }
        .toast-message {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.5;
          color: #2d3748;
        }
        .toast-close {
          background: none;
          border: none;
          cursor: pointer;
          color: #a0aec0;
          font-size: 14px;
          padding: 0;
          line-height: 1;
          flex-shrink: 0;
          transition: color 0.2s;
          margin-top: 2px;
        }
        .toast-close:hover { color: #718096; }
        .toast-progress {
          height: 3px;
          border-radius: 0 0 14px 14px;
          animation: toastProgress linear forwards;
        }
      `}</style>

      <div className="toast-container-custom">
        <div
          className={`toast-box ${leaving ? 'leaving' : ''}`}
          style={{
            background: color.bg,
            borderColor: color.border,
            opacity: visible ? 1 : 0,
          }}
        >
          <div className="toast-body">
            <i className={`${ICONS[type]} toast-icon`} style={{ color: color.icon }} />
            <span className="toast-message">{message}</span>
            <button className="toast-close" onClick={handleClose} aria-label="Đóng thông báo">
              <i className="fas fa-times" />
            </button>
          </div>
          <div
            className="toast-progress"
            style={{
              background: color.progress,
              animationDuration: `${duration}ms`,
            }}
          />
        </div>
      </div>
    </>
  );
};

export default Toast;
