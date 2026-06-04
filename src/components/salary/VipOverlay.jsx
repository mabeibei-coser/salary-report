import React from 'react';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

const CENTER_URL = import.meta.env.VITE_CENTER_URL || 'http://localhost:4004/';

export default function VipOverlay({ isVip, children }) {
  if (isVip) return children;

  return (
    <div className="relative">
      <div className="blur-[6px] pointer-events-none select-none opacity-50">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl">
        <div className="text-center px-4 py-6">
          <WorkspacePremiumIcon style={{ fontSize: 32, color: '#b08a3e', display: 'block', margin: '0 auto 8px' }} />
          <p className="text-sm font-semibold text-gray-800 mb-1">VIP 会员可见</p>
          <p className="text-xs text-gray-500 mb-3">开通 VIP 解锁行业细分与高薪人群数据</p>
          <a
            href={`${CENTER_URL}billing`}
            className="inline-block px-5 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}
          >
            开通 VIP
          </a>
        </div>
      </div>
    </div>
  );
}
