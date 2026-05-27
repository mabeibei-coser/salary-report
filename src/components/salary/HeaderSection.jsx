// 复刻自 admin-hub/components/report/salary/header-section.tsx
import React from 'react';
import { Briefcase, GraduationCap, MapPin, Building2, Tag } from 'lucide-react';
import SectionWrapper from './SectionWrapper';

const TONE_STYLE = {
  primary: { bg: 'var(--blue-50)', color: 'var(--blue-700)', ring: 'oklch(0.87 0.07 238 / 0.6)' },
  cyan: { bg: 'var(--cyan-100)', color: 'var(--cyan-700)', ring: 'oklch(0.88 0.07 200 / 0.6)' },
  navy: { bg: 'oklch(0.94 0.04 252)', color: 'var(--navy-800)', ring: 'oklch(0.85 0.04 252 / 0.6)' },
  muted: { bg: 'oklch(0.96 0.005 240)', color: 'var(--report-ink-soft)', ring: 'var(--border)' },
};

function Chip({ icon: Icon, label, tone }) {
  const s = TONE_STYLE[tone];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium"
      style={{ background: s.bg, color: s.color, boxShadow: `inset 0 0 0 1px ${s.ring}` }}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
}

export default function HeaderSection({ data, index, total }) {
  return (
    <SectionWrapper id="header" title="查询参数" index={index} total={total}>
      <div className="flex flex-wrap gap-2 items-center">
        <Chip icon={Briefcase} label={data.position} tone="primary" />
        <Chip icon={Tag} label={data.rankLabel || data.rank} tone={data.rankCategory === 'mgmt' ? 'navy' : 'cyan'} />
        <Chip icon={Building2} label={data.company} tone="cyan" />
        {data.education && <Chip icon={GraduationCap} label={data.education} tone="muted" />}
        {data.city && <Chip icon={MapPin} label={data.city} tone="muted" />}
      </div>
    </SectionWrapper>
  );
}
