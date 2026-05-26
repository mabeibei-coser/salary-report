import React from 'react';
import { Box, Typography, Chip } from '@mui/material';

const ACCENT = '#1e3a5f';

/**
 * 报告头：岗位 + 职级 chip + 一行小灰字回显查询条件 + 时间
 * 不再用 5 个 chip 并排——只有"职级"是产品识别度高的字段保留 chip，
 * 其他三个（企业性质/学历/城市）降级为一行可读的灰字。
 */
export default function ReportHeader({ salaryData }) {
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const isMgmt = salaryData.rankCategory === 'mgmt';
  const rankColor = isMgmt ? '#a37e2c' : ACCENT;
  const rankBg = isMgmt ? 'rgba(199,159,74,0.10)' : 'rgba(30,58,95,0.06)';

  // 查询条件回显（企业性质/学历/城市）—— 用 · 拼成一行小字
  const conditions = [salaryData.company, salaryData.education, salaryData.city]
    .filter(Boolean)
    .join(' · ');

  return (
    <Box
      className="glass-card"
      sx={{
        p: { xs: 2, md: 2.5 },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'flex-start', md: 'center' },
        gap: { xs: 1.25, md: 2 },
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
          <Typography
            variant="h6"
            component="h2"
            sx={{ fontWeight: 700, color: ACCENT, fontSize: { xs: '1.15rem', md: '1.35rem' }, letterSpacing: -0.2 }}
          >
            {salaryData.position}
          </Typography>
          <Chip
            label={salaryData.rankLabel}
            size="small"
            sx={{
              backgroundColor: rankBg,
              color: rankColor,
              fontWeight: 600,
              borderRadius: 1,
              border: `1px solid ${rankColor}30`,
              fontSize: '0.72rem',
              height: 22,
            }}
          />
        </Box>
        {conditions && (
          <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.78rem' }}>
            {conditions}
          </Typography>
        )}
      </Box>
      <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem' }} className="num-mono">
        生成于 {timeStr}
      </Typography>
    </Box>
  );
}
