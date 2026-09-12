/**
 * src/lib/facilityTypes.js
 * Visual branding and configuration for healthcare facility types.
 */

export const FACILITY_TYPE_CONFIG = {
  'District Hospital': {
    color: '#D64545',       // Critical red
    bg: '#FEE2E2',
    border: '#B91C1C',
    code: 'DH',
    icon: '🏥',
    label: 'District Hospital',
  },
  'CHC': {
    color: '#2563EB',       // Blue
    bg: '#DBEAFE',
    border: '#1D4ED8',
    code: 'CHC',
    icon: '⚕️',
    label: 'Community Health Centre',
  },
  'PHC': {
    color: '#0F9D8A',       // Teal
    bg: '#CCFBF1',
    border: '#0F766E',
    code: 'PHC',
    icon: '🩺',
    label: 'Primary Health Centre',
  },
  'Sub-Centre': {
    color: '#D97706',       // Amber
    bg: '#FEF3C7',
    border: '#B45309',
    code: 'SC',
    icon: '🏠',
    label: 'Sub-Centre',
  },
  'Diagnostic Centre': {
    color: '#7C3AED',       // Violet
    bg: '#EDE9FE',
    border: '#6D28D9',
    code: 'DX',
    icon: '🔬',
    label: 'Diagnostic Centre',
  },
}

const DEFAULT_CONFIG = {
  color: '#0F9D8A',
  bg: '#E2E8F0',
  border: '#475569',
  code: 'H',
  icon: '🏥',
  label: 'Healthcare Facility',
}

export function getTypeConfig(type) {
  return FACILITY_TYPE_CONFIG[type] || DEFAULT_CONFIG
}
