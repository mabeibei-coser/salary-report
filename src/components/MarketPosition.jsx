import React from 'react';
import { Box, Typography, Grid, Chip } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import RemoveIcon from '@mui/icons-material/Remove';
import PeopleIcon from '@mui/icons-material/People';
import { formatNumber, getComparisonText, generateSummary } from '../utils/salaryCalculator';

const ACCENT = '#1e3a5f';

export default function MarketPosition({ salaryData, marketComparison, marketRanking }) {
  const { diffPct } = marketComparison;
  const comparison = getComparisonText(diffPct);
  const summary = generateSummary(salaryData.position, salaryData.company, diffPct, salaryData.monthly.p50);

  const diffIcon = diffPct > 5
    ? <ArrowUpwardIcon sx={{ fontSize: 16, color: comparison.color }} />
    : diffPct < -5
      ? <ArrowDownwardIcon sx={{ fontSize: 16, color: comparison.color }} />
      : <RemoveIcon sx={{ fontSize: 16, color: comparison.color }} />;

  const rankingColors = ['#1565c0', '#1976d2', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb'];
  const highEarnerTraits = salaryData.highEarnerTraits || '该岗位较高薪资人群通常具备：丰富行业经验（5年以上）、核心项目主导能力、跨部门协作经验、持续学习与技术迭代能力，部分岗位需具备管理团队或业务拓展能力。';

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
          <Typography variant="caption" sx={{ color: '#64748b', mb: 1.5, display: 'block', fontWeight: 500 }}>该岗位在不同企业性质中的薪酬排名</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {marketRanking.map((item, idx) => {
              const isCurrent = item.company === salaryData.company;
              const barWidth = `${(item.monthly / (marketRanking[0]?.monthly || 1)) * 100}%`;
              const barColor = rankingColors[idx] || '#94a3b8';

              return (
                <Box key={item.company} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.75, borderRadius: 1.5, backgroundColor: isCurrent ? 'rgba(30,58,95,0.04)' : 'transparent', border: isCurrent ? '1px solid rgba(30,58,95,0.1)' : '1px solid transparent' }}>
                  <Typography variant="caption" sx={{ width: 22, fontWeight: 700, color: barColor, fontSize: '0.7rem' }}>#{idx + 1}</Typography>
                  <Typography variant="caption" sx={{ width: 70, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? ACCENT : '#1a1a2e', flexShrink: 0 }}>{item.company}</Typography>
                  <Box sx={{ flex: 1, position: 'relative', height: 20 }}>
                    <Box sx={{ position: 'absolute', top: 0, left: 0, height: '100%', width: barWidth, borderRadius: 1, background: isCurrent ? `linear-gradient(90deg, #42a5f5, #1976d2)` : `linear-gradient(90deg, ${barColor}60, ${barColor})`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', pr: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, color: '#fff', fontSize: '0.65rem' }}>¥{(item.monthly / 1000).toFixed(1)}k</Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Grid>
      </Grid>

      {/* 较高薪资人群特点 */}
      <Box sx={{ mt: 2.5, p: 2, borderRadius: 2, backgroundColor: 'rgba(30,58,95,0.02)', border: '1px solid rgba(0,0,0,0.04)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
          <PeopleIcon sx={{ fontSize: 15, color: ACCENT }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: ACCENT }}>较高薪资人群特点</Typography>
        </Box>
        <Typography variant="caption" sx={{ color: '#64748b', lineHeight: 1.7, fontSize: '0.75rem' }}>{highEarnerTraits}</Typography>
      </Box>
    </Box>
  );
}
