import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const ACCENT = '#1e3a5f';

export default function MarketPosition({ salaryData, salaryTrend }) {
  const highEarnerTraits = salaryData.highEarnerTraits || '该岗位较高薪资人群通常具备：丰富行业经验（5年以上）、核心项目主导能力、跨部门协作经验、持续学习与技术迭代能力，部分岗位需具备管理团队或业务拓展能力。';

  // ── 近 5 年薪酬趋势图（SVG 折线）──
  const trend = Array.isArray(salaryTrend) && salaryTrend.length >= 2 ? salaryTrend : [];
  const VBW = 420;
  const VBH = 200;
  const PAD = { l: 14, r: 14, t: 30, b: 30 };
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

  return (
    <Box className="glass-card" sx={{ p: { xs: 2, md: 2.5 } }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem', color: ACCENT }}>
        <Box component="span" sx={{ width: 3, height: 20, borderRadius: 1.5, backgroundColor: ACCENT, display: 'inline-block' }} />
        市场定位分析
      </Typography>

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={5}>
          <Box sx={{ p: 2.5, borderRadius: 2, backgroundColor: 'rgba(30,58,95,0.02)', border: '1px solid rgba(0,0,0,0.05)', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
              <PeopleIcon sx={{ fontSize: 16, color: ACCENT }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: ACCENT }}>较高薪资人群特点</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.7, fontSize: '0.8rem' }}>{highEarnerTraits}</Typography>
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

                {/* 数据点 + 金额标签 + 年份 */}
                {trendPoints.map((p, i) => {
                  const isLast = i === trendPoints.length - 1;
                  return (
                    <g key={p.year}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isLast ? 5 : 3.2}
                        fill={isLast ? ACCENT : '#fff'}
                        stroke={ACCENT}
                        strokeWidth={isLast ? 2 : 1.8}
                      />
                      <text
                        x={p.x}
                        y={p.y - 9}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight={isLast ? 700 : 500}
                        fill={isLast ? ACCENT : '#475569'}
                      >
                        ¥{(p.monthly / 1000).toFixed(1)}k
                      </text>
                      <text
                        x={p.x}
                        y={VBH - 8}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight={isLast ? 700 : 400}
                        fill={isLast ? ACCENT : '#64748b'}
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
    </Box>
  );
}
