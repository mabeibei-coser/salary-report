import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, CircularProgress, Button, Alert, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchForm from './components/SearchForm';
import SalaryReport from './components/SalaryReport';
import LoginForm from './components/LoginForm';
import { fetchSalaryData, fetchMe, logout } from './services/api';

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
    const startedAt = Date.now();
    const MIN_LOADING_MS_FOR_CACHED = 8000; // 缓存命中时仍保留 8s loading，保证体验一致
    try {
      const { report: data, cached } = await fetchSalaryData(
        params.position,
        params.company,
        params.rank,
        params.education,
        params.city
      );
      // 先取数完成，再决定是否补足最小 loading 时长（仅缓存命中时补足）
      if (cached) {
        const elapsed = Date.now() - startedAt;
        const remain = MIN_LOADING_MS_FOR_CACHED - elapsed;
        if (remain > 0) await new Promise((r) => setTimeout(r, remain));
      }
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

  const dbVersion = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 2, md: 4 }, backgroundColor: '#f4f6f9' }}>
      <Container maxWidth="lg">
        {/* 顶部手机号一行：独占顶部一行，靠右，位于主标题上方 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 0.5,
            mt: { xs: 0.5, md: 1 },
            mb: { xs: 1, md: 1.5 },
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
        <Box sx={{ textAlign: 'center', mb: { xs: 1.5, md: 2 } }}>
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
          <Box sx={{ width: 40, height: 3, backgroundColor: '#2563eb', mx: 'auto', mt: 0.75, mb: 0.75, borderRadius: 2 }} />
          <Typography variant="body2" sx={{ color: '#64748b', fontSize: { xs: '0.75rem', md: '0.875rem' }, letterSpacing: { xs: 1, md: 2 }, whiteSpace: 'nowrap' }}>
            岗位薪资查询  ·  行业城市分析  ·  高薪人群分析
          </Typography>
        </Box>

        <SearchForm onSearch={handleSearch} loading={loading} />

        {loading && (
          <Box className="glass-card" sx={{ textAlign: 'center', py: 8, mt: 4 }}>
            <CircularProgress size={40} sx={{ color: '#1e3a5f', mb: 2 }} />
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1 }}>正在分析薪酬数据...</Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>AI 正在为您生成专业的薪酬分析报告，请稍候</Typography>
          </Box>
        )}

        {error && !loading && (
          <Box className="glass-card" sx={{ textAlign: 'center', py: 6, mt: 4 }}>
            <Alert severity="error" sx={{ mb: 2, mx: 'auto', maxWidth: 500, borderRadius: 2 }}>{error}</Alert>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRetry} sx={{ borderRadius: 2, borderColor: 'rgba(30,58,95,0.3)', color: '#1e3a5f' }}>重新查询</Button>
          </Box>
        )}

        {report && !loading && !error && <SalaryReport report={report} />}

        {!hasSearched && !loading && (
          <Box className="glass-card" sx={{ textAlign: 'center', py: 10, px: 4, mt: 4 }}>
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 1, fontSize: { xs: '1rem', md: '1.25rem' }, whiteSpace: 'nowrap' }}>填写条件，点击查询薪酬</Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>岗位薪资大数据库版本 {dbVersion}</Typography>
          </Box>
        )}
      </Container>

      <Box component="footer" sx={{ textAlign: 'center', py: 3, mt: 6, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <Typography variant="caption" sx={{ color: '#94a3b8', fontStyle: 'italic', display: 'block', mb: 0.5 }}>
          岗位薪资大数据库版本 {dbVersion}
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>2026岗位薪资查询平台  ·  数据由谨世智能大数据实验室提供  ·  仅供参考</Typography>
      </Box>
    </Box>
  );
}
