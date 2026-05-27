// 复刻自 admin-hub/components/report/salary/city-section.tsx
import React from 'react';
import { MapPin } from 'lucide-react';
import SectionWrapper from './SectionWrapper';
import { formatNumber } from '../../utils/salaryCalculator';

const LEVEL_TONE = {
  高: 'positive',
  中: 'neutral',
  低: 'warning',
};

export default function CitySection({ data, index, total }) {
  if (!data || data.length === 0) {
    return (
      <SectionWrapper id="city" title="城市对比" index={index} total={total}>
        <div className="text-[13px] text-center py-4" style={{ color: 'var(--report-ink-muted)' }}>
          暂无城市数据
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper id="city" title="城市对比" index={index} total={total}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {data.map((c, i) => (
          <div
            key={`${c.city}-${i}`}
            className="rounded-lg bg-white p-3"
            style={{ border: '1px solid var(--report-border)' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div
                className="flex items-center gap-1 font-semibold text-[13px]"
                style={{ color: 'var(--navy-900)' }}
              >
                <MapPin className="size-3.5" style={{ color: 'var(--cyan-600)' }} />
                {c.city}
              </div>
              <span className="status-pill" data-tone={LEVEL_TONE[c.salaryLevel] || 'neutral'}>
                {c.salaryLevel}
              </span>
            </div>
            <div className="text-[16px] font-bold tabular-nums" style={{ color: 'var(--navy-900)' }}>
              ¥{formatNumber(c.monthlyAvg)}
              <span className="text-[10.5px] font-normal ml-1" style={{ color: 'var(--report-ink-muted)' }}>
                /月
              </span>
            </div>
            <div className="mt-1 text-[11px] tabular-nums" style={{ color: 'var(--report-ink-muted)' }}>
              生活成本指数 {c.costIndex}（北京=100）
            </div>
            {c.advantage && (
              <p
                className="mt-2 text-[11.5px] leading-relaxed line-clamp-2"
                style={{ color: 'var(--report-ink-soft)' }}
              >
                {c.advantage}
              </p>
            )}
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
