import React, { useEffect, useState } from 'react';
import Toast from './Toast';

interface ConfirmLogoutModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmLogoutModal: React.FC<ConfirmLogoutModalProps> = ({ onConfirm, onCancel }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isLoggingOut) onCancel(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel, isLoggingOut]);

  const handleConfirm = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      onConfirm();
    }, 900);
  };

  return (
    <>
      <style>{`
        @keyframes clModalIn {
          from { opacity: 0; transform: scale(0.92) translateY(-12px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
        .cl-overlay {
          position: fixed; inset: 0; z-index: 99998;
          background: rgba(15,20,40,0.55);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
        }
        .cl-modal {
          background: #fff; border-radius: 20px; padding: 36px 32px 28px;
          max-width: 380px; width: 90%; text-align: center;
          box-shadow: 0 24px 60px rgba(0,0,0,0.18);
          animation: clModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .cl-icon-ring {
          width: 72px; height: 72px; border-radius: 50%;
          background: linear-gradient(135deg,#fff1f0,#ffe4e4);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 20px; border: 2px solid #ffd6d6;
        }
        .cl-title { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 8px; }
        .cl-desc  { font-size: 14px; color: #6c757d; margin-bottom: 28px; line-height: 1.5; }
        .cl-btn-cancel {
          flex: 1; padding: 11px; border-radius: 10px; font-weight: 600; font-size: 14px;
          border: 2px solid #e9ecef; background: #f8f9fa; color: #495057;
          cursor: pointer; transition: all 0.2s;
        }
        .cl-btn-cancel:hover { border-color: #adb5bd; background: #fff; }
        .cl-btn-confirm {
          flex: 1; padding: 11px; border-radius: 10px; font-weight: 600; font-size: 14px;
          border: none; background: linear-gradient(135deg,#dc3545,#b02a37);
          color: #fff; cursor: pointer; transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(220,53,69,0.3);
        }
        .cl-btn-confirm:hover { background: linear-gradient(135deg,#b02a37,#842029); transform: translateY(-1px); box-shadow: 0 6px 18px rgba(220,53,69,0.4); }
      `}</style>

      <div className="cl-overlay" onClick={onCancel}>
        <div className="cl-modal" onClick={e => e.stopPropagation()}>
          <div className="cl-icon-ring">
            <i className="fas fa-sign-out-alt" style={{ fontSize: 28, color: '#dc3545' }} />
          </div>
          <div className="cl-title">Đăng xuất?</div>
          <div className="cl-desc">
            Bạn có chắc chắn muốn đăng xuất khỏi tài khoản không?
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="cl-btn-cancel" onClick={onCancel} disabled={isLoggingOut}>
              <i className="fas fa-times me-2" />Hủy
            </button>
            <button className="cl-btn-confirm" onClick={handleConfirm} disabled={isLoggingOut}>
              <i className={isLoggingOut ? "fas fa-spinner fa-spin me-2" : "fas fa-sign-out-alt me-2"} />
              {isLoggingOut ? "Đang xử lý..." : "Đăng xuất"}
            </button>
          </div>
        </div>
      </div>
      {isLoggingOut && <Toast message="Đăng xuất thành công!" type="success" duration={900} onClose={() => {}} />}
    </>
  );
};

export default ConfirmLogoutModal;
