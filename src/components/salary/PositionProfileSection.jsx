import React from 'react';
import { Brain, Briefcase, Gauge, Lightbulb, Target, TrendingUp } from 'lucide-react';
import SectionWrapper from './SectionWrapper';

const MODULE_META = {
  responsibilities: { icon: Briefcase, label: '核心职责' },
  competencies: { icon: Brain, label: '核心能力' },
  kpis: { icon: Gauge, label: '核心 KPI' },
  okrs: { icon: Target, label: 'OKR 设计' },
  innovation: { icon: Lightbulb, label: '创新业绩表现' },
  trend: { icon: TrendingUp, label: '近 3 年人选趋势解读（供给侧）' },
};

const PERSPECTIVE_META = [
  { field: 'distinctivePosition', eyebrow: '鲜明定位', title: '这个岗位真正创造什么价值' },
  { field: 'uniqueInsight', eyebrow: '独到判断', title: '识别人选时最容易忽略什么' },
  { field: 'futureOutlook', eyebrow: '创新前瞻', title: '未来 2–3 年将向哪里演进' },
];

const SUPPLY_TREND_CATEGORIES = ['数量与层次', '技能与证据', '来源与流动'];

function ModuleTitle({ type, note }) {
  const { icon: Icon, label } = MODULE_META[type];
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: 'var(--cyan-700)' }}>
        <span className="inline-flex size-7 items-center justify-center rounded-md" style={{ background: 'var(--cyan-50)' }}>
          <Icon className="size-4" />
        </span>
        {label}
      </div>
      {note && <span className="text-[10.5px]" style={{ color: 'var(--report-ink-muted)' }}>{note}</span>}
    </div>
  );
}

