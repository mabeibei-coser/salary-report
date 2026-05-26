import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, CircularProgress, Button, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchForm from './components/SearchForm';
import SalaryReport from './components/SalaryReport';
import LoginForm from './components/LoginForm';
import ReportSkeleton from './components/ReportSkeleton';
import { fetchSalaryData, fetchMe, logout } from './services/api';

// 空状态示例参数：用户点"试用样例参数"一键填入
const SAMPLE_PARAMS = {
  position: '后端工程师',
  company: '民营企业',
  rank: 'P5',
  education: '本科',
  city: '一线城市',
};

export default function App() {
  const [me, setMe] = useState(null);
  const [meReady, setMeReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [queryParams, setQueryParams] = useState({ position: '', company: '', rank: '', education: '', city: '' });

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      })
      .finally(() => {
        if (!cancelled) setMeReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = async (params) => {
    setQueryParams(params);
    setHasSearched(true);
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const data = await fetchSalaryData(params.position, params.company, params.rank, params.education, params.city);
      setReport(data);
    } catch (err) {
      if (err.status === 401) {
        setMe(null);
        setError('登录已失效，请重新登录');
      } else {
        setError(err.message || '查询失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (queryParams.position) handleSearch(queryParams);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    }
    setMe(null);
    setReport(null);
    setHasSearched(false);
    setError(null);
  };

  if (!meReady) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f9' }}>
        <CircularProgress size={32} sx={{ color: '#1e3a5f' }} />
      </Box>
    );
  }

  if (!me) {
    return (
      <Box sx={{ minHeight: '100vh', py: { xs: 6, md: 10 }, backgroundColor: '#f4f6f9' }}>
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', md: '2rem' }, color: '#1e3a5f', letterSpacing: 1, mb: 0.5 }}>
              2026岗位薪资查询平台
            </Typography>
            <Box sx={{ width: 40, height: 3, backgroundColor: '#2563eb', mx: 'auto', mt: 1.5, mb: 1.5, borderRadius: 2 }} />
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              请先登录以使用查询功能
            </Typography>
          </Box>
          <LoginForm onLoggedIn={(data) => setMe(data)} />
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 2, md: 4 }, backgroundColor: '#f4f6f9' }}>
      <Container maxWidth="lg">
        {/* 标题 + 当前账号
            移动端：手机号独占顶部一行靠右，标题独占下面一行居中（避免被挤偏）
            桌面端：左右横排 */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'flex-start' },
            mb: { xs: 3, md: 4 },
            mt: { md: 2 },
            gap: { xs: 0.5, md: 2 },
          }}
        >
          {/* 手机号 + 退出按钮 */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: '#64748b',
              fontSize: '0.85rem',
              order: { xs: -1, md: 1 },
              alignSelf: { xs: 'flex-end', md: 'auto' },
              mt: { md: 1 },
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
              {me.phone}
            </Typography>
            <Tooltip title="退出登录">
              <IconButton size="small" onClick={handleLogout} sx={{ color: '#94a3b8', p: 0.5 }}>
                <LogoutIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* 标题区 */}
          <Box sx={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'flex-start', gap: 1 }}>
              <Typography
                variant="h3"
                component="h1"
                sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', md: '2rem' }, color: '#1e3a5f', letterSpacing: 1 }}
              >
                2026岗位薪资查询平台
              </Typography>
              <Box
                component="span"
                sx={{ backgroundColor: '#1e3a5f', color: '#fff', fontSize: { xs: '0.625rem', md: '0.7rem' }, fontWeight: 600, px: 0.9, py: 0.3, borderRadius: '6px', lineHeight: 1.2, whiteSpace: 'nowrap', mt: { xs: 0.3, md: 0.5 }, letterSpacing: 0.5 }}
              >
                专业版
              </Box>
            </Box>
            <Box sx={{ width: 40, height: 3, backgroundColor: '#2563eb', mx: 'auto', mt: 1.5, mb: 1.5, borderRadius: 2 }} />
            <Typography variant="body2" sx={{ color: '#64748b', fontSize: { xs: '0.75rem', md: '0.875rem' }, letterSpacing: { xs: 1, md: 2 }, whiteSpace: 'nowrap' }}>
              岗位薪资查询  ·  行业城市分析  ·  高薪人群分析
            </Typography>
          </Box>
        </Box>

        <SearchForm
          onSearch={handleSearch}
          loading={loading}
          sampleParams={!hasSearched ? SAMPLE_PARAMS : null}
        />

        {loading && (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25, mb: 2, color: '#64748b' }}>
              <CircularProgress size={16} thickness={5} sx={{ color: '#1e3a5f' }} />
              <Typography variant="body2" sx={{ color: '#475569', fontWeight: 500 }}>
                正在分析薪酬数据，约需 5-10 秒…
              </Typography>
            </Box>
            <ReportSkeleton />
          </Box>
        )}

        {error && !loading && (
          <Box
            sx={{
              mt: 4,
              p: { xs: 2.5, md: 3 },
              borderRadius: 2,
              border: '1px solid rgba(198,40,40,0.15)',
              backgroundColor: 'rgba(198,40,40,0.03)',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#c62828', mb: 0.5 }}>
                查询未能完成
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                {error}。可能是岗位名称偏冷门或网络抖动，可重试一次。
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
              sx={{ borderRadius: 1.5, borderColor: 'rgba(30,58,95,0.3)', color: '#1e3a5f', whiteSpace: 'nowrap' }}
            >
              重新查询
            </Button>
          </Box>
        )}

        {report && !loading && !error && <SalaryReport report={report} />}

        {!hasSearched && !loading && (
          <Box
            sx={{
              mt: 4,
              py: { xs: 5, md: 7 },
              px: 3,
              textAlign: 'center',
              borderRadius: 3,
              border: '1px dashed rgba(30,58,95,0.18)',
              backgroundColor: 'rgba(30,58,95,0.015)',
            }}
          >
            <Typography variant="body1" sx={{ color: '#475569', fontWeight: 500, mb: 0.75 }}>
              填写上方条件后，点击「查询薪酬」开始分析
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 2 }}>
              报告将包含：月薪/年薪/时薪分位 · 市场定位 · 城市与行业对比 · 高薪人群特征
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>
              第一次使用？点上方
              <Box component="span" sx={{ color: '#a37e2c', fontWeight: 600, mx: 0.5 }}>
                试用样例参数
              </Box>
              一键填表
            </Typography>
          </Box>
        )}
      </Container>

      <Box component="footer" sx={{ textAlign: 'center', py: 3, mt: 6, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic', display: 'block', mb: 0.5 }}>
          本数据由谨世智能大数据库综合分析生成，最新更新于 {(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; })()}
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>2026岗位薪资查询平台  ·  数据由谨世智能大数据实验室提供  ·  仅供参考</Typography>
      </Box>
    </Box>
  );
}
