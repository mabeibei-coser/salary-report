import React from 'react';
import { Box } from '@mui/material';
import HeaderSection from './salary/HeaderSection';
import OverviewSection from './salary/OverviewSection';
import MarketSection from './salary/MarketSection';
import CitySection from './salary/CitySection';
import IndustrySection from './salary/IndustrySection';

/**
 * 薪酬报告主容器
 * 5 个 section 的样式完全复刻 admin-hub/components/report/salary/*
 */
const TOTAL = 5;

export default function SalaryReport({ report }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
        animation: 'fadeInUp 0.6s ease-out',
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <HeaderSection data={report} index={1} total={TOTAL} />
      <OverviewSection data={report} index={2} total={TOTAL} />
      <MarketSection data={report} index={3} total={TOTAL} />
      <CitySection data={report.cityAnalysis} index={4} total={TOTAL} />
      <IndustrySection data={report.industryAnalysis} index={5} total={TOTAL} />
    </Box>
  );
}
