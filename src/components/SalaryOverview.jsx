import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { formatSalary } from '../utils/salaryCalculator';

// 判断是否为高级岗位（P6及以上 或 M3及以上）
function isSeniorRank(rank) {
  if (!rank) return false;
  const num = parseInt(rank.replace(/[^0-9]/g, '')) || 0;
  if (rank.startsWith('P')) return num >= 6;
  if (rank.startsWith('M')) return num >= 3;
  return false;
}

export default function SalaryOverview({ salaryData }) {
  const { monthly, annual, hourlyRate } = salaryData;
  const senior = isSeniorRank(salaryData.rank);
  const hasEquity = senior && salaryData.equity.p50 > 0;

  const accent = '#1e3a5f';

  const overviewCards = [
    {
      icon: <PaymentsIcon sx={{ fontSize: 24 }} />,
      title: '月薪范围',
      value: `¥ ${formatSalary(monthly.p50)}`,
      subtitle: `范围: ${formatSalary(monthly.p25)} - ${formatSalary(monthly.p75)}`,
      label: '中位值',
    },
    {
      icon: <TrendingUpIcon sx={{ fontSize: 24 }} />,
      title: '年薪总包',
      value: `¥ ${formatSalary(annual.p50)}`,
      subtitle: `范围: ${formatSalary(annual.p25)} - ${formatSalary(annual.p75)}`,
      label: '中位值',
    },
    {
      icon: <AccessTimeIcon sx={{ fontSize: 24 }} />,
      title: '时薪估算',
      value: `¥ ${hourlyRate.p50.toFixed(0)} / 小时`,
      subtitle: `范围: ${hourlyRate.p25.toFixed(0)} - ${hourlyRate.p75.toFixed(0)} 元/小时`,
      label: '中位值',
    },
    {
      icon: <AccountBalanceIcon sx={{ fontSize: 24 }} />,
      title: '年股权/期权价值',
      value: hasEquity ? `¥ ${formatSalary(salaryData.equity.p50)}` : '不适用',
      subtitle: hasEquity
        ? `${formatSalary(salaryData.equity.p25)} - ${formatSalary(salaryData.equity.p75)}（若有）`
        : senior ? '该企业性质通常不提供股权' : '该职级通常不享有股权激励',
    },
  ];

  return (
    <Grid container spacing={2}>
      {overviewCards.map((card, idx) => (
        <Grid item xs={12} sm={6} md={3} key={idx}>
          <Box
            className="glass-card"
            sx={{
              p: 2,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: accent,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
              <Box sx={{ color: '#475569' }}>{card.icon}</Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                {card.title}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.25 }}>
              <Typography variant="h6" component="div" sx={{ fontWeight: 700, color: accent, fontSize: { xs: '1.1rem', md: '1.15rem' } }}>
                {card.value}
              </Typography>
              {card.label && (
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                  {card.label}
                </Typography>
              )}
            </Box>
            <Typography variant="caption" sx={{ color: '#94a3b8', mt: 'auto' }}>
              {card.subtitle}
            </Typography>
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
