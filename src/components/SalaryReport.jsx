import React from 'react';
import { Box } from '@mui/material';
import OverviewSection from './salary/OverviewSection';
import MarketSection from './salary/MarketSection';
import CitySection from './salary/CitySection';
import IndustrySection from './salary/IndustrySection';
import VipOverlay from './salary/VipOverlay';

const TOTAL = 4;

export default function SalaryReport({ report, isVip }) {
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
      <OverviewSection data={report} index={1} total={TOTAL} />
      <MarketSection data={report} index={2} total={TOTAL} />
      <VipOverlay isVip={isVip}>
        <CitySection data={report.cityAnalysis} index={3} total={TOTAL} />
      </VipOverlay>
      <VipOverlay isVip={isVip}>
        <IndustrySection data={report.industryAnalysis} index={4} total={TOTAL} />
      </VipOverlay>
    </Box>
  );
}
