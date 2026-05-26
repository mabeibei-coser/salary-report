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

const ACCENT = '#1e3a5f';
const GOLD = '#c79f4a';

/**
 * 大卡片：用于"月薪 / 年薪"等核心信息
 * 数字字号大、左边图标、左侧 navy 实色 strip 强调
 */
function PrimaryCard({ icon, title, value, range, badge }) {
  return (
    <Box
      className="glass-card"
      sx={{
        p: { xs: 2, md: 2.5 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        pl: { xs: 2.5, md: 3 },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 12,
          bottom: 12,
          left: 0,
          width: 3,
          borderRadius: 2,
          background: ACCENT,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
        <Box sx={{ color: '#64748b' }}>{icon}</Box>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: 0.5 }}>
          {title}
        </Typography>
        {badge && (
          <Typography
            variant="caption"
            sx={{ ml: 'auto', fontSize: '0.625rem', color: '#94a3b8', fontWeight: 500, letterSpacing: 0.5 }}
          >
            {badge}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.75 }}>
        <Typography
          component="span"
          sx={{ color: '#94a3b8', fontSize: '1.1rem', fontWeight: 400 }}
        >
          ¥
        </Typography>
        <Typography
          component="div"
          className="num-mono"
          sx={{
            fontWeight: 700,
            color: ACCENT,
            fontSize: { xs: '1.65rem', md: '1.85rem' },
            lineHeight: 1.1,
            letterSpacing: -0.5,
          }}
        >
          {value}
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: '#94a3b8', mt: 'auto', fontSize: '0.72rem' }} className="num-mono">
        {range}
      </Typography>
    </Box>
  );
}

/**
 * 小卡片：用于"时薪 / 股权"等辅助信息
 * 数字小一号，没有 strip，密度更高
 */
function SecondaryCard({ icon, title, value, range, muted }) {
  return (
    <Box
      className="glass-card"
      sx={{
        p: { xs: 1.75, md: 2 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: muted ? 'rgba(0,0,0,0.015)' : '#ffffff',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
        <Box sx={{ color: '#94a3b8' }}>{icon}</Box>
        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, letterSpacing: 0.5 }}>
          {title}
        </Typography>
      </Box>
      <Typography
        component="div"
        className={muted ? undefined : 'num-mono'}
        sx={{
          fontWeight: muted ? 500 : 700,
          color: muted ? '#94a3b8' : ACCENT,
          fontSize: { xs: '1.05rem', md: '1.15rem' },
          mb: 0.5,
          lineHeight: 1.2,
        }}
      >
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: '#94a3b8', mt: 'auto', fontSize: '0.7rem' }} className={muted ? undefined : 'num-mono'}>
        {range}
      </Typography>
    </Box>
  );
}

export default function SalaryOverview({ salaryData }) {
  const { monthly, annual, hourlyRate } = salaryData;
  const senior = isSeniorRank(salaryData.rank);
  const hasEquity = senior && salaryData.equity.p50 > 0;

  return (
    <Grid container spacing={2}>
      {/* 第一排：月薪 / 年薪（核心信息，大卡） */}
      <Grid item xs={12} md={6}>
        <PrimaryCard
          icon={<PaymentsIcon sx={{ fontSize: 18 }} />}
          title="月薪范围"
          value={formatSalary(monthly.p50)}
          range={`P25 ${formatSalary(monthly.p25)}  ·  P75 ${formatSalary(monthly.p75)}`}
          badge="中位值"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <PrimaryCard
          icon={<TrendingUpIcon sx={{ fontSize: 18 }} />}
          title="年薪总包"
          value={formatSalary(annual.p50)}
          range={`P25 ${formatSalary(annual.p25)}  ·  P75 ${formatSalary(annual.p75)}`}
          badge="中位值"
        />
      </Grid>

      {/* 第二排：时薪 / 股权（辅助信息，小卡） */}
      <Grid item xs={12} sm={6} md={6}>
        <SecondaryCard
          icon={<AccessTimeIcon sx={{ fontSize: 16 }} />}
          title="时薪估算"
          value={`¥${hourlyRate.p50.toFixed(0)} / 小时`}
          range={`${hourlyRate.p25.toFixed(0)} – ${hourlyRate.p75.toFixed(0)} 元/小时`}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        {hasEquity ? (
          <SecondaryCard
            icon={<AccountBalanceIcon sx={{ fontSize: 16, color: GOLD }} />}
            title="年股权 / 期权价值"
            value={`¥${formatSalary(salaryData.equity.p50)}`}
            range={`${formatSalary(salaryData.equity.p25)} – ${formatSalary(salaryData.equity.p75)}（若有）`}
          />
        ) : (
          <SecondaryCard
            icon={<AccountBalanceIcon sx={{ fontSize: 16 }} />}
            title="年股权 / 期权"
            value="不适用"
            range={senior ? '该企业性质通常不提供股权' : '该职级通常不享有股权激励'}
            muted
          />
        )}
      </Grid>
    </Grid>
  );
}
