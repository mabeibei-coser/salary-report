// 复刻自 admin-hub/components/report/salary/industry-section.tsx
import React from 'react';
import { Factory } from 'lucide-react';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import SectionWrapper from './SectionWrapper';

const CENTER_URL = import.meta.env.VITE_CENTER_URL || 'http://localhost:4004/';

const DEMAND_TONE = {
  高: 'positive',
  中: 'neutral',
  低: 'warning',
};

export default function IndustrySection({ data, index, total, locked }) {
  if (!data || data.length === 0) {
    return (
      <SectionWrapper id="industry" title="细分行业分析" index={index} total={total} locked={locked}>
        <div className="text-[13px] text-center py-4" style={{ color: 'var(--report-ink-muted)' }}>
          暂无行业数据
        </div>
      </SectionWrapper>
    );
  }
  return (
    <SectionWrapper id="industry" title="细分行业分析" index={index} total={total}>
      <div className={locked ? 'relative' : ''}>
        <IndustryTable data={data} locked={locked} />
        {locked && (
          <>
            <div className="pointer-events-none absolute inset-x-0 top-[168px] h-12 bg-gradient-to-b from-white/10 via-white/75 to-white" />
            <IndustryVipGate />
          </>
        )}
      </div>
    </SectionWrapper>
  );
}

function IndustryTable({ data, locked }) {
  return (
    <div className={`overflow-x-auto -mx-1 pb-2 ${locked ? 'overflow-y-hidden max-h-[218px]' : ''}`}>
      <table className="w-full text-[12.5px] border-separate border-spacing-y-1.5" style={{ minWidth: 680 }}>
        <thead>
          <tr className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--report-ink-muted)' }}>
            <th className="text-left px-2 py-1 font-medium">行业</th>
            <th className="text-left px-2 py-1 font-medium">月薪范围</th>
            <th className="text-left px-2 py-1 font-medium">年薪范围</th>
            <th className="text-center px-2 py-1 font-medium">人才需求</th>
            <th className="text-right px-2 py-1 font-medium">上年涨薪</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={`${row.industry}-${i}`}
              className={`bg-white rounded-md ${locked && i >= 3 ? 'blur-[5px] opacity-45 select-none' : ''}`}
              style={{ boxShadow: '0 0 0 1px var(--report-border)' }}
            >
              <td className="px-2 py-2 rounded-l-md">
                <div className="flex items-center gap-1.5">
                  <Factory className="size-3.5 shrink-0" style={{ color: 'var(--cyan-600)' }} />
                  <div className="min-w-0">
                    <div className="font-semibold truncate" style={{ color: 'var(--navy-900)' }}>
                      {row.industry}
                    </div>
                    {row.description && (
                      <div className="text-[10.5px] truncate" style={{ color: 'var(--report-ink-muted)' }}>
                        {row.description}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td
                className="px-2 py-2 tabular-nums whitespace-nowrap"
                style={{ color: 'var(--report-ink-soft)' }}
              >
                {row.monthlyRange}
              </td>
              <td
                className="px-2 py-2 tabular-nums whitespace-nowrap"
                style={{ color: 'var(--report-ink-soft)' }}
              >
                {row.annualRange}
              </td>
              <td className="px-2 py-2 text-center">
                <span className="status-pill" data-tone={DEMAND_TONE[row.demandLevel] || 'neutral'}>
                  {row.demandLevel}
                </span>
              </td>
              <td
                className="px-2 py-2 text-right tabular-nums font-semibold rounded-r-md whitespace-nowrap"
                style={{ color: 'var(--cyan-700)' }}
              >
                {row.salaryIncrease}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IndustryVipGate() {
  return (
    <div className="mt-3 flex justify-center px-3">
      <div className="w-full max-w-[320px] rounded-xl border border-amber-200/70 bg-white/95 px-4 py-3 text-center shadow-lg shadow-slate-900/10">
        <WorkspacePremiumIcon style={{ fontSize: 28, color: '#b08a3e', display: 'block', margin: '0 auto 6px' }} />
        <p className="text-sm font-semibold text-gray-800 mb-1">VIP 会员可见完整行业明细</p>
        <p className="text-xs text-gray-500 mb-2">已开放前 3 行预览，左右滑动可查看列数据</p>
        <a
          href={`${CENTER_URL}billing`}
          className="inline-block px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)' }}
        >
          开通 VIP
        </a>
      </div>
    </div>
  );
}
