import React, { useEffect, useState } from 'react';
import { Box, Container, Typography, CircularProgress, Button, IconButton, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchForm from './components/SearchForm';
import SalaryReport from './components/SalaryReport';
import { fetchSalaryData, fetchMe, fetchVipStatus, fetchHistoryReport } from './services/api';

const CENTER_URL = import.meta.env.VITE_CENTER_URL || 'http://localhost:4004/';

export default function App() {
  const [me, setMe] = useState(null);
  const [meReady, setMeReady] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [queryParams, setQueryParams] = useState({ position: '', company: '', rank: '', education: '', city: '' });
  const [countdown, setCountdown] = useState(45);
  // 历史报告深链模式：?historyId=xxx 进来时跳过搜索表单，直接渲染当时入库的报告
  const [historyMode, setHistoryMode] = useState(false);
  const [historyCreatedAt, setHistoryCreatedAt] = useState(null);

  // loading 期间倒计时 45s → 0s，loading 结束自动复位
  useEffect(() => {
    if (!loading) {
      setCountdown(45);
      return;
    }
    setCountdown(45);
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [loading]);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((data) => {
        if (cancelled) return;
        setMe(data);
        if (!data) return;
        fetchVipStatus().then((v) => { if (!cancelled) setIsVip(v.isVip); });
        // 历史报告深链：?historyId=xxx 跳过表单直接渲染历史报告
        const historyId = new URLSearchParams(window.location.search).get('historyId');
        if (!historyId) return;
        setHistoryMode(true);
        fetchHistoryReport(historyId)
          .then((detail) => {
            if (cancelled) return;
            setReport(detail.report);
            setQueryParams({
              position: detail.position, company: detail.company, rank: detail.rank,
              education: detail.education, city: detail.city,
            });
            setHistoryCreatedAt(detail.createdAt);
            setHasSearched(true);
          })
          .catch((err) => {
            if (cancelled) return;
            setError(err.status === 404 ? '历史报告不存在或无权访问' : (err.message || '加载历史报告失败'));
          });
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

  const handleBackHome = () => {
    window.location.href = CENTER_URL;
  };

  if (!meReady) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f6f9' }}>
        <CircularProgress size={32} sx={{ color: '#1e3a5f' }} />
      </Box>
    );
  }

  if (!me) {
    const loginUrl = `${CENTER_URL}?from=${encodeURIComponent(window.location.pathname)}`;
    return (
      <Box sx={{ minHeight: '100vh', py: { xs: 6, md: 10 }, backgroundColor: '#f4f6f9' }}>
        <Container maxWidth="sm">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, fontSize: { xs: '1.5rem', md: '2rem' }, color: '#1e3a5f', letterSpacing: 1, mb: 0.5 }}>
              2026岗位薪资查询平台
            </Typography>
            <Box sx={{ width: 40, height: 3, backgroundColor: '#2563eb', mx: 'auto', mt: 1.5, mb: 1.5, borderRadius: 2 }} />
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              请先在薪酬会员中心登录
            </Typography>
            <Button
              variant="contained"
              href={loginUrl}
              disableElevation
              sx={{
                px: 4, py: 1.25,
                fontSize: '0.95rem', fontWeight: 600,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
                textTransform: 'none',
              }}
            >
              前往登录
            </Button>
          </Box>
        </Container>
      </Box>
    );
  }

  const dbVersion = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  return (
    <Box sx={{ minHeight: '100vh', pt: { xs: 3, md: 5 }, pb: { xs: 2, md: 4 }, backgroundColor: '#f4f6f9' }}>
      <Container maxWidth="lg">
        {/* 顶部工具栏：左侧返回箭头 + 右侧数据库版本标签 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mt: { xs: 0.5, md: 1 },
            mb: { xs: 1, md: 1.5 },
          }}
        >
          <IconButton
            size="small"
            onClick={handleBackHome}
            aria-label="返回首页"
            sx={{
              color: '#64748b',
              p: 0.5,
              '&:hover': { backgroundColor: 'rgba(30,58,95,0.06)', color: '#1e3a5f' },
            }}
          >
            <ArrowBackIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.7,
              px: 1.1,
              py: 0.4,
              borderRadius: 999,
              background: '#ecfdf5',
              border: '1px solid rgba(15,118,110,0.20)',
              color: '#065f46',
              fontSize: { xs: '0.65rem', md: '0.72rem' },
              fontWeight: 600,
              lineHeight: 1.2,
              letterSpacing: '0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            <Box
              component="span"
              aria-hidden
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#10b981',
                flexShrink: 0,
                boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.18)',
              }}
            />
            大数据库版本 {dbVersion}
          </Box>
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

        {historyMode ? (
          <Box
            className="glass-card"
            sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 1.5, px: { xs: 2, md: 2.5 }, py: { xs: 1.25, md: 1.5 }, mb: 2,
              border: '1px solid rgba(30,58,95,0.10)',
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: { xs: '0.85rem', md: '0.95rem' }, fontWeight: 600, color: '#1e3a5f', lineHeight: 1.35 }}>
                历史报告 · {queryParams.position || '—'} · {queryParams.company || '—'}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#64748b', mt: 0.4 }}>
                {queryParams.city} · {queryParams.rank} · {queryParams.education}
                {historyCreatedAt ? ` · 查询于 ${new Date(historyCreatedAt).toLocaleString('zh-CN', { hour12: false })}` : ''}
              </Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={handleBackHome}
              sx={{ flexShrink: 0, borderRadius: 2, textTransform: 'none', borderColor: 'rgba(30,58,95,0.3)', color: '#1e3a5f', fontSize: '0.78rem' }}
            >
              新查询
            </Button>
          </Box>
        ) : (
          <SearchForm onSearch={handleSearch} loading={loading} />
        )}

        {loading && (
          <Box className="glass-card" sx={{ textAlign: 'center', py: 8, mt: 4 }}>
            <CircularProgress size={40} sx={{ color: '#1e3a5f', mb: 2 }} />
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1 }}>正在分析薪酬数据...</Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>AI 正在为您生成专业的薪酬分析报告，请稍候</Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', mt: 2, fontVariantNumeric: 'tabular-nums' }}>
              {countdown > 0 ? `预计 45 秒完成 · 还剩 ${countdown} 秒` : '预计 45 秒完成 · 仍在生成…'}
            </Typography>
          </Box>
        )}

        {error && !loading && (
          <Box className="glass-card" sx={{ textAlign: 'center', py: 6, mt: 4 }}>
            <Alert severity="error" sx={{ mb: 2, mx: 'auto', maxWidth: 500, borderRadius: 2 }}>{error}</Alert>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRetry} sx={{ borderRadius: 2, borderColor: 'rgba(30,58,95,0.3)', color: '#1e3a5f' }}>重新查询</Button>
          </Box>
        )}

        {report && !loading && !error && <SalaryReport report={report} isVip={isVip} />}

        {!hasSearched && !loading && !historyMode && (
          <Box className="glass-card" sx={{ textAlign: 'center', py: 10, px: 4, mt: 4 }}>
            <Typography variant="h6" sx={{ color: 'text.secondary', fontSize: { xs: '1rem', md: '1.25rem' }, whiteSpace: 'nowrap' }}>填写条件，点击查询薪酬</Typography>
          </Box>
        )}

        {historyMode && !report && !error && (
          <Box className="glass-card" sx={{ textAlign: 'center', py: 6, mt: 2 }}>
            <CircularProgress size={28} sx={{ color: '#1e3a5f' }} />
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>正在加载历史报告…</Typography>
          </Box>
        )}
      </Container>

      <Box component="footer" sx={{ textAlign: 'center', py: 3, mt: 6, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>2026岗位薪资查询平台  ·  数据由谨世智能大数据实验室提供  ·  仅供参考</Typography>
      </Box>
    </Box>
  );
}
