import React, { useState } from 'react';
import {
  Box, FormControl, InputLabel, Select, MenuItem, Button, Typography, TextField,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { COMPANIES, RANK_GROUPS, RANKS, EDUCATION_LEVELS, CITIES } from '../data/salaryDatabase';

/**
 * 搜索表单组件
 * 岗位名称(手动) + 企业性质 + 职级 + 学历 + 城市 + 查询按钮
 */
export default function SearchForm({ onSearch, loading = false }) {
  const [position, setPosition] = useState('');
  const [company, setCompany] = useState('');
  const [rank, setRank] = useState('');
  const [education, setEducation] = useState('');
  const [city, setCity] = useState('');

  const isValid = position.trim() && company && rank && education && city;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid && !loading) {
      onSearch({
        position: position.trim(),
        company,
        rank,
        education,
        city,
      });
    }
  };

  const menuPaperSx = {
    maxHeight: 480,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      className="glass-card"
      sx={{
        p: { xs: 2.5, md: 3 },
        mb: 4,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        alignItems: { xs: 'stretch', md: 'flex-end' },
        flexWrap: 'wrap',
      }}
    >
      {/* 岗位名称 - 手动输入 */}
      <FormControl size="medium" sx={{ flex: { xs: '1 1 100%', md: 2.5 }, minWidth: 0 }}>
        <TextField
          label="岗位名称"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          disabled={loading}
          placeholder="如：Java工程师、产品经理"
          fullWidth
          inputProps={{ sx: { py: 1.5 } }}
        />
      </FormControl>

      {/* 企业性质 */}
      <FormControl size="medium" sx={{ flex: { xs: '1 1 auto', md: 2 }, minWidth: 0 }} disabled={loading}>
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

      {/* 职级 */}
      <FormControl size="medium" sx={{ flex: { xs: '1 1 auto', md: 2.5 }, minWidth: 0 }} disabled={loading}>
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

          {/* 技术序列 */}
          <MenuItem disabled sx={{ opacity: '1 !important' }}>
            <Typography variant="caption" sx={{ color: '#1565c0', fontWeight: 600 }}>
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

          {/* 管理序列 */}
          <MenuItem disabled sx={{ opacity: '1 !important', mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#7c4dff', fontWeight: 600 }}>
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

      {/* 最高学历 */}
      <FormControl size="medium" sx={{ flex: { xs: '1 1 auto', md: 1.5 }, minWidth: 0 }} disabled={loading}>
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

      {/* 城市 */}
      <FormControl size="medium" sx={{ flex: { xs: '1 1 auto', md: 1.5 }, minWidth: 0 }} disabled={loading}>
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

      {/* 查询按钮 */}
      <Button
        type="submit"
        variant="contained"
        disabled={!isValid || loading}
        startIcon={loading ? null : <SearchIcon />}
        sx={{
          flex: { xs: '1 1 100%', md: '0 0 auto' },
          minWidth: { xs: '100%', md: 140 },
          py: 1.5,
          background: isValid && !loading
            ? '#1e3a5f'
            : 'rgba(0,0,0,0.04)',
          color: isValid && !loading ? '#fff' : 'rgba(0,0,0,0.26)',
          '&:hover': {
            background: isValid && !loading
              ? '#2c5282'
              : 'rgba(0,0,0,0.04)',
            boxShadow: isValid && !loading ? '0 2px 12px rgba(30,58,95,0.3)' : 'none',
          },
          '&.Mui-disabled': {
            color: 'rgba(0,0,0,0.26)',
            background: 'rgba(0,0,0,0.04)',
          },
        }}
      >
        {loading ? '查询中...' : '查询薪酬'}
      </Button>
    </Box>
  );
}
