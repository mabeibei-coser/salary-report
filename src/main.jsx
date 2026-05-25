import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import App from './App';
import './index.css';

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1e3a5f',
    },
    secondary: {
      main: '#475569',
    },
    background: {
      default: '#f4f6f9',
      paper: '#ffffff',
    },
    text: {
      primary: '#1a1a2e',
      secondary: '#64748b',
    },
  },
  typography: {
    fontFamily: "'Inter', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
          '&:hover': { backgroundColor: '#ffffff' },
          '&.Mui-focused': { backgroundColor: '#ffffff' },
        },
        notchedOutline: { borderColor: 'rgba(0, 0, 0, 0.12)' },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: { paddingTop: 12, paddingBottom: 12 },
        icon: { color: 'rgba(0, 0, 0, 0.4)' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: 'rgba(30,58,95,0.06)' },
          '&.Mui-selected': { backgroundColor: 'rgba(30,58,95,0.08)' },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
          padding: '10px 28px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiTable: {
      styleOverrides: { root: { backgroundColor: 'transparent' } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottomColor: 'rgba(0, 0, 0, 0.06)' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: '0.875rem' },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
