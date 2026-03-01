/**
 * Centauro Brand Assets
 * Paleta de cores, tipografia e logo como Data URI.
 */

import centauroLogoImg from '../assets/logo_centauro.png';
import centauroBgImg from '../assets/centauro_bg.png';
import centauroHeaderImg from '../assets/centauro_header.png';

export const CENTAURO_BRAND = {
  colors: {
    red: '#E30613',
    redDark: '#8B0000',
    redLight: '#F04040',
    green: '#16A34A',
    grayBg: '#F3F4F6',
    grayBorder: '#E5E7EB',
    text: '#111827',
    textMuted: '#6B7280',
  },

  gradients: {
    header: 'linear-gradient(135deg, #8B0000 0%, #E30613 60%, #F04040 100%)',
  },

  fonts: {
    heading: "'Oswald', sans-serif",
    body: "'Roboto', sans-serif",
  },

  logo: centauroLogoImg,
  bgLogo: centauroBgImg,
  headerLogo: centauroHeaderImg,
};

export default CENTAURO_BRAND;