function ListCard({ type, items, renderItem }) {
  return (
    <div className="rounded-lg p-4" style={{ border: '1px solid var(--report-border)', background: 'oklch(0.985 0.006 240)' }}>
      <ModuleTitle type={type} />
      <div className="space-y-2.5">
        {items.map((item, index) => (
          <div key={`${type}-${index}`} className="flex gap-2.5 text-[12.5px] leading-relaxed">
            <span
              className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums"
              style={{ background: 'var(--cyan-100)', color: 'var(--cyan-700)' }}
            >
              {index + 1}
            </span>
            <div className="min-w-0" style={{ color: 'var(--report-ink-soft)' }}>{renderItem(item)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PositionProfileSection({ data, index, total, locked }) {
  const hasCurrentProfile =
    data?.jobPerspective &&
    Array.isArray(data?.candidateTrend?.trends) &&
    data.candidateTrend.trends.length === 3 &&
    data.candidateTrend.trends.every(
      (item, itemIndex) =>
        item?.category === SUPPLY_TREND_CATEGORIES[itemIndex] &&
        typeof item?.supplyAnalysis === 'string' &&
        item.supplyAnalysis.trim(),
    );

  if (!hasCurrentProfile) {
    return (
      <SectionWrapper id="position-profile" title="岗位画像" index={index} total={total}>
        <div className="rounded-lg px-4 py-5 text-center text-[12.5px]" style={{ background: 'var(--cyan-50)', color: 'var(--report-ink-muted)' }}>
          该历史报告使用旧版岗位画像，请重新查询以生成观点型画像与供给侧人选趋势。
        </div>
      </SectionWrapper>
    );
  }

  const responsibilities = Array.isArray(data.coreResponsibilities) ? data.coreResponsibilities : [];
  const competencies = Array.isArray(data.coreCompetencies) ? data.coreCompetencies : [];
  const kpis = Array.isArray(data.coreKpis) ? data.coreKpis : [];
  const okrs = Array.isArray(data.okrDesign) ? data.okrDesign : [];
  const achievements = Array.isArray(data.innovationAchievements) ? data.innovationAchievements : [];
  const trendItems = data.candidateTrend.trends;

  return (
    <SectionWrapper
      id="position-profile"
      title="岗位画像"
      index={index}
      total={total}
      takeaway="先给出对本岗位的鲜明判断，再展开职责、能力、结果标准和人才供给变化，避免一套话术套所有岗位。"
      meta="岗位定制 · 供给侧研判"
      locked={locked}
    >
      <div className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          {PERSPECTIVE_META.map((item, itemIndex) => (
            <div
              key={item.field}
              className="rounded-lg p-4"
              style={{
                border: '1px solid var(--report-border)',
                background: itemIndex === 0 ? 'var(--cyan-50)' : 'oklch(0.985 0.006 240)',
              }}
            >
              <div className="text-[10px] font-semibold tracking-[0.14em]" style={{ color: 'var(--cyan-700)' }}>
                {item.eyebrow}
              </div>
              <div className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--navy-900)' }}>{item.title}</div>
              <p className="mt-2 mb-0 text-[11.5px] leading-relaxed" style={{ color: 'var(--report-ink-soft)' }}>
                {data.jobPerspective[item.field]}
              </p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <ListCard type="responsibilities" items={responsibilities} renderItem={(item) => item} />
          <ListCard
            type="competencies"
            items={competencies}
            renderItem={(item) => (
              <>
                <div className="font-semibold" style={{ color: 'var(--navy-900)' }}>{item.name}</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--report-ink-muted)' }}>{item.description}</div>
              </>
            )}
          />
        </div>

        <div className="rounded-lg p-4" style={{ border: '1px solid var(--report-border)' }}>
          <ModuleTitle type="kpis" note="建议口径，需结合企业目标校准" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {kpis.map((item, index) => (
              <div key={`kpi-${index}`} className="rounded-md p-3" style={{ background: 'var(--cyan-50)' }}>
                <div className="text-[12px] font-semibold" style={{ color: 'var(--navy-900)' }}>{item.name}</div>
                <div className="text-[10.5px] mt-1 leading-relaxed" style={{ color: 'var(--report-ink-muted)' }}>{item.metric}</div>
                <div className="mt-2 text-[11px] font-semibold" style={{ color: 'var(--cyan-700)' }}>目标：{item.target}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg p-4" style={{ border: '1px solid var(--report-border)', background: 'oklch(0.985 0.006 240)' }}>
          <ModuleTitle type="okrs" note="示例方案，可直接作为讨论底稿" />
          <div className="grid md:grid-cols-2 gap-3">
            {okrs.map((okr, index) => (
              <div key={`okr-${index}`} className="rounded-lg bg-white p-3.5" style={{ border: '1px solid var(--report-border)' }}>
                <div className="flex gap-2 text-[12.5px] font-semibold" style={{ color: 'var(--navy-900)' }}>
                  <span className="shrink-0" style={{ color: 'var(--cyan-700)' }}>O{index + 1}</span>
                  <span>{okr.objective}</span>
                </div>
                <div className="mt-3 space-y-2">
                  {(okr.keyResults || []).map((kr, krIndex) => (
                    <div key={`okr-${index}-kr-${krIndex}`} className="flex gap-2 text-[11.5px] leading-relaxed" style={{ color: 'var(--report-ink-soft)' }}>
                      <span className="shrink-0 font-semibold" style={{ color: 'var(--cyan-600)' }}>KR{krIndex + 1}</span>
                      <span>{kr}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-4">
          <div className="md:col-span-2 rounded-lg p-4" style={{ border: '1px solid var(--report-border)' }}>
            <ModuleTitle type="innovation" />
            <div className="space-y-3">
              {achievements.map((item, index) => (
                <div key={`achievement-${index}`} className="border-l-2 pl-3" style={{ borderColor: 'var(--cyan-500)' }}>
                  <div className="text-[12px] font-semibold" style={{ color: 'var(--navy-900)' }}>{item.title}</div>
                  <div className="text-[11px] leading-relaxed mt-0.5" style={{ color: 'var(--report-ink-muted)' }}>{item.evidence}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-3 rounded-lg p-4" style={{ border: '1px solid var(--report-border)', background: 'oklch(0.985 0.006 240)' }}>
            <ModuleTitle type="trend" note="方向性研判，不代表平台样本统计" />
            <div className="grid sm:grid-cols-3 gap-2.5">
              {trendItems.map((item, itemIndex) => (
                <div key={`${item.title}-${itemIndex}`} className="rounded-md bg-white p-3" style={{ border: '1px solid var(--report-border)' }}>
                  <div className="text-[9.5px] font-semibold tracking-[0.12em]" style={{ color: 'var(--cyan-600)' }}>
                    趋势 {String(itemIndex + 1).padStart(2, '0')} · {item.category}
                  </div>
                  <div className="mt-1 text-[12px] font-semibold" style={{ color: 'var(--navy-900)' }}>{item.title}</div>
                  <p className="text-[11px] leading-relaxed mt-2 mb-0" style={{ color: 'var(--report-ink-soft)' }}>{item.supplyAnalysis}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}
