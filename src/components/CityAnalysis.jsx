import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ACCENT = '#1e3a5f';

export default function CityAnalysis({ cityAnalysis }) {
  if (!cityAnalysis || cityAnalysis.length === 0) return null;

  const maxSalary = Math.max(...cityAnalysis.map((c) => c.monthlyAvg), 1);

  return (
    <Box className="glass-card" sx={{ p: { xs: 2, md: 2.5 } }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5, display: 'flex', alignItems: 'center', gap: 1, fontSize: '1rem', color: ACCENT }}>
        <Box component="span" sx={{ width: 3, height: 20, borderRadius: 1.5, backgroundColor: ACCENT, display: 'inline-block' }} />
        城市薪酬对比
      </Typography>

      <Grid container spacing={1.5}>
        {cityAnalysis.map((item) => {
          const barPct = (item.monthlyAvg / maxSalary) * 100;

          return (
            <Grid item xs={12} sm={6} md={4} key={item.city}>
              <Box sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)', backgroundColor: '#ffffff' }}>
                {/* 城市 + 月薪 */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationCityIcon sx={{ fontSize: 15, color: ACCENT }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1a1a2e' }}>{item.city}</Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', ml: 0.5 }}>生活成本指数{item.costIndex || 100}(以北京=100)</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: ACCENT, fontFamily: 'monospace' }}>
                      ¥{(item.monthlyAvg / 1000).toFixed(1)}k
                    </Typography>
                  </Box>
                </Box>

                {/* 薪酬水平条形图 */}
                <Box sx={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(0,0,0,0.04)', overflow: 'hidden', mb: 1.5 }}>
                  <Box sx={{ height: '100%', width: `${barPct}%`, borderRadius: 3, backgroundColor: ACCENT, transition: 'width 1s ease-out' }} />
                </Box>

                {/* 底部：城市优势 */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.25 }}>
                  <CheckCircleIcon sx={{ fontSize: 11, color: ACCENT, mt: 0.2, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ color: '#64748b', lineHeight: 1.5, fontSize: '0.7rem' }}>{item.advantage}</Typography>
                </Box>
              </Box>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
