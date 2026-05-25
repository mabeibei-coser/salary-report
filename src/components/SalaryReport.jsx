import React from 'react';
import { Box } from '@mui/material';
import ReportHeader from './ReportHeader';
import SalaryOverview from './SalaryOverview';
import MarketPosition from './MarketPosition';
import IndustryAnalysis from './IndustryAnalysis';
import CityAnalysis from './CityAnalysis';

/**
 * 薪酬报告主容器
 */
export default function SalaryReport({ report }) {
  const salaryData = report;
  const marketComparison = report.marketComparison;
  const marketRanking = report.marketRanking;
  const industryAnalysis = report.industryAnalysis;
  const cityAnalysis = report.cityAnalysis;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        animation: 'fadeInUp 0.6s ease-out',
        '@keyframes fadeInUp': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
      }}
    >
      <ReportHeader salaryData={salaryData} />
      <SalaryOverview salaryData={salaryData} />
      <MarketPosition
        salaryData={salaryData}
        marketComparison={marketComparison}
        marketRanking={marketRanking}
      />
      <CityAnalysis cityAnalysis={cityAnalysis} />
      <IndustryAnalysis industryAnalysis={industryAnalysis} />
    </Box>
  );
}
