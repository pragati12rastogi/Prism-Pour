import { ColorId } from './types';

export interface LiquidTheme {
  id: ColorId;
  name: string;
  top: string;
  mid: string;
  bottom: string;
  meniscus: string;
  glow: string;
  symbol: string;
}

export const LIQUID_COLORS: Record<ColorId, LiquidTheme> = {
  crimson: {
    id: 'crimson',
    name: 'Ruby',
    top: '#fb7185',
    mid: '#e11d48',
    bottom: '#9f1239',
    meniscus: '#fda4af',
    glow: 'rgba(225, 29, 72, 0.45)',
    symbol: '◆',
  },
  azure: {
    id: 'azure',
    name: 'Cobalt',
    top: '#60a5fa',
    mid: '#2563eb',
    bottom: '#1e40af',
    meniscus: '#93c5fd',
    glow: 'rgba(37, 99, 235, 0.45)',
    symbol: '●',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    top: '#34d399',
    mid: '#059669',
    bottom: '#065f46',
    meniscus: '#6ee7b7',
    glow: 'rgba(5, 150, 105, 0.45)',
    symbol: '▲',
  },
  amber: {
    id: 'amber',
    name: 'Gold',
    top: '#fcd34d',
    mid: '#f59e0b',
    bottom: '#b45309',
    meniscus: '#fde68a',
    glow: 'rgba(245, 158, 11, 0.45)',
    symbol: '★',
  },
  violet: {
    id: 'violet',
    name: 'Amethyst',
    top: '#a78bfa',
    mid: '#7c3aed',
    bottom: '#4c1d95',
    meniscus: '#c4b5fd',
    glow: 'rgba(124, 58, 237, 0.45)',
    symbol: '■',
  },
  tangerine: {
    id: 'tangerine',
    name: 'Tangerine',
    top: '#fb923c',
    mid: '#ea580c',
    bottom: '#9a3412',
    meniscus: '#fdba74',
    glow: 'rgba(234, 88, 12, 0.45)',
    symbol: '✚',
  },
  cyan: {
    id: 'cyan',
    name: 'Lagoon',
    top: '#22d3ee',
    mid: '#0891b2',
    bottom: '#155e75',
    meniscus: '#67e8f9',
    glow: 'rgba(8, 145, 178, 0.45)',
    symbol: '◈',
  },
  magenta: {
    id: 'magenta',
    name: 'Orchid',
    top: '#e879f9',
    mid: '#c026d3',
    bottom: '#701a75',
    meniscus: '#f0abfc',
    glow: 'rgba(192, 38, 211, 0.45)',
    symbol: '⬢',
  },
  lime: {
    id: 'lime',
    name: 'Chartreuse',
    top: '#a3e635',
    mid: '#65a30d',
    bottom: '#3f6212',
    meniscus: '#bef264',
    glow: 'rgba(101, 163, 13, 0.45)',
    symbol: '▼',
  },
  indigo: {
    id: 'indigo',
    name: 'Midnight',
    top: '#818cf8',
    mid: '#4f46e5',
    bottom: '#312e81',
    meniscus: '#a5b4fc',
    glow: 'rgba(79, 70, 229, 0.45)',
    symbol: '✦',
  },
  rose: {
    id: 'rose',
    name: 'Blossom',
    top: '#f472b6',
    mid: '#db2777',
    bottom: '#831843',
    meniscus: '#f9a8d4',
    glow: 'rgba(219, 39, 119, 0.45)',
    symbol: '♥',
  },
  teal: {
    id: 'teal',
    name: 'Jade',
    top: '#2dd4bf',
    mid: '#0d9488',
    bottom: '#115e59',
    meniscus: '#5eead4',
    glow: 'rgba(13, 148, 136, 0.45)',
    symbol: '⬟',
  },
};

export const COLOR_ORDER: ColorId[] = [
  'crimson',
  'azure',
  'emerald',
  'amber',
  'violet',
  'cyan',
  'tangerine',
  'magenta',
  'lime',
  'indigo',
  'rose',
  'teal',
];
