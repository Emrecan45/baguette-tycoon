import * as THREE from 'three';
import { t } from './i18n.js';

const L = '#23233F';
export const ICONS = {
  strength: `<svg viewBox="0 0 64 64"><path d="M7 48L14 19Q15 14 20 13L28 12Q33 12 34 17L35 23Q35 27 30 28L24 27L23 37Q30 29 39 31Q50 32 54 42L58 48Q50 58 34 58H20Q12 57 7 48Z" fill="#F2B675" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M10 47Q22 54 35 52Q46 52 54 46L58 48Q50 58 34 58H20Q12 57 10 47" fill="#D88B4D"/><path d="M24 37Q29 32 35 33M23 27L29 28M18 19L27 18M40 39Q46 39 48 45" fill="none" stroke="${L}" stroke-width="3" stroke-linecap="round"/><path d="M17 30L15 40M29 39Q34 35 39 37" fill="none" stroke="#FFDBA7" stroke-width="3" stroke-linecap="round"/></svg>`,
  cash: `<svg viewBox="0 0 64 64"><g transform="rotate(-12 32 32)"><rect x="4" y="19" width="56" height="32" rx="6" fill="${L}"/><rect x="7" y="16" width="50" height="29" rx="5" fill="#2F9E44"/><rect x="7" y="16" width="50" height="26" rx="5" fill="#69D36B"/><rect x="12" y="20" width="40" height="18" rx="3" fill="none" stroke="#3FA94A" stroke-width="2.6"/><circle cx="32" cy="29" r="6.5" fill="#3FA94A"/><path d="M33.6 25.6c-.6-.5-1.5-.8-2.4-.7-1.5.1-2.4 1-2.3 2.1.1 2.3 4.6 1.6 4.7 3.9.1 1.2-1 2.1-2.5 2.2-1 .1-2-.2-2.7-.8M31.2 23.4v1.5M31.6 33.9v1.4" fill="none" stroke="#E8FFE3" stroke-width="1.8" stroke-linecap="round"/><rect x="10" y="18" width="44" height="4" rx="2" fill="#A8F0A2" opacity=".7"/></g></svg>`,
  star: `<svg viewBox="0 0 64 64"><path d="M32 3l8.6 17.8 19.6 2.6-14.3 13.6 3.6 19.4L32 47l-17.5 9.4 3.6-19.4L3.8 23.4l19.6-2.6z" fill="${L}" stroke="${L}" stroke-width="5" stroke-linejoin="round"/><path d="M32 6.5l7.7 15.9 17.5 2.3-12.8 12.2 3.2 17.4L32 45.9l-15.6 8.4 3.2-17.4L6.8 24.7l17.5-2.3z" fill="#FFB31A"/><path d="M32 6.5l7.7 15.9 17.5 2.3-12.8 12.2L32 30z" fill="#FFD84A"/><path d="M32 6.5L24.3 22.4 6.8 24.7 19.6 36.9 32 30z" fill="#FFE68A"/></svg>`,
  video: `<svg viewBox="0 0 64 64"><rect x="3" y="12" width="44" height="40" rx="10" fill="${L}"/><rect x="6" y="15" width="38" height="34" rx="8" fill="#FF5A4E"/><path d="M43 26l17-10v32L43 38z" fill="${L}"/><path d="M45 28l12-7v22l-12-7z" fill="#FF5A4E"/><path d="M19 23v18l14-9z" fill="#fff"/></svg>`,
  bolt: `<svg viewBox="0 0 64 64"><path d="M37 2L10 38h17l-4 24 29-37H34z" fill="${L}" stroke="${L}" stroke-width="3" stroke-linejoin="round"/><path d="M35 9L16 35h14.5l-3 18 19-25H31.5z" fill="#FFC21A"/><path d="M35 9L16 35h8z" fill="#FFE27A"/></svg>`,
  baguette: `<svg viewBox="0 0 64 64"><g transform="rotate(-34 32 32)"><rect x="2" y="19" width="60" height="26" rx="13" fill="${L}"/><rect x="6" y="22.5" width="52" height="19" rx="9.5" fill="#E8A24E"/><rect x="6" y="33" width="52" height="8.5" rx="4.2" fill="#C47E33"/><g stroke="#FCE3AE" stroke-width="3.6" stroke-linecap="round"><line x1="15" y1="34" x2="21" y2="27"/><line x1="29" y1="34" x2="35" y2="27"/><line x1="43" y1="34" x2="49" y2="27"/></g></g></svg>`,
  croissant: `<svg viewBox="0 0 64 64"><path d="M12.3 54.3 L11.1 52.3 L10.0 50.2 L9.0 48.0 L8.3 45.6 L7.8 43.2 L7.5 40.6 L7.5 38.0 L7.7 35.4 L8.3 32.7 L9.2 30.1 L10.4 27.6 L11.8 25.2 L13.6 22.9 L15.7 20.9 L18.0 19.1 L20.5 17.6 L23.2 16.4 L26.1 15.5 L29.0 14.9 L32.0 14.8 L35.0 14.9 L37.9 15.5 L40.8 16.4 L43.5 17.6 L46.0 19.1 L48.3 20.9 L50.4 22.9 L52.2 25.2 L53.6 27.6 L54.8 30.1 L55.7 32.7 L56.3 35.4 L56.5 38.0 L56.5 40.6 L56.2 43.2 L55.7 45.6 L55.0 48.0 L54.0 50.2 L52.9 52.3 L51.7 54.3 L47.8 52.2 L48.3 50.4 L48.5 48.6 L48.4 46.9 L48.2 45.1 L47.7 43.5 L47.1 41.9 L46.3 40.5 L45.4 39.2 L44.4 38.1 L43.4 37.1 L42.2 36.2 L41.1 35.5 L39.9 34.9 L38.8 34.4 L37.6 34.0 L36.5 33.7 L35.3 33.5 L34.2 33.4 L33.1 33.3 L32.0 33.2 L30.9 33.3 L29.8 33.4 L28.7 33.5 L27.5 33.7 L26.4 34.0 L25.2 34.4 L24.1 34.9 L22.9 35.5 L21.8 36.2 L20.6 37.1 L19.6 38.1 L18.6 39.2 L17.7 40.5 L16.9 41.9 L16.3 43.5 L15.8 45.1 L15.6 46.9 L15.5 48.6 L15.7 50.4 L16.2 52.2Z" fill="${L}" stroke="${L}" stroke-width="6" stroke-linejoin="round"/><path d="M12.3 54.3 L11.1 52.3 L10.0 50.2 L9.0 48.0 L8.3 45.6 L7.8 43.2 L7.5 40.6 L7.5 38.0 L7.7 35.4 L8.3 32.7 L9.2 30.1 L10.4 27.6 L11.8 25.2 L13.6 22.9 L15.7 20.9 L18.0 19.1 L20.5 17.6 L23.2 16.4 L26.1 15.5 L29.0 14.9 L32.0 14.8 L35.0 14.9 L37.9 15.5 L40.8 16.4 L43.5 17.6 L46.0 19.1 L48.3 20.9 L50.4 22.9 L52.2 25.2 L53.6 27.6 L54.8 30.1 L55.7 32.7 L56.3 35.4 L56.5 38.0 L56.5 40.6 L56.2 43.2 L55.7 45.6 L55.0 48.0 L54.0 50.2 L52.9 52.3 L51.7 54.3 L47.8 52.2 L48.3 50.4 L48.5 48.6 L48.4 46.9 L48.2 45.1 L47.7 43.5 L47.1 41.9 L46.3 40.5 L45.4 39.2 L44.4 38.1 L43.4 37.1 L42.2 36.2 L41.1 35.5 L39.9 34.9 L38.8 34.4 L37.6 34.0 L36.5 33.7 L35.3 33.5 L34.2 33.4 L33.1 33.3 L32.0 33.2 L30.9 33.3 L29.8 33.4 L28.7 33.5 L27.5 33.7 L26.4 34.0 L25.2 34.4 L24.1 34.9 L22.9 35.5 L21.8 36.2 L20.6 37.1 L19.6 38.1 L18.6 39.2 L17.7 40.5 L16.9 41.9 L16.3 43.5 L15.8 45.1 L15.6 46.9 L15.5 48.6 L15.7 50.4 L16.2 52.2Z" fill="#E8A24E"/><circle cx="14.3" cy="53.2" r="2.6" fill="#E8A24E"/><circle cx="49.7" cy="53.2" r="2.6" fill="#E8A24E"/><path d="M12.3 54.3 L11.1 52.3 L10.0 50.2 L9.0 48.0 L8.3 45.6 L7.8 43.2 L7.5 40.6 L7.5 38.0 L7.7 35.4 L8.3 32.7 L9.2 30.1 L10.4 27.6 L11.8 25.2 L13.6 22.9 L15.7 20.9 L18.0 19.1 L20.5 17.6 L23.2 16.4 L26.1 15.5 L29.0 14.9 L32.0 14.8 L35.0 14.9 L37.9 15.5 L40.8 16.4 L43.5 17.6 L46.0 19.1 L48.3 20.9 L50.4 22.9 L52.2 25.2 L53.6 27.6 L54.8 30.1 L55.7 32.7 L56.3 35.4 L56.5 38.0 L56.5 40.6 L56.2 43.2 L55.7 45.6 L55.0 48.0 L54.0 50.2 L52.9 52.3 L51.7 54.3 L47.8 52.2 L48.3 50.4 L48.5 48.6 L48.4 46.9 L48.2 45.1 L47.7 43.5 L47.1 41.9 L46.3 40.5 L45.4 39.2 L44.4 38.1 L43.4 37.1 L42.2 36.2 L41.1 35.5 L39.9 34.9 L38.8 34.4 L37.6 34.0 L36.5 33.7 L35.3 33.5 L34.2 33.4 L33.1 33.3 L32.0 33.2 L30.9 33.3 L29.8 33.4 L28.7 33.5 L27.5 33.7 L26.4 34.0 L25.2 34.4 L24.1 34.9 L22.9 35.5 L21.8 36.2 L20.6 37.1 L19.6 38.1 L18.6 39.2 L17.7 40.5 L16.9 41.9 L16.3 43.5 L15.8 45.1 L15.6 46.9 L15.5 48.6 L15.7 50.4 L16.2 52.2Z" fill="#F8CF83" clip-path="inset(0 0 55% 0)" opacity=".55"/><g stroke="#B26A25" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M17.7 38.1 Q12.7 38.7 7.7 40.3 M25.7 32.5 Q20.4 27.7 13.8 24.1 M33.5 31.9 Q32.0 24.0 28.7 16.4 M40.8 34.4 Q43.6 27.7 44.9 20.4 M47.3 41.7 Q51.3 38.7 54.7 34.6"/></g></svg>`,
  painchoc: `<svg viewBox="0 0 64 64"><path d="M8 22Q10 13 23 14L48 13Q58 15 59 26L57 44Q55 53 43 53H18Q6 52 5 42Z" fill="${L}"/><path d="M10 25Q12 17 23 18L47 17Q54 18 55 27L53 43Q51 49 42 49H19Q10 48 9 40Z" fill="#CC7B30"/><path d="M10 31L14 23Q18 17 27 19L32 22L36 19Q47 15 53 23L54 32Q45 28 34 34Q21 28 10 35Z" fill="#F5BB62"/><path d="M31 23L29 34" fill="none" stroke="#D28A38" stroke-width="2.5" stroke-linecap="round"/><g fill="none" stroke="#FFDA91" stroke-width="2" stroke-linecap="round"><path d="M17 23L14 30M23 22L21 29M40 22L38 29M47 21L46 28"/><path d="M12 39Q21 33 28 39M35 39Q44 33 51 39M12 44Q21 39 28 44M35 44Q43 39 50 44"/></g><g fill="#4B2A21"><ellipse cx="21" cy="40" rx="4" ry="3.5"/><ellipse cx="43" cy="40" rx="4" ry="3.5"/></g></svg>`,
  cafe: `<svg viewBox="0 0 64 64"><path d="M8 26h40l-4 26a5 5 0 0 1-5 4H17a5 5 0 0 1-5-4z" fill="${L}"/><path d="M46 31a9 9 0 1 1 0 16" fill="none" stroke="${L}" stroke-width="9"/><path d="M12 29h32l-3.5 21.5a3 3 0 0 1-3 2.5H18.5a3 3 0 0 1-3-2.5z" fill="#FFFFFF"/><path d="M46 33a6 6 0 1 1 0 12" fill="none" stroke="#FFFFFF" stroke-width="4"/><ellipse cx="28" cy="30.5" rx="15" ry="3.2" fill="#7A4524"/><g stroke="${L}" stroke-width="3.4" stroke-linecap="round" fill="none"><path d="M20 20q-3-4 0-8M28 20q-3-4 0-8M36 20q-3-4 0-8"/></g></svg>`,
  gateau: `<svg viewBox="0 0 64 64"><rect x="6" y="26" width="52" height="30" rx="7" fill="${L}"/><circle cx="32" cy="15" r="8.5" fill="${L}"/><rect x="9" y="29" width="46" height="24" rx="5" fill="#FFF1DC"/><path d="M9 29h46v9q-4 5-7.7 0-3.8 5-7.6 0-3.9 5-7.7 0-3.8 5-7.7 0-3.8 5-7.6 0-3.8 5-7.7 0z" fill="#FF8FB1"/><circle cx="32" cy="15" r="5.5" fill="#E3263A"/><path d="M32 9q2-5 6-6" stroke="${L}" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`,
  pate: `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="36" rx="27" ry="19" fill="${L}"/><ellipse cx="32" cy="35" rx="23.5" ry="15.5" fill="#F3E2C0"/><ellipse cx="27" cy="29" rx="10" ry="4" fill="#FFFDF7" opacity=".85"/><g stroke="#D9BE8C" stroke-width="3" stroke-linecap="round"><path d="M20 36l5 6M30 34l5 6M40 36l5 6"/></g></svg>`,
  appareil: `<svg viewBox="0 0 64 64"><path d="M4 28h56q-2 28-28 28T4 28z" fill="${L}"/><path d="M8.5 31h47q-3 21.5-23.5 21.5T8.5 31z" fill="#8FC9E8"/><ellipse cx="32" cy="31" rx="23.5" ry="4.5" fill="#FFE27A"/><path d="M40 30L51 6" stroke="${L}" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="38" cy="24" rx="5" ry="10" transform="rotate(24 38 24)" fill="none" stroke="${L}" stroke-width="3.4"/></svg>`,
  heart: `<svg viewBox="0 0 64 64"><path d="M32 57 C10 42 3 31 3 21 C3 11 11 5 19 5 C25 5 29.5 8.5 32 13 C34.5 8.5 39 5 45 5 C53 5 61 11 61 21 C61 31 54 42 32 57Z" fill="${L}"/><path d="M32 51 C14 39 8 30 8 21.5 C8 14.5 13.5 10 19.5 10 C25 10 29 14 32 19 C35 14 39 10 44.5 10 C50.5 10 56 14.5 56 21.5 C56 30 50 39 32 51Z" fill="#FF4F6A"/><ellipse cx="20" cy="20" rx="5" ry="3.4" fill="#FFB0BC" transform="rotate(-30 20 20)"/></svg>`,
  arrow: `<svg viewBox="0 0 64 80"><path d="M22 4 H42 Q46 4 46 8 V38 H58 Q62 38 59 42 L35 72 Q32 76 29 72 L5 42 Q2 38 6 38 H18 V8 Q18 4 22 4Z" fill="${L}"/><path d="M24 9 H40 V43 H52 L32 67 L12 43 H24Z" fill="#FFC21A"/><path d="M24 9 H31 V43 H24Z" fill="#FFE27A"/></svg>`,
  up: `<svg viewBox="0 0 64 64"><path d="M32 3 L61 34 H45 V61 H19 V34 H3Z" fill="${L}" stroke="${L}" stroke-width="2" stroke-linejoin="round"/><path d="M32 10 L53 30 H40 V56 H24 V30 H11Z" fill="#69D36B"/><path d="M32 10 V56 H24 V30 H11Z" fill="#A8F0A2"/></svg>`,
  bag: `<svg viewBox="0 0 64 64"><path d="M22 9 Q32 3 42 9 L38 17 Q49 23 55 38 Q59 59 32 61 Q5 59 9 38 Q15 23 26 17Z" fill="${L}"/><path d="M26 12 Q32 9 38 12 L35 20 Q45 26 50 38 Q53 55 32 56 Q11 55 14 38 Q19 26 29 20Z" fill="#E2B067"/><path d="M27 20 H37" stroke="${L}" stroke-width="4" stroke-linecap="round"/><text x="32" y="48" text-anchor="middle" font-family="Lilita One, sans-serif" font-size="19" fill="#2F9E44">$</text></svg>`,
  gear: `<svg viewBox="0 0 64 64"><g fill="${L}" stroke="${L}" stroke-width="6" stroke-linejoin="round"><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(0 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(45 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(90 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(135 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(180 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(225 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(270 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(315 32 32)"/><circle cx="32" cy="32" r="19"/></g><g fill="#FFFFFF"><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(0 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(45 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(90 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(135 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(180 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(225 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(270 32 32)"/><rect x="27" y="4" width="10" height="14" rx="3" transform="rotate(315 32 32)"/><circle cx="32" cy="32" r="19"/></g><circle cx="32" cy="32" r="8.5" fill="${L}"/><circle cx="32" cy="32" r="5" fill="#9AA8BD"/></svg>`,
  list: `<svg viewBox="0 0 64 64"><rect x="8" y="7" width="48" height="54" rx="8" fill="${L}"/><rect x="12" y="11" width="40" height="46" rx="5" fill="#FFF6DD"/><rect x="22" y="3" width="20" height="12" rx="4" fill="${L}"/><rect x="25" y="6" width="14" height="6" rx="2" fill="#FFB31A"/><g stroke="#69D36B" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M18 26l4 4 7-8"/><path d="M18 42l4 4 7-8"/></g><g stroke="#C5CEDB" stroke-width="4.5" stroke-linecap="round"><path d="M34 27h12"/><path d="M34 43h12"/></g></svg>`,
  hat: `<svg viewBox="0 0 64 64"><path d="M14 40 Q4 34 8 23 Q12 14 22 16 Q24 5 34 5 Q44 5 46 15 Q56 13 59 22 Q62 33 50 40 L50 52 Q50 58 44 58 H20 Q14 58 14 52Z" fill="${L}"/><path d="M18 38 Q9 33 12 25 Q15 18.5 24 20.5 Q25 9.5 34 9.5 Q42 9.5 43 19.5 Q52 17 55 24 Q57.5 32 46 38 V51 Q46 54 43 54 H21 Q18 54 18 51Z" fill="#fff"/><rect x="18" y="40" width="28" height="7" fill="#E1E7F0"/></svg>`,
  close: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="#fff"/><circle cx="32" cy="32" r="25" fill="#FF4F5E"/><path d="M22 22l20 20M42 22L22 42" stroke="#fff" stroke-width="7" stroke-linecap="round"/></svg>`,
  sound: `<svg viewBox="0 0 64 64"><path d="M8 24h11l14-12v40L19 40H8z" fill="#fff" stroke="${L}" stroke-width="4" stroke-linejoin="round"/><path d="M41 22c3 3 4.5 6.3 4.5 10S44 39 41 42M47 16c4.6 4.4 7 10 7 16s-2.4 11.6-7 16" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
  music: `<svg viewBox="0 0 64 64"><path d="M24 12l30-7v38" fill="none" stroke="#fff" stroke-width="6" stroke-linejoin="round"/><path d="M24 12v36" stroke="#fff" stroke-width="6"/><ellipse cx="17" cy="49" rx="9" ry="7" fill="#fff"/><ellipse cx="47" cy="44" rx="9" ry="7" fill="#fff"/></svg>`,
  globe: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="25" fill="none" stroke="#fff" stroke-width="5"/><ellipse cx="32" cy="32" rx="11" ry="25" fill="none" stroke="#fff" stroke-width="4"/><path d="M8 32h48M12 20h40M12 44h40" stroke="#fff" stroke-width="4"/></svg>`,
  lock: `<svg viewBox="0 0 64 64"><path d="M20 28v-8a12 12 0 0124 0v8" fill="none" stroke="${L}" stroke-width="7"/><rect x="12" y="27" width="40" height="31" rx="7" fill="${L}"/><rect x="15" y="30" width="34" height="25" rx="5" fill="#FFC21A"/><circle cx="32" cy="41" r="4" fill="${L}"/></svg>`,
  shop: `<svg viewBox="0 0 64 64"><path d="M10 24h44l-4 32H14z" fill="${L}"/><path d="M14 27h36l-3.4 26H17.4z" fill="#FF8A3D"/><path d="M14 27h36l-.8 6H14.8z" fill="#FFB27A"/><path d="M22 26v-6a10 10 0 0120 0v6" fill="none" stroke="${L}" stroke-width="5" stroke-linecap="round"/></svg>`,
  clean: `<svg viewBox="0 0 64 64"><path d="M44 8L18 38l6 5 26-30z" fill="${L}"/><path d="M45 11L21 39l3 2.5 24-27.5z" fill="#D9A35A"/><path d="M10 35l20 15-8 10-20-15z" fill="${L}"/><path d="M12 37l16 12-6 7.5-16-12z" fill="#FFB31A"/><path d="M48 36l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#FFE27A"/><circle cx="36" cy="22" r="3" fill="#FFF"/></svg>`,
};

function el(tag, cls, html, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}

export function format(v) {
  v = Math.floor(v);
  if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + 'M';
  if (v >= 1e4) return (v / 1e3).toFixed(v >= 1e5 ? 0 : 1) + 'K';
  return String(v);
}

export class HUD {
  constructor(container, camera, root) {
    this.camera = camera;
    this.root = root;
    this.followers = [];
    this.layer = el('div', 'world-layer', null, container);
    const hud = el('div', 'hud', null, container);


    this.level = el('div', 'lvl', `<div class="star"><span class="icon">${ICONS.star}</span><span class="n">1</span></div><div class="linfo"><div class="lname"></div><div class="xbar"><div class="xfill"></div><span class="xtxt"></span></div></div>`, hud);
    this.lvlN = this.level.querySelector('.n');
    this.lvlName = this.level.querySelector('.lname');
    this.xFill = this.level.querySelector('.xfill');
    this.xTxt = this.level.querySelector('.xtxt');


    this.money = el('div', 'cur', `<span class="icon">${ICONS.cash}</span><span class="val">0</span>`, hud);
    this.moneyVal = this.money.querySelector('.val');
    this.coinIcon = this.money.querySelector('.icon');
    this.shown = -1;


    this.side = el('div', 'side', '', hud);
    this.btns = {};
    for (const [id, icon, color] of [['settings', 'gear', 'grey'], ['upgrades', 'up', 'blue'], ['missions', 'list', 'blue'], ['shop', 'hat', 'blue'], ['restart', 'star', 'gold hidden']]) {
      const b = el('button', `rbtn ${color}`, `<span class="icon">${ICONS[icon]}</span><span class="lbl"></span><i class="dot hidden">!</i>`, this.side);
      b.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (this.onButton) this.onButton(id); });
      this.btns[id] = b;
    }

    this.banner = el('div', 'banner hidden', '', hud);
    this.arrow = el('div', 'arrow hidden', ICONS.arrow, this.layer);
    this.arrowTarget = null;
    this.hint = el('div', 'hint', '', hud);


    this.boostBtn = el('button', 'pbtn yellow boostbtn hidden', `<span class="icon">${ICONS.video}</span><span>x2</span><span class="icon">${ICONS.bolt}</span>`, hud);
    this.boostBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); if (this.onBoost) this.onBoost(); });
    this.boostChip = el('div', 'boostchip hidden', `<span class="icon">${ICONS.bolt}</span><span class="val">2:00</span>`, hud);
    this.toastEl = el('div', 'toast hidden', '', hud);

    this.modal = el('div', 'modal hidden', '', container);

    this.joyBase = el('div', 'joy hidden', '<div class="knob"></div>', hud);
    this.joyKnob = this.joyBase.querySelector('.knob');
    this.relabel();
  }

  relabel() {
    for (const id in this.btns) this.btns[id].querySelector('.lbl').textContent = t('btn_' + id);
  }


  setMoney(v) {
    v = Math.floor(v);
    if (v === this.shown) return;
    const up = v > this.shown && this.shown >= 0;
    this.shown = v;
    this.moneyVal.textContent = format(v);
    if (up) { restart(this.coinIcon, 'bump'); }
  }
  setLevel(level, xp, need, name) {
    const n = String(level);
    if (this.lvlN.textContent !== n) { this.lvlN.textContent = n; if (level > 1) restart(this.level.querySelector('.star'), 'bump'); }
    this.lvlName.textContent = name;
    this.xFill.style.width = `${Math.min(100, Math.round((xp / need) * 100))}%`;
    this.xTxt.textContent = `${Math.floor(xp)}/${need}`;
  }
  setDot(id, on) { this.btns[id].querySelector('.dot').classList.toggle('hidden', !on); }

  buttonHint(id, text) {
    const b = this.btns[id];
    let h = b.querySelector('.bhint');
    if (!text) { if (h) h.remove(); return; }
    if (!h) { h = document.createElement('div'); h.className = 'bhint'; b.appendChild(h); }
    if (h.textContent !== text) h.textContent = text;
  }
  showButton(id, on) { this.btns[id].classList.toggle('hidden', !on); }


  follow(elem, world, dy = 0) {
    const f = { el: elem, world, dy };
    this.followers.push(f);
    this.place(f);
    return f;
  }
  unfollow(elem) {
    this.followers = this.followers.filter((f) => f.el !== elem);
    elem.remove();
  }
  toScreen(v, out) {
    out.copy(v);
    this.root.localToWorld(out);
    out.project(this.camera);
    return { x: (out.x + 1) * 0.5 * innerWidth, y: (1 - out.y) * 0.5 * innerHeight };
  }
  place(f) {
    const s = this.toScreen(f.world(), _v);
    f.el.style.transform = `translate(${s.x.toFixed(1)}px, ${(s.y + f.dy).toFixed(1)}px)`;
  }
  tick(time) {
    for (const f of this.followers) this.place(f);
    if (this.arrowTarget) {
      const s = this.toScreen(this.arrowTarget(), _v);
      const b = Math.abs(Math.sin(time * 4)) * 22;
      this.arrow.style.transform = `translate(${s.x.toFixed(1)}px, ${(s.y - 18 - b).toFixed(1)}px)`;
    }
  }


  bubble(world, kind = 'baguette') {
    const b = el('div', 'anchor', `<div class="bubble pop-in"><span class="icon">${ICONS[kind] || ICONS.baguette}</span><span class="n">x1</span></div>`, this.layer);
    this.follow(b, world);
    const n = b.querySelector('.n');
    return {
      el: b,
      set(v) { const s = 'x' + v; if (n.textContent !== s) n.textContent = s; },
      happy() {
        const inner = b.querySelector('.bubble');
        inner.classList.add('happy');
        inner.innerHTML = `<span class="icon">${ICONS.heart}</span>`;
        restart(inner, 'nudge');
      },
    };
  }


  order(world, order) {
    const b = el('div', 'anchor', `<div class="bubble order pop-in"></div>`, this.layer);
    this.follow(b, world);
    const inner = b.querySelector('.bubble');
    let last = '';
    const set = (o) => {
      const key = o.map((x) => x.kind + (x.n - x.got)).join('|');
      if (key === last) return;
      last = key;
      inner.innerHTML = o.map((x) => {
        const left = x.n - x.got;
        return `<span class="it${left <= 0 ? ' done' : ''}"><span class="icon">${ICONS[x.kind] || ''}</span><span class="n">${left > 0 ? 'x' + left : '✓'}</span></span>`;
      }).join('');
    };
    set(order);
    return {
      el: b,
      set,
      happy() {
        inner.classList.add('happy');
        inner.innerHTML = `<span class="icon">${ICONS.heart}</span>`;
        restart(inner, 'nudge');
      },
    };
  }


  padLabel(world, title) {
    const e = el('div', 'anchor', `<div class="pad-label pop-in"><div class="title">${title || ''}</div><div class="price"><span class="icon">${ICONS.cash}</span><span class="val">0</span></div></div>`, this.layer);
    this.follow(e, world);
    const val = e.querySelector('.val');
    const ttl = e.querySelector('.title');
    return {
      el: e,
      set(v) { const s = format(v); if (val.textContent !== s) val.textContent = s; },
      setTitle(s) { ttl.textContent = s; },
    };
  }

  followText(world, text, cls) {
    const e = el('div', 'anchor', `<div class="ftext ${cls}">${text}</div>`, this.layer);
    this.follow(e, world);
    return e;
  }

  floatText(world, text) {
    const e = el('div', 'anchor', `<div class="gain"><span class="icon">${ICONS.cash}</span>${text}</div>`, this.layer);
    const f = this.follow(e, () => world);
    setTimeout(() => this.unfollow(e), 950);
    return f;
  }


  tutorial(text, target) {
    if (!text) { this.banner.classList.add('hidden'); this.arrow.classList.add('hidden'); this.arrowTarget = null; return; }
    if (this.banner.textContent !== text) { this.banner.textContent = text; restart(this.banner, 'pop-in'); }
    this.banner.classList.remove('hidden');
    this.arrowTarget = target;
    this.arrow.classList.toggle('hidden', !target);
  }

  setHint(text) { this.hint.textContent = text; }
  hideHint() { this.hint.classList.add('gone'); }

  setBoostButton(show) { this.boostBtn.classList.toggle('hidden', !show); }
  setBoost(seconds) {
    const on = seconds > 0;
    this.boostChip.classList.toggle('hidden', !on);
    if (on) {
      const s = Math.ceil(seconds);
      this.boostChip.querySelector('.val').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    }
  }

  toast(text) {
    this.toastEl.textContent = text;
    this.toastEl.classList.remove('hidden');
    restart(this.toastEl, 'pop-in');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.toastEl.classList.add('hidden'), 2200);
  }


  get modalOpen() { return !this.modal.classList.contains('hidden'); }
  closeModal() { this.modal.classList.add('hidden'); this.modal.innerHTML = ''; const f = this._onClose; this._onClose = null; if (f) f(); }


  panel({ title, body, onClose, onAct, wide = false, closable = true, cls = '' }) {
    this._onClose = onClose || null;

    const card = this.modal.querySelector('.card');
    if (card && !this.modal.classList.contains('hidden') && this._title === title) {
      const bd = card.querySelector('.body');
      if (this._lastBody !== body) { this._lastBody = body; bd.innerHTML = body; this._bindActs(onAct); }
      this._onAct = onAct;
      return;
    }
    this._title = title;
    this._lastBody = body;
    this.modal.innerHTML = `<div class="card${wide ? ' wide' : ''}${cls ? ' ' + cls : ''} pop-in"><div class="ribbon"><span>${title}</span></div>${closable ? `<button class="x">${ICONS.close}</button>` : ''}<div class="body">${body}</div></div>`;
    this.modal.classList.remove('hidden');
    const x = this.modal.querySelector('.x');
    if (x) x.addEventListener('click', (e) => { e.stopPropagation(); this.closeModal(); });
    this._bindActs(onAct);
  }

  _bindActs(onAct) {
    this.modal.querySelectorAll('.body [data-act]').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (b.classList.contains('off')) return;
      if (onAct) onAct(b.dataset.act, b);
    }));
  }


  offer({ icon, title, desc, amount, buttons }) {
    const btn = (b, i) => `<button class="pbtn ${b.ad ? 'blue' : (b.alt ? 'grey' : (b.color || 'green'))}" data-act="${i}">${b.ad ? `<span class="icon">${ICONS.video}</span>` : (b.icon ? `<span class="icon">${ICONS[b.icon]}</span>` : '')}<span>${b.label}</span></button>`;
    const amt = amount != null ? `<div class="amount"><span class="icon">${ICONS.cash}</span>${format(amount)}</div>` : '';
    this.panel({
      title, closable: false,
      body: `<div class="big icon">${ICONS[icon]}</div><div class="p">${desc}</div>${amt}<div class="row">${buttons.map(btn).join('')}</div>`,
      onAct: (i) => { this.closeModal(); buttons[+i].onClick(); },
    });
  }

  joystick(show, ox = 0, oy = 0, kx = 0, ky = 0) {
    this.joyBase.classList.toggle('hidden', !show);
    if (!show) return;
    this.joyBase.style.transform = `translate(${ox}px, ${oy}px)`;
    this.joyKnob.style.transform = `translate(${kx - ox}px, ${ky - oy}px)`;
  }
}

const _v = new THREE.Vector3();

export function restart(e, cls) {
  e.classList.remove(cls);
  void e.offsetWidth;
  e.classList.add(cls);
}
