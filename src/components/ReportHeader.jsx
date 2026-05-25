import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SchoolIcon from '@mui/icons-material/School';
import LocationOnIcon from '@mui/icons-material/LocationOn';

export default function ReportHeader({ salaryData }) {
  const now = new Date();
  const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const rankColor = salaryData.rankCategory === 'mgmt' ? '#1e3a5f' : '#2563eb';
  const rankBg = salaryData.rankCategory === 'mgmt' ? 'rgba(30,58,95,0.08)' : 'rgba(37,99,235,0.06)';

  return (
    <Box className="glass-card" sx={{ p: { xs: 2, md: 2.5 }, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 1.5 }}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 700, color: '#1e3a5f', fontSize: { xs: '1.1rem', md: '1.3rem' } }}>
            {salaryData.position}
          </Typography>
          <Chip label={salaryData.rankLabel} size="small" sx={{ backgroundColor: rankBg, color: rankColor, fontWeight: 500, borderRadius: 1, border: `1px solid ${rankColor}30`, fontSize: '0.75rem' }} />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip label={salaryData.company} size="small" sx={{ backgroundColor: 'rgba(30,58,95,0.06)', color: '#1e3a5f', fontWeight: 600, borderRadius: 1, fontSize: '0.75rem' }} />
          {salaryData.education && (
            <Chip icon={<SchoolIcon sx={{ fontSize: 13 }} />} label={salaryData.education} size="small" sx={{ backgroundColor: 'rgba(37,99,235,0.05)', color: '#64748b', fontWeight: 500, borderRadius: 1, fontSize: '0.75rem' }} />
          )}
          {salaryData.city && (
            <Chip icon={<LocationOnIcon sx={{ fontSize: 13 }} />} label={salaryData.city} size="small" sx={{ backgroundColor: 'rgba(37,99,235,0.05)', color: '#64748b', fontWeight: 500, borderRadius: 1, fontSize: '0.75rem' }} />
          )}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <CalendarTodayIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>数据生成时间：{timeStr}</Typography>
      </Box>
    </Box>
  );
}
