import React from 'react';
import { Box, Grid, Skeleton } from '@mui/material';

/**
 * 报告骨架屏：按 SalaryReport 的实际布局画灰色占位
 * 比转圈 spinner 让用户更早看到"报告大概长这样"，降低等待焦虑
 */
export default function ReportSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 0 }}>
      {/* ReportHeader：标题 + chips + 时间 */}
      <Box className="glass-card" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1.25 }}>
              <Skeleton variant="text" width={140} height={28} />
              <Skeleton variant="rounded" width={80} height={22} />
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              <Skeleton variant="rounded" width={70} height={22} />
              <Skeleton variant="rounded" width={70} height={22} />
              <Skeleton variant="rounded" width={70} height={22} />
            </Box>
          </Box>
          <Skeleton variant="text" width={160} height={18} />
        </Box>
      </Box>

      {/* SalaryOverview：2+2 卡 */}
      <Grid container spacing={2}>
        {[0, 1].map((i) => (
          <Grid item xs={12} md={6} key={`p-${i}`}>
            <Box className="glass-card" sx={{ p: { xs: 2, md: 2.5 }, pl: { xs: 2.5, md: 3 }, position: 'relative' }}>
              <Box sx={{ position: 'absolute', top: 12, bottom: 12, left: 0, width: 3, borderRadius: 2, backgroundColor: 'rgba(30,58,95,0.15)' }} />
              <Skeleton variant="text" width={70} height={16} sx={{ mb: 1.25 }} />
              <Skeleton variant="text" width={160} height={36} sx={{ mb: 0.75 }} />
              <Skeleton variant="text" width={200} height={14} />
            </Box>
          </Grid>
        ))}
        {[0, 1].map((i) => (
          <Grid item xs={12} sm={6} md={6} key={`s-${i}`}>
            <Box className="glass-card" sx={{ p: { xs: 1.75, md: 2 } }}>
              <Skeleton variant="text" width={60} height={14} sx={{ mb: 1 }} />
              <Skeleton variant="text" width={120} height={24} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width={160} height={12} />
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* MarketPosition：左数字 + 右折线 */}
      <Box className="glass-card" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Skeleton variant="text" width={120} height={22} sx={{ mb: 2.5 }} />
        <Grid container spacing={2.5}>
          <Grid item xs={12} md={5}>
            <Box sx={{ p: 2.5, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <Skeleton variant="text" width={140} height={14} sx={{ mx: 'auto' }} />
              <Skeleton variant="text" width={160} height={42} sx={{ mx: 'auto', mt: 0.5 }} />
              <Skeleton variant="text" width={70} height={22} sx={{ mx: 'auto', mt: 0.5 }} />
              <Skeleton variant="rounded" width={120} height={20} sx={{ mx: 'auto', mt: 1 }} />
            </Box>
          </Grid>
          <Grid item xs={12} md={7}>
            <Skeleton variant="text" width={160} height={14} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={180} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
        <Skeleton variant="rounded" height={56} sx={{ mt: 2.5, borderRadius: 2 }} />
      </Box>

      {/* CityAnalysis：3 列 */}
      <Box className="glass-card" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Skeleton variant="text" width={120} height={22} sx={{ mb: 2.5 }} />
        <Grid container spacing={1.5}>
          {[0, 1, 2].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Box sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Skeleton variant="text" width={120} height={18} />
                  <Skeleton variant="text" width={50} height={18} />
                </Box>
                <Skeleton variant="rounded" height={6} sx={{ mb: 1.5, borderRadius: 3 }} />
                <Skeleton variant="text" width="90%" height={14} />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* IndustryAnalysis：3 列 */}
      <Box className="glass-card" sx={{ p: { xs: 2, md: 2.5 } }}>
        <Skeleton variant="text" width={120} height={22} sx={{ mb: 2.5 }} />
        <Grid container spacing={1.5}>
          {[0, 1, 2].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Box sx={{ p: 2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.05)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Skeleton variant="text" width={100} height={18} />
                  <Skeleton variant="rounded" width={60} height={20} />
                </Box>
                <Skeleton variant="text" width="95%" height={12} />
                <Skeleton variant="text" width="80%" height={12} sx={{ mb: 1.5 }} />
                <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
                  <Skeleton variant="text" width={50} height={14} />
                  <Skeleton variant="text" width={50} height={14} />
                </Box>
                <Skeleton variant="rounded" height={4} sx={{ borderRadius: 2 }} />
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
