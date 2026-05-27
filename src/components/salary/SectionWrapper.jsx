// 复刻自 admin-hub/components/report/salary/section-wrapper.tsx
// 不使用 framer-motion（入场动画由 SalaryReport 主容器统一处理）
import React from 'react';

export default function SectionWrapper({ id, title, index, total, takeaway, meta, children }) {
  const paddedIndex = String(index).padStart(2, '0');
  const paddedTotal = String(total).padStart(2, '0');

  return (
    <section id={id} data-pdf-section={id || title} className="report-card p-4 sm:p-5 break-inside-avoid-page">
      <header className="mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold text-white tabular-nums"
            style={{ background: 'var(--cyan-600)' }}
          >
            {paddedIndex} / {paddedTotal}
          </span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--report-ink-muted)' }}>
            Section
          </span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            className="text-lg sm:text-xl font-bold tracking-tight"
            style={{ color: 'var(--navy-950)', fontFamily: 'var(--font-heading-serif, inherit)' }}
          >
            {title}
          </h2>
          {meta && (
            <div className="text-[12px]" style={{ color: 'var(--report-ink-muted)' }}>
              {meta}
            </div>
          )}
        </div>
        {takeaway && <p className="report-takeaway mt-3">{takeaway}</p>}
      </header>
      {children}
    </section>
  );
}
