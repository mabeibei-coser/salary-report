import React, { useState, useMemo } from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem, Button, Typography, TextField, Grid,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { COMPANIES, RANK_GROUPS, RANKS, EDUCATION_LEVELS, CITIES } from '../data/salaryDatabase';

const ACCENT = '#1e3a5f';

/**
 * 搜索表单：2 行 grid
 *   行 1：岗位名称（主输入，更宽） + 城市
 *   行 2：企业性质 + 职级 + 学历
 *   底部：查询按钮（disabled 时提示"还差 N 项"）+ 试用样例参数
 */
export default function SearchForm({ onSearch, loading = false, sampleParams = null }) {
  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [rank, setRank] = useState('');
  const [education, setEducation] = useState('');
  const [city, setCity] = useState('');

  // 计算还差几项，给按钮提示用
  const missing = useMemo(() => {
    const m = [];
    if (!position.trim()) m.push('岗位名称');
    if (!company) m.push('企业性质');
    if (!rank) m.push('职级');
    if (!education) m.push('学历');
    if (!city) m.push('城市');
    return m;
  }, [position, company, rank, education, city]);

  const isValid = missing.length === 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid && !loading) {
      onSearch({ position: position.trim(), company, rank, education, city });
    }
  };

  const handleUseSample = () => {
    if (!sampleParams) return;
    setPosition(sampleParams.position || '');
    setCompany(sampleParams.company || '');
    setRank(sampleParams.rank || '');
    setEducation(sampleParams.education || '');
    setCity(sampleParams.city || '');
  };

  const menuPaperSx = {
    maxHeight: 480,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
  };

  const buttonHint = loading
    ? '查询中...'
    : isValid
      ? '查询薪酬'
      : `还差 ${missing.length} 项：${missing.slice(0, 2).join(' / ')}${missing.length > 2 ? ` 等` : ''}`;

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      className="glass-card"
      sx={{ p: { xs: 2.5, md: 3 }, mb: 4 }}
    >
      <Grid container spacing={2}>
        {/* 行 1：岗位名称（主输入，60% 宽）+ 城市（40%） */}
        <Grid item xs={12} md={7}>
          <TextField
            label="岗位名称"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            disabled={loading}
            placeholder="如：Java工程师、产品经理、HRBP"
            fullWidth
            inputProps={{ sx: { py: 1.5, fontWeight: 500 } }}
          />
        </Grid>
        <Grid item xs={12} md={5}>
          <FormControl fullWidth disabled={loading}>
            <InputLabel id="city-label">所在城市</InputLabel>
            <Select
              labelId="city-label"
              value={city}
              label="所在城市"
              onChange={(e) => setCity(e.target.value)}
              MenuProps={{ PaperProps: { sx: menuPaperSx } }}
            >
              <MenuItem value="" disabled><em>请选择城市</em></MenuItem>
              {CITIES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* 行 2：企业性质 / 职级 / 学历 三等宽 */}
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth disabled={loading}>
            <InputLabel id="company-label">企业性质</InputLabel>
            <Select
              labelId="company-label"
              value={company}
              label="企业性质"
              onChange={(e) => setCompany(e.target.value)}
              MenuProps={{ PaperProps: { sx: menuPaperSx } }}
            >
              <MenuItem value="" disabled><em>请选择企业性质</em></MenuItem>
              {COMPANIES.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <FormControl fullWidth disabled={loading}>
            <InputLabel id="rank-label">岗位标准职级</InputLabel>
            <Select
              labelId="rank-label"
              value={rank}
              label="岗位标准职级"
              onChange={(e) => setRank(e.target.value)}
              MenuProps={{ PaperProps: { sx: menuPaperSx } }}
              renderValue={(selected) => {
                const info = RANKS.find((r) => r.value === selected);
                return info ? info.label : selected;
              }}
            >
              <MenuItem value="" disabled><em>请选择职级</em></MenuItem>
              <MenuItem disabled sx={{ opacity: '1 !important' }}>
                <Typography variant="caption" sx={{ color: ACCENT, fontWeight: 700, letterSpacing: 0.5 }}>
                  {RANK_GROUPS.tech.label}
                </Typography>
              </MenuItem>
              {RANK_GROUPS.tech.ranks.map((rk) => {
                const info = RANKS.find((r) => r.value === rk);
                return (
                  <MenuItem key={rk} value={rk} sx={{ pl: 3 }}>
                    {info ? info.label : rk}
                  </MenuItem>
                );
              })}
              <MenuItem disabled sx={{ opacity: '1 !important', mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: ACCENT, fontWeight: 700, letterSpacing: 0.5 }}>
                  {RANK_GROUPS.mgmt.label}
                </Typography>
              </MenuItem>
              {RANK_GROUPS.mgmt.ranks.map((rk) => {
                const info = RANKS.find((r) => r.value === rk);
                return (
                  <MenuItem key={rk} value={rk} sx={{ pl: 3 }}>
                    {info ? info.label : rk}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={12} md={4}>
          <FormControl fullWidth disabled={loading}>
            <InputLabel id="edu-label">最高学历</InputLabel>
            <Select
              labelId="edu-label"
              value={education}
              label="最高学历"
              onChange={(e) => setEducation(e.target.value)}
              MenuProps={{ PaperProps: { sx: menuPaperSx } }}
            >
              <MenuItem value="" disabled><em>请选择学历</em></MenuItem>
              {EDUCATION_LEVELS.map((e) => (
                <MenuItem key={e} value={e}>{e}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* 行 3：查询按钮（全宽） + 试用样例参数链接 */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, alignItems: { xs: 'stretch', md: 'center' } }}>
            <Button
              type="submit"
              variant="contained"
              disabled={!isValid || loading}
              startIcon={loading ? null : <SearchIcon />}
              sx={{
                flex: 1,
                py: 1.5,
                fontSize: '0.95rem',
                background: isValid && !loading ? ACCENT : 'rgba(0,0,0,0.04)',
                color: isValid && !loading ? '#fff' : 'rgba(0,0,0,0.4)',
                boxShadow: isValid && !loading ? '0 2px 12px rgba(30,58,95,0.18)' : 'none',
                '&:hover': {
                  background: isValid && !loading ? '#2c5282' : 'rgba(0,0,0,0.04)',
                  boxShadow: isValid && !loading ? '0 4px 16px rgba(30,58,95,0.28)' : 'none',
                },
                '&.Mui-disabled': {
                  color: 'rgba(0,0,0,0.4)',
                  background: 'rgba(0,0,0,0.04)',
                },
              }}
            >
              {buttonHint}
            </Button>
            {sampleParams && (
              <Button
                type="button"
                variant="text"
                size="small"
                onClick={handleUseSample}
                disabled={loading}
                startIcon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                sx={{
                  color: '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  '&:hover': { backgroundColor: 'rgba(199,159,74,0.08)', color: '#a37e2c' },
                }}
              >
                试用样例参数
              </Button>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
