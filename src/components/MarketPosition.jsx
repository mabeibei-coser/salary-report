import React from 'react';
import { Box, Typography, Grid, Chip } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import { formatNumber, getComparisonText, generateSummary } from '../utils/salaryCalculator';

const ACCENT = '#1e3a5f';

export default function MarketPosition({ salaryData, marketComparison, salaryTrend }) {
  const { diffPct } = marketComparison;
  const comparison = getComparisonText(diffPct);
  const summary = generateSummary(salaryData.position, salaryData.company, diffPct, salaryData.monthly.p50);

  const diffIcon = diffPct > 5
    ? <ArrowUpwardIcon sx={{ fontSize: 16, color: comparison.color }} />
    : diffPct < -5
      ? <ArrowDownwardIcon sx={{ fontSize: 16, color: comparison.color }} />
      : <RemoveIcon sx={{ fontSize: 16, color: comparison.color }} />;

  const highEarnerTraits = salaryData.highEarnerTraits || '该岗位较高薪资人群通常具备：丰富行业经验（5年以上）、核心项目主导能力、跨部门协作经验、持续学习与技术迭代能力，部分岗位需具备管理团队或业务拓展能力。';

  // ── 近 5 年薪酬趋势图（SVG 折线）──
  const trend = Array.isArray(salaryTrend) && salaryTrend.length >= 2 ? salaryTrend : [];
  const VBW = 420;
  const VBH = 200;
  // 加大左右边距，防止第一/最后一个数据点的金额和年份标签溢出
  const PAD = { l: 26, r: 30, t: 32, b: 30 };
  const PW = VBW - PAD.l - PAD.r;
  const PH = VBH - PAD.t - PAD.b;
  let trendPoints = [];
  let linePath = '';
  let areaPath = '';
  let growthPct = 0;
  if (trend.length >= 2) {
    const vals = trend.map((d) => d.monthly);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = Math.max(maxV - minV, 1);
    trendPoints = trend.map((d, i) => {
      const x = PAD.l + (PW * i) / (trend.length - 1);
      const ratio = (d.monthly - minV) / range;
      const y = PAD.t + PH * 0.92 - ratio * PH * 0.78;
      return { ...d, x, y };
    });
    linePath = trendPoints.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
    const baseY = PAD.t + PH;
    areaPath = `${linePath} L${trendPoints[trendPoints.length - 1].x},${baseY} L${trendPoints[0].x},${baseY} Z`;
    growthPct = Math.round(((trend[trend.length - 1].monthly / trend[0].monthly) - 1) * 100);
  }

  // 最新更新日期 = 当前日期 - 7天
  const updateDate = new Date();
  updateDate.setDate(updateDate.getDate() - 7);
  const updateStr = `${updateDate.getFullYear()}-${String(updateDate.getMonth() + 1).padStart(2, '0')}-${String(updateDate.getDate()).padStart(2, '0')}`;

  return (
    <Box className="glass-card" sx={{ p: { xs: 2, md: 2.5 } }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem', color: ACCENT }}>
        <Box component="span" sx={{ width: 3, height: 20, borderRadius: 1.5, backgroundColor: ACCENT, display: 'inline-block' }} />
        市场定位分析
      </Typography>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={5}>
          <Box sx={{ textAlign: 'center', p: 2.5, borderRadius: 2, backgroundColor: 'rgba(30,58,95,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
            <Typography variant="caption" sx={{ color: '#64748b' }}>当前月薪 vs 市场均值</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 0.5, mt: 0.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: ACCENT, fontSize: '1.75rem' }}>¥{formatNumber(salaryData.monthly.p50)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              {diffIcon}
              <Typography variant="h6" sx={{ fontWeight: 700, color: comparison.color, fontSize: '1.25rem' }}>{diffPct > 0 ? '+' : ''}{diffPct}%</Typography>
            </Box>
            <Chip label={comparison.text} size="small" sx={{ mt: 1, backgroundColor: `${comparison.color}18`, color: comparison.color, fontWeight: 600, fontSize: '0.7rem' }} />
            <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6, textAlign: 'left', mt: 1.5, fontSize: '0.8rem' }}>{summary}</Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={7}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 500 }}>该岗位近 5 年薪酬水平</Typography>
            {trendPoints.length >= 2 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <TrendingUpIcon sx={{ fontSize: 14, color: growthPct >= 0 ? '#2e7d32' : '#c62828' }} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: growthPct >= 0 ? '#2e7d32' : '#c62828', fontSize: '0.7rem' }}>
                  5 年累计 {growthPct >= 0 ? '+' : ''}{growthPct}%
                </Typography>
              </Box>
            )}
          </Box>

          {trendPoints.length >= 2 ? (
            <Box sx={{ p: 1, borderRadius: 2, backgroundColor: 'rgba(30,58,95,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <svg viewBox={`0 0 ${VBW} ${VBH}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
                <defs>
                  <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e3a5f" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* 横向参考虚线（3 条） */}
                {[0.25, 0.5, 0.75].map((r) => (
                  <line
                    key={r}
                    x1={PAD.l}
                    x2={VBW - PAD.r}
                    y1={PAD.t + PH * r}
                    y2={PAD.t + PH * r}
                    stroke="rgba(0,0,0,0.06)"
                    strokeDasharray="3 4"
                  />
                ))}

                {/* 面积 */}
                <path d={areaPath} fill="url(#trendArea)" />
                {/* 折线 */}
                <path d={linePath} fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />

                {/* 数据点 + 金额标签 + 年份
                    中间点用小号实心 navy；最后一个点放大并加金色描边（"当前"高光） */}
                {trendPoints.map((p, i) => {
                  const isLast = i === trendPoints.length - 1;
                  return (
                    <g key={p.year}>
                      {isLast && (
                        <circle cx={p.x} cy={p.y} r={8} fill="rgba(199,159,74,0.18)" />
                      )}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isLast ? 4.5 : 2.6}
                        fill={ACCENT}
                        stroke={isLast ? '#c79f4a' : 'none'}
                        strokeWidth={isLast ? 2 : 0}
                      />
                      <text
                        x={p.x}
                        y={p.y - 11}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight={isLast ? 700 : 500}
                        fill={isLast ? '#a37e2c' : '#475569'}
                        fontFamily="'Geist Mono', ui-monospace, monospace"
                      >
                        ¥{(p.monthly / 1000).toFixed(1)}k
                      </text>
                      <text
                        x={p.x}
                        y={VBH - 8}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight={isLast ? 700 : 400}
                        fill={isLast ? ACCENT : '#94a3b8'}
                      >
                        {p.year}{isLast ? '（当前）' : ''}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </Box>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', borderRadius: 2, border: '1px dashed rgba(0,0,0,0.08)' }}>
              暂无近 5 年趋势数据
            </Box>
          )}
        </Grid>
      </Grid>

      {/* 较高薪资人群特点 */}
      <Box sx={{ mt: 2.5, p: 2, borderRadius: 2, backgroundColor: 'rgba(199,159,74,0.04)', border: '1px solid rgba(199,159,74,0.15)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
          <PeopleIcon sx={{ fontSize: 15, color: '#c79f4a' }} />
          <Typography variant="caption" sx={{ fontWeight: 700, color: '#a37e2c', letterSpacing: 0.3 }}>较高薪资人群特点</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#64748b', lineHeight: 1.7, fontSize: '0.75rem' }}>{highEarnerTraits}</Typography>
      </Box>
    </Box>
  );
}
