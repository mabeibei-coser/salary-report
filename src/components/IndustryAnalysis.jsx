import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';

const ACCENT = '#1e3a5f';
const GOLD = '#c79f4a';

/** 将范围字符串转为 k 单位。兼容 "8000-11000"、"8k-11k"、"8,000-11,000"、"20k-35k" 等格式 */
function toKUnit(rangeStr) {
  if (!rangeStr || rangeStr === '--') return '--';
  return rangeStr
    .replace(/万/g, '0000')
    .replace(/w/gi, '0000')
    .replace(/k/gi, '000')
    .replace(/,/g, '')
    .replace(/(\d+)/g, (m) => {
      const num = parseInt(m, 10);
      if (isNaN(num) || num <= 0) return '--';
      return `${Math.round(num / 1000)}k`;
    });
}

export default function IndustryAnalysis({ industryAnalysis }) {
  if (!industryAnalysis || industryAnalysis.length === 0) return null;

  return (
    <Box className="glass-card" sx={{ p: { xs: 2, md: 2.5 } }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem', color: ACCENT }}>
        <Box component="span" sx={{ width: 3, height: 20, borderRadius: 1.5, backgroundColor: ACCENT, display: 'inline-block' }} />
        细分行业分析
      </Typography>

      <Grid container spacing={1.5}>
        {industryAnalysis.map((item) => {
          const salaryNum = parseFloat(item.salaryIncrease) || 0;

          return (
            <Grid item xs={12} sm={6} md={4} key={item.industry}>
              <Box sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)', backgroundColor: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* 行业名称 + 需求等级 */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a2e' }}>{item.industry}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, px: 1, py: 0.25, borderRadius: 1, backgroundColor: item.demandLevel === '高' ? 'rgba(199,159,74,0.10)' : 'rgba(148,163,184,0.08)' }}>
                    {item.demandLevel === '高' ? <TrendingUpIcon sx={{ fontSize: 13, color: GOLD }} /> : <TrendingFlatIcon sx={{ fontSize: 13, color: '#94a3b8' }} />}
                    <Typography variant="caption" sx={{ color: item.demandLevel === '高' ? GOLD : '#94a3b8', fontWeight: 600 }}>
                      需求{item.demandLevel}
                    </Typography>
                  </Box>
                </Box>

                {/* 描述 */}
                <Typography variant="caption" sx={{ color: '#64748b', mb: 1.5, lineHeight: 1.5, fontSize: '0.7rem' }}>{item.description}</Typography>

                {/* 薪酬范围 */}
                <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>月薪</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: ACCENT, fontFamily: 'monospace', display: 'block', fontSize: '0.75rem' }}>{toKUnit(item.monthlyRange)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>年薪</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#1b5e20', fontFamily: 'monospace', display: 'block', fontSize: '0.75rem' }}>{toKUnit(item.annualRange)}</Typography>
                  </Box>
                </Box>

                {/* 涨薪幅度 */}
                <Box sx={{ mt: 'auto' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>上一年度涨薪幅度</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: salaryNum >= 4 ? GOLD : '#94a3b8', fontSize: '0.75rem' }}>{item.salaryIncrease}</Typography>
                  </Box>
                  <Box sx={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${Math.min(salaryNum * 18, 100)}%`, borderRadius: 2, backgroundColor: salaryNum >= 4 ? GOLD : ACCENT }} />
                  </Box>
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
