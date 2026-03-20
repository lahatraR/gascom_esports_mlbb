// ─── Static enrichment data for all 132 MLBB heroes ─────────────────────────
// Hero IDs match the mlbb-stats.rone.dev API exactly (verified 2026-03).
// The API provides: id, name, image, counters, counteredBy, synergies.
// This file provides: roles, combat stats (early/mid/late/damage/tankiness/cc/mobility/push/pressure)

export interface HeroStats {
  roles:     string[];
  early:     number;  // 0–10
  mid:       number;
  late:      number;
  damage:    number;
  tankiness: number;
  cc:        number;  // crowd control
  mobility:  number;
  push:      number;
  pressure:  number;
  // Optional default rates (used when API hero-rank doesn't cover this hero)
  winRate?:  number;
  pickRate?: number;
  banRate?:  number;
}

// Default stats per primary role (used for heroes not explicitly listed)
const ROLE_DEFAULTS: Record<string, Omit<HeroStats, 'roles'>> = {
  Tank:     { early:6, mid:7, late:6,  damage:4,  tankiness:8, cc:6, mobility:4, push:4,  pressure:5, winRate:0.500, pickRate:0.04, banRate:0.01 },
  Support:  { early:5, mid:7, late:7,  damage:3,  tankiness:5, cc:5, mobility:5, push:2,  pressure:4, winRate:0.505, pickRate:0.05, banRate:0.02 },
  Fighter:  { early:7, mid:7, late:7,  damage:7,  tankiness:7, cc:5, mobility:5, push:5,  pressure:6, winRate:0.500, pickRate:0.05, banRate:0.02 },
  Assassin: { early:7, mid:8, late:7,  damage:9,  tankiness:3, cc:2, mobility:8, push:3,  pressure:7, winRate:0.505, pickRate:0.06, banRate:0.05 },
  Mage:     { early:5, mid:8, late:8,  damage:8,  tankiness:3, cc:5, mobility:5, push:4,  pressure:6, winRate:0.508, pickRate:0.06, banRate:0.04 },
  Marksman: { early:5, mid:7, late:9,  damage:8,  tankiness:3, cc:2, mobility:5, push:5,  pressure:6, winRate:0.505, pickRate:0.06, banRate:0.04 },
};

// ─── Per-hero stats — keyed by API hero_id ────────────────────────────────────

export const HERO_STATS: Record<number, HeroStats> = {
  // ── MARKSMEN ──────────────────────────────────────────────────────────────
  1:   { roles:['Marksman'],               early:3,  mid:6,  late:10, damage:8,  tankiness:3, cc:2,  mobility:6, push:6,  pressure:5,  winRate:0.497, pickRate:0.042, banRate:0.012 }, // Miya
  12:  { roles:['Marksman'],               early:6,  mid:7,  late:8,  damage:8,  tankiness:4, cc:2,  mobility:6, push:5,  pressure:6,  winRate:0.505, pickRate:0.055, banRate:0.020 }, // Bruno
  13:  { roles:['Marksman','Fighter'],      early:7,  mid:8,  late:8,  damage:8,  tankiness:5, cc:3,  mobility:5, push:5,  pressure:6,  winRate:0.508, pickRate:0.060, banRate:0.042 }, // Clint
  18:  { roles:['Marksman'],               early:3,  mid:5,  late:9,  damage:7,  tankiness:3, cc:1,  mobility:4, push:6,  pressure:4,  winRate:0.495, pickRate:0.030, banRate:0.008 }, // Layla
  30:  { roles:['Marksman','Assassin'],     early:7,  mid:8,  late:8,  damage:8,  tankiness:4, cc:3,  mobility:7, push:4,  pressure:9,  winRate:0.510, pickRate:0.058, banRate:0.062 }, // Yi Sun-shin
  31:  { roles:['Marksman'],               early:5,  mid:7,  late:9,  damage:8,  tankiness:3, cc:2,  mobility:6, push:6,  pressure:6,  winRate:0.498, pickRate:0.038, banRate:0.015 }, // Moskov
  39:  { roles:['Fighter','Marksman'],      early:6,  mid:7,  late:8,  damage:7,  tankiness:6, cc:3,  mobility:6, push:5,  pressure:6 }, // Roger
  40:  { roles:['Marksman'],               early:5,  mid:8,  late:9,  damage:8,  tankiness:4, cc:2,  mobility:6, push:5,  pressure:7,  winRate:0.522, pickRate:0.082, banRate:0.108 }, // Karrie
  43:  { roles:['Marksman'],               early:4,  mid:7,  late:9,  damage:8,  tankiness:4, cc:3,  mobility:5, push:7,  pressure:6,  winRate:0.503, pickRate:0.038, banRate:0.018 }, // Irithel
  53:  { roles:['Marksman','Assassin'],     early:6,  mid:7,  late:9,  damage:8,  tankiness:3, cc:2,  mobility:5, push:5,  pressure:7 }, // Lesley
  60:  { roles:['Marksman'],               early:4,  mid:7,  late:9,  damage:8,  tankiness:3, cc:4,  mobility:5, push:6,  pressure:5 }, // Hanabi
  65:  { roles:['Marksman','Assassin'],     early:5,  mid:7,  late:10, damage:9,  tankiness:4, cc:3,  mobility:7, push:6,  pressure:8,  winRate:0.519, pickRate:0.088, banRate:0.122 }, // Claude
  71:  { roles:['Marksman','Mage'],         early:6,  mid:8,  late:8,  damage:8,  tankiness:3, cc:3,  mobility:5, push:5,  pressure:6 }, // Kimmy
  79:  { roles:['Marksman','Assassin'],     early:7,  mid:9,  late:8,  damage:9,  tankiness:3, cc:2,  mobility:6, push:4,  pressure:7,  winRate:0.517, pickRate:0.080, banRate:0.095 }, // Granger
  89:  { roles:['Marksman'],               early:6,  mid:8,  late:9,  damage:9,  tankiness:4, cc:4,  mobility:9, push:5,  pressure:8,  winRate:0.518, pickRate:0.095, banRate:0.138 }, // Wanwan
  94:  { roles:['Marksman','Support'],      early:6,  mid:7,  late:8,  damage:7,  tankiness:4, cc:5,  mobility:5, push:5,  pressure:6 }, // Popol and Kupa
  100: { roles:['Marksman'],               early:6,  mid:8,  late:9,  damage:9,  tankiness:4, cc:3,  mobility:5, push:5,  pressure:7,  winRate:0.514, pickRate:0.070, banRate:0.082 }, // Brody
  105: { roles:['Marksman'],               early:7,  mid:8,  late:9,  damage:9,  tankiness:3, cc:2,  mobility:6, push:5,  pressure:7 }, // Beatrix
  107: { roles:['Marksman','Mage'],         early:6,  mid:8,  late:9,  damage:9,  tankiness:3, cc:3,  mobility:5, push:5,  pressure:6 }, // Natan
  111: { roles:['Tank','Marksman'],         early:6,  mid:8,  late:8,  damage:7,  tankiness:8, cc:5,  mobility:4, push:5,  pressure:6 }, // Edith
  114: { roles:['Marksman'],               early:5,  mid:8,  late:9,  damage:8,  tankiness:4, cc:5,  mobility:5, push:5,  pressure:6,  winRate:0.518, pickRate:0.072, banRate:0.085 }, // Melissa
  121: { roles:['Marksman'],               early:6,  mid:8,  late:9,  damage:8,  tankiness:3, cc:3,  mobility:5, push:5,  pressure:6 }, // Ixia

  // ── TANKS ─────────────────────────────────────────────────────────────────
  6:   { roles:['Tank','Support'],          early:8,  mid:7,  late:6,  damage:3,  tankiness:9, cc:9,  mobility:3, push:3,  pressure:6,  winRate:0.504, pickRate:0.065, banRate:0.008 }, // Tigreal
  9:   { roles:['Tank','Fighter'],          early:7,  mid:7,  late:6,  damage:5,  tankiness:8, cc:8,  mobility:6, push:4,  pressure:6 }, // Akai
  10:  { roles:['Tank','Support'],          early:9,  mid:7,  late:5,  damage:5,  tankiness:8, cc:9,  mobility:6, push:3,  pressure:7,  winRate:0.506, pickRate:0.045, banRate:0.025 }, // Franco
  19:  { roles:['Tank','Support'],          early:6,  mid:7,  late:6,  damage:4,  tankiness:8, cc:9,  mobility:4, push:3,  pressure:6 }, // Minotaur
  20:  { roles:['Tank','Support'],          early:7,  mid:7,  late:5,  damage:3,  tankiness:8, cc:7,  mobility:4, push:2,  pressure:5,  winRate:0.515, pickRate:0.038, banRate:0.012 }, // Lolita
  32:  { roles:['Tank','Support'],          early:7,  mid:8,  late:6,  damage:6,  tankiness:9, cc:8,  mobility:7, push:4,  pressure:7,  winRate:0.510, pickRate:0.055, banRate:0.030 }, // Johnson
  41:  { roles:['Tank','Fighter'],          early:6,  mid:7,  late:7,  damage:6,  tankiness:8, cc:7,  mobility:5, push:4,  pressure:6 }, // Gatotkaca
  44:  { roles:['Tank','Fighter'],          early:7,  mid:7,  late:7,  damage:5,  tankiness:9, cc:5,  mobility:3, push:8,  pressure:5 }, // Grock
  49:  { roles:['Tank','Support'],          early:5,  mid:7,  late:8,  damage:5,  tankiness:9, cc:7,  mobility:4, push:4,  pressure:5 }, // Hylos
  59:  { roles:['Tank','Fighter'],          early:6,  mid:7,  late:8,  damage:5,  tankiness:9, cc:4,  mobility:5, push:4,  pressure:5 }, // Uranus
  62:  { roles:['Fighter','Support'],       early:7,  mid:7,  late:6,  damage:6,  tankiness:6, cc:8,  mobility:6, push:4,  pressure:7 }, // Kaja
  70:  { roles:['Tank','Support'],          early:5,  mid:6,  late:7,  damage:3,  tankiness:8, cc:6,  mobility:3, push:3,  pressure:4 }, // Belerick
  74:  { roles:['Fighter','Support'],       early:6,  mid:7,  late:6,  damage:5,  tankiness:7, cc:8,  mobility:4, push:4,  pressure:5 }, // Minsitthar
  78:  { roles:['Tank'],                   early:8,  mid:8,  late:7,  damage:5,  tankiness:8, cc:9,  mobility:6, push:3,  pressure:7,  winRate:0.512, pickRate:0.095, banRate:0.145 }, // Khufra
  81:  { roles:['Tank','Mage'],             early:6,  mid:8,  late:8,  damage:6,  tankiness:8, cc:5,  mobility:5, push:4,  pressure:5 }, // Esmeralda
  87:  { roles:['Tank'],                   early:6,  mid:7,  late:7,  damage:4,  tankiness:8, cc:6,  mobility:5, push:3,  pressure:5 }, // Baxia
  88:  { roles:['Fighter','Tank'],          early:7,  mid:7,  late:8,  damage:7,  tankiness:9, cc:3,  mobility:6, push:7,  pressure:6,  winRate:0.500, pickRate:0.030, banRate:0.007 }, // Masha
  93:  { roles:['Tank','Support'],          early:6,  mid:8,  late:7,  damage:4,  tankiness:8, cc:10, mobility:6, push:3,  pressure:8,  winRate:0.518, pickRate:0.075, banRate:0.095 }, // Atlas
  99:  { roles:['Tank','Fighter'],          early:6,  mid:7,  late:7,  damage:6,  tankiness:9, cc:6,  mobility:5, push:5,  pressure:6 }, // Barats
  104: { roles:['Tank'],                   early:6,  mid:7,  late:7,  damage:5,  tankiness:9, cc:7,  mobility:5, push:4,  pressure:5 }, // Gloo
  124: { roles:['Support'],               early:6,  mid:8,  late:8,  damage:4,  tankiness:6, cc:7,  mobility:7, push:3,  pressure:6,  winRate:0.518, pickRate:0.068, banRate:0.075 }, // Chip
  128: { roles:['Tank','Support'],          early:6,  mid:7,  late:7,  damage:4,  tankiness:8, cc:7,  mobility:4, push:3,  pressure:5 }, // Kalea

  // ── SUPPORTS ──────────────────────────────────────────────────────────────
  5:   { roles:['Support','Mage'],          early:6,  mid:7,  late:7,  damage:6,  tankiness:5, cc:8,  mobility:4, push:3,  pressure:6,  winRate:0.516, pickRate:0.058, banRate:0.042 }, // Nana
  14:  { roles:['Support'],               early:5,  mid:7,  late:8,  damage:3,  tankiness:5, cc:5,  mobility:4, push:2,  pressure:4 }, // Rafaela
  34:  { roles:['Support'],               early:5,  mid:8,  late:9,  damage:3,  tankiness:5, cc:5,  mobility:4, push:2,  pressure:4,  winRate:0.522, pickRate:0.070, banRate:0.055 }, // Estes
  48:  { roles:['Support'],               early:5,  mid:8,  late:7,  damage:5,  tankiness:5, cc:7,  mobility:4, push:2,  pressure:6,  winRate:0.514, pickRate:0.055, banRate:0.040 }, // Diggie
  55:  { roles:['Support','Mage'],          early:5,  mid:8,  late:9,  damage:5,  tankiness:4, cc:6,  mobility:5, push:2,  pressure:5,  winRate:0.519, pickRate:0.065, banRate:0.060 }, // Angela
  76:  { roles:['Support','Mage'],          early:5,  mid:7,  late:7,  damage:5,  tankiness:5, cc:6,  mobility:5, push:2,  pressure:4 }, // Faramis
  92:  { roles:['Support','Tank'],          early:6,  mid:7,  late:8,  damage:5,  tankiness:7, cc:7,  mobility:5, push:3,  pressure:5,  winRate:0.511, pickRate:0.062, banRate:0.035 }, // Carmilla
  96:  { roles:['Mage','Support'],          early:5,  mid:8,  late:8,  damage:8,  tankiness:4, cc:7,  mobility:5, push:3,  pressure:6 }, // Luo Yi
  102: { roles:['Support','Assassin'],      early:7,  mid:8,  late:7,  damage:6,  tankiness:5, cc:6,  mobility:9, push:3,  pressure:7,  winRate:0.516, pickRate:0.072, banRate:0.080 }, // Mathilda
  112: { roles:['Support'],               early:4,  mid:7,  late:9,  damage:4,  tankiness:4, cc:4,  mobility:4, push:2,  pressure:4,  winRate:0.520, pickRate:0.058, banRate:0.028 }, // Floryn
  125: { roles:['Mage','Support'],          early:5,  mid:8,  late:8,  damage:8,  tankiness:4, cc:6,  mobility:5, push:3,  pressure:6 }, // Zhuxin
  132: { roles:['Support'],               early:6,  mid:8,  late:8,  damage:4,  tankiness:6, cc:7,  mobility:6, push:3,  pressure:5 }, // Marcel

  // ── FIGHTERS ──────────────────────────────────────────────────────────────
  2:   { roles:['Fighter'],               early:7,  mid:7,  late:7,  damage:7,  tankiness:7, cc:5,  mobility:4, push:6,  pressure:5 }, // Balmond
  7:   { roles:['Fighter'],               early:7,  mid:7,  late:8,  damage:8,  tankiness:7, cc:3,  mobility:6, push:5,  pressure:5 }, // Alucard
  11:  { roles:['Fighter','Mage'],         early:6,  mid:7,  late:7,  damage:7,  tankiness:6, cc:4,  mobility:5, push:6,  pressure:5 }, // Bane
  16:  { roles:['Fighter'],               early:7,  mid:7,  late:7,  damage:7,  tankiness:6, cc:4,  mobility:7, push:5,  pressure:6 }, // Zilong
  22:  { roles:['Fighter'],               early:7,  mid:7,  late:7,  damage:7,  tankiness:6, cc:5,  mobility:5, push:4,  pressure:5 }, // Freya
  26:  { roles:['Fighter','Assassin'],     early:7,  mid:8,  late:7,  damage:7,  tankiness:6, cc:9,  mobility:8, push:4,  pressure:8,  winRate:0.517, pickRate:0.090, banRate:0.125 }, // Chou
  27:  { roles:['Fighter'],               early:6,  mid:7,  late:7,  damage:7,  tankiness:7, cc:4,  mobility:5, push:5,  pressure:5 }, // Sun
  28:  { roles:['Fighter'],               early:7,  mid:7,  late:7,  damage:7,  tankiness:7, cc:5,  mobility:5, push:5,  pressure:6 }, // Alpha
  29:  { roles:['Fighter','Support'],      early:7,  mid:7,  late:7,  damage:6,  tankiness:7, cc:9,  mobility:6, push:4,  pressure:6,  winRate:0.511, pickRate:0.060, banRate:0.045 }, // Ruby
  35:  { roles:['Fighter','Tank'],         early:8,  mid:7,  late:6,  damage:7,  tankiness:7, cc:4,  mobility:6, push:6,  pressure:6 }, // Hilda
  37:  { roles:['Fighter'],               early:6,  mid:8,  late:8,  damage:8,  tankiness:7, cc:5,  mobility:5, push:5,  pressure:7 }, // Lapu-Lapu
  45:  { roles:['Fighter'],               early:5,  mid:7,  late:9,  damage:8,  tankiness:7, cc:3,  mobility:5, push:5,  pressure:5 }, // Argus
  54:  { roles:['Fighter','Tank'],         early:8,  mid:7,  late:6,  damage:7,  tankiness:7, cc:8,  mobility:6, push:4,  pressure:7 }, // Jawhead
  58:  { roles:['Fighter'],               early:8,  mid:7,  late:6,  damage:8,  tankiness:6, cc:6,  mobility:6, push:4,  pressure:7 }, // Martis
  64:  { roles:['Fighter'],               early:4,  mid:7,  late:10, damage:10, tankiness:7, cc:5,  mobility:6, push:5,  pressure:7,  winRate:0.508, pickRate:0.048, banRate:0.058 }, // Aldous
  67:  { roles:['Fighter'],               early:7,  mid:7,  late:8,  damage:8,  tankiness:7, cc:5,  mobility:5, push:5,  pressure:6 }, // Leomord
  72:  { roles:['Fighter'],               early:6,  mid:7,  late:9,  damage:8,  tankiness:7, cc:4,  mobility:5, push:5,  pressure:6,  winRate:0.514, pickRate:0.058, banRate:0.048 }, // Thamuz
  77:  { roles:['Fighter'],               early:7,  mid:8,  late:7,  damage:7,  tankiness:7, cc:8,  mobility:5, push:5,  pressure:7 }, // Badang
  80:  { roles:['Fighter','Mage'],         early:7,  mid:8,  late:7,  damage:8,  tankiness:6, cc:7,  mobility:7, push:4,  pressure:7 }, // Guinevere
  82:  { roles:['Fighter'],               early:6,  mid:7,  late:8,  damage:8,  tankiness:7, cc:5,  mobility:4, push:5,  pressure:5 }, // Terizla
  83:  { roles:['Fighter'],               early:6,  mid:8,  late:8,  damage:8,  tankiness:8, cc:4,  mobility:5, push:7,  pressure:6 }, // X.Borg
  85:  { roles:['Fighter'],               early:8,  mid:8,  late:7,  damage:8,  tankiness:7, cc:5,  mobility:6, push:5,  pressure:7 }, // Dyrroth
  90:  { roles:['Fighter','Mage'],         early:7,  mid:8,  late:7,  damage:7,  tankiness:6, cc:7,  mobility:6, push:4,  pressure:6 }, // Silvanna
  95:  { roles:['Fighter'],               early:7,  mid:8,  late:8,  damage:8,  tankiness:8, cc:5,  mobility:6, push:5,  pressure:7,  winRate:0.513, pickRate:0.068, banRate:0.072 }, // Yu Zhong
  97:  { roles:['Assassin','Fighter'],     early:7,  mid:8,  late:8,  damage:8,  tankiness:5, cc:3,  mobility:8, push:4,  pressure:7 }, // Benedetta
  98:  { roles:['Fighter'],               early:7,  mid:7,  late:7,  damage:7,  tankiness:7, cc:4,  mobility:5, push:5,  pressure:6 }, // Khaleed
  103: { roles:['Fighter'],               early:9,  mid:8,  late:7,  damage:8,  tankiness:7, cc:7,  mobility:7, push:4,  pressure:8,  winRate:0.518, pickRate:0.082, banRate:0.110 }, // Paquito
  106: { roles:['Fighter'],               early:7,  mid:8,  late:8,  damage:7,  tankiness:7, cc:7,  mobility:5, push:4,  pressure:7 }, // Phoveus
  108: { roles:['Fighter'],               early:7,  mid:7,  late:8,  damage:8,  tankiness:7, cc:3,  mobility:5, push:5,  pressure:6 }, // Aulus
  113: { roles:['Fighter'],               early:8,  mid:8,  late:7,  damage:8,  tankiness:7, cc:6,  mobility:7, push:4,  pressure:7 }, // Yin
  116: { roles:['Fighter','Assassin'],     early:7,  mid:8,  late:8,  damage:8,  tankiness:5, cc:4,  mobility:7, push:4,  pressure:7 }, // Julian
  117: { roles:['Fighter','Tank'],         early:6,  mid:8,  late:9,  damage:7,  tankiness:9, cc:5,  mobility:4, push:4,  pressure:6,  winRate:0.521, pickRate:0.075, banRate:0.088 }, // Fredrinn
  120: { roles:['Fighter','Assassin'],     early:7,  mid:8,  late:8,  damage:8,  tankiness:5, cc:5,  mobility:7, push:4,  pressure:7 }, // Arlott
  123: { roles:['Fighter'],               early:7,  mid:8,  late:8,  damage:7,  tankiness:7, cc:5,  mobility:7, push:5,  pressure:7 }, // Cici
  126: { roles:['Assassin','Fighter'],     early:8,  mid:8,  late:7,  damage:9,  tankiness:4, cc:3,  mobility:8, push:3,  pressure:8 }, // Suyou
  127: { roles:['Fighter'],               early:7,  mid:8,  late:8,  damage:8,  tankiness:7, cc:4,  mobility:6, push:5,  pressure:7 }, // Lukas
  130: { roles:['Mage','Fighter'],         early:5,  mid:8,  late:9,  damage:9,  tankiness:5, cc:6,  mobility:5, push:4,  pressure:6 }, // Obsidia
  131: { roles:['Assassin','Fighter'],     early:8,  mid:8,  late:7,  damage:9,  tankiness:4, cc:3,  mobility:8, push:3,  pressure:8 }, // Sora

  // ── ASSASSINS ─────────────────────────────────────────────────────────────
  3:   { roles:['Assassin'],              early:6,  mid:8,  late:7,  damage:9,  tankiness:3, cc:6,  mobility:7, push:3,  pressure:7 }, // Saber
  8:   { roles:['Assassin','Mage'],        early:7,  mid:8,  late:7,  damage:9,  tankiness:3, cc:2,  mobility:7, push:3,  pressure:7,  winRate:0.509, pickRate:0.058, banRate:0.048 }, // Karina
  17:  { roles:['Assassin'],              early:9,  mid:9,  late:7,  damage:9,  tankiness:3, cc:2,  mobility:10, push:3, pressure:9,  winRate:0.490, pickRate:0.045, banRate:0.095 }, // Fanny
  21:  { roles:['Assassin'],              early:7,  mid:8,  late:8,  damage:9,  tankiness:4, cc:2,  mobility:9, push:3,  pressure:8,  winRate:0.506, pickRate:0.068, banRate:0.075 }, // Hayabusa
  24:  { roles:['Assassin'],              early:6,  mid:8,  late:8,  damage:8,  tankiness:3, cc:2,  mobility:8, push:2,  pressure:8,  winRate:0.511, pickRate:0.055, banRate:0.065 }, // Natalia
  42:  { roles:['Mage','Assassin'],        early:6,  mid:8,  late:8,  damage:9,  tankiness:3, cc:3,  mobility:8, push:3,  pressure:7,  winRate:0.513, pickRate:0.058, banRate:0.060 }, // Harley
  47:  { roles:['Assassin'],              early:8,  mid:9,  late:7,  damage:9,  tankiness:4, cc:3,  mobility:9, push:3,  pressure:8,  winRate:0.512, pickRate:0.088, banRate:0.102 }, // Lancelot
  51:  { roles:['Assassin'],              early:7,  mid:8,  late:8,  damage:9,  tankiness:4, cc:4,  mobility:8, push:3,  pressure:8 }, // Helcurt
  56:  { roles:['Assassin','Mage'],        early:7,  mid:9,  late:8,  damage:10, tankiness:3, cc:3,  mobility:8, push:3,  pressure:8,  winRate:0.514, pickRate:0.082, banRate:0.118 }, // Gusion
  63:  { roles:['Assassin','Mage'],        early:8,  mid:8,  late:7,  damage:9,  tankiness:3, cc:9,  mobility:7, push:4,  pressure:8,  winRate:0.519, pickRate:0.075, banRate:0.105 }, // Selena
  69:  { roles:['Assassin'],              early:6,  mid:8,  late:8,  damage:9,  tankiness:3, cc:3,  mobility:7, push:3,  pressure:7 }, // Hanzo
  73:  { roles:['Mage','Assassin'],        early:7,  mid:9,  late:8,  damage:9,  tankiness:4, cc:5,  mobility:9, push:3,  pressure:8 }, // Harith
  75:  { roles:['Mage','Assassin'],        early:7,  mid:8,  late:8,  damage:9,  tankiness:4, cc:5,  mobility:7, push:3,  pressure:7 }, // Kadita
  84:  { roles:['Assassin'],              early:6,  mid:9,  late:8,  damage:9,  tankiness:3, cc:2,  mobility:10, push:3, pressure:9,  winRate:0.510, pickRate:0.078, banRate:0.112 }, // Ling
  109: { roles:['Assassin'],              early:5,  mid:8,  late:9,  damage:9,  tankiness:4, cc:2,  mobility:7, push:3,  pressure:7,  winRate:0.515, pickRate:0.062, banRate:0.058 }, // Aamon
  110: { roles:['Mage'],                  early:6,  mid:8,  late:9,  damage:9,  tankiness:4, cc:5,  mobility:6, push:4,  pressure:7 }, // Valentina
  118: { roles:['Assassin'],              early:7,  mid:8,  late:8,  damage:9,  tankiness:3, cc:3,  mobility:9, push:3,  pressure:8 }, // Joy
  122: { roles:['Assassin'],              early:8,  mid:8,  late:7,  damage:9,  tankiness:3, cc:2,  mobility:9, push:3,  pressure:8 }, // Nolan
  129: { roles:['Assassin','Mage'],        early:7,  mid:8,  late:8,  damage:9,  tankiness:3, cc:4,  mobility:8, push:3,  pressure:7 }, // Zetian

  // ── MAGES ─────────────────────────────────────────────────────────────────
  4:   { roles:['Mage','Tank'],            early:5,  mid:8,  late:8,  damage:8,  tankiness:6, cc:5,  mobility:6, push:5,  pressure:6 }, // Alice
  15:  { roles:['Mage'],                  early:6,  mid:8,  late:7,  damage:9,  tankiness:3, cc:6,  mobility:4, push:3,  pressure:6 }, // Eudora
  23:  { roles:['Mage'],                  early:5,  mid:7,  late:8,  damage:8,  tankiness:3, cc:4,  mobility:5, push:5,  pressure:6 }, // Gord
  25:  { roles:['Mage'],                  early:6,  mid:9,  late:9,  damage:10, tankiness:3, cc:7,  mobility:8, push:4,  pressure:8,  winRate:0.520, pickRate:0.092, banRate:0.135 }, // Kagura
  33:  { roles:['Mage'],                  early:6,  mid:8,  late:8,  damage:9,  tankiness:3, cc:5,  mobility:5, push:4,  pressure:6 }, // Cyclops
  36:  { roles:['Mage'],                  early:7,  mid:8,  late:7,  damage:9,  tankiness:3, cc:7,  mobility:5, push:3,  pressure:7 }, // Aurora
  38:  { roles:['Mage'],                  early:5,  mid:7,  late:8,  damage:8,  tankiness:3, cc:5,  mobility:4, push:3,  pressure:5 }, // Vexana
  46:  { roles:['Mage'],                  early:5,  mid:7,  late:8,  damage:8,  tankiness:3, cc:5,  mobility:5, push:5,  pressure:5 }, // Odette
  50:  { roles:['Mage'],                  early:5,  mid:7,  late:9,  damage:9,  tankiness:3, cc:5,  mobility:5, push:8,  pressure:7 }, // Zhask
  52:  { roles:['Mage'],                  early:5,  mid:7,  late:9,  damage:9,  tankiness:3, cc:5,  mobility:5, push:6,  pressure:7,  winRate:0.514, pickRate:0.065, banRate:0.072 }, // Pharsa
  57:  { roles:['Mage'],                  early:6,  mid:8,  late:8,  damage:9,  tankiness:3, cc:6,  mobility:5, push:4,  pressure:7 }, // Valir
  61:  { roles:['Mage'],                  early:4,  mid:7,  late:9,  damage:9,  tankiness:3, cc:4,  mobility:5, push:5,  pressure:6,  winRate:0.510, pickRate:0.055, banRate:0.045 }, // Chang'e
  66:  { roles:['Mage'],                  early:6,  mid:8,  late:8,  damage:9,  tankiness:3, cc:8,  mobility:6, push:4,  pressure:7,  winRate:0.517, pickRate:0.078, banRate:0.098 }, // Vale
  68:  { roles:['Mage'],                  early:5,  mid:8,  late:9,  damage:10, tankiness:4, cc:4,  mobility:6, push:4,  pressure:7,  winRate:0.521, pickRate:0.070, banRate:0.088 }, // Lunox
  86:  { roles:['Mage'],                  early:5,  mid:7,  late:9,  damage:9,  tankiness:3, cc:4,  mobility:5, push:4,  pressure:6,  winRate:0.516, pickRate:0.062, banRate:0.070 }, // Lylia
  91:  { roles:['Mage'],                  early:4,  mid:7,  late:10, damage:10, tankiness:3, cc:4,  mobility:5, push:4,  pressure:6,  winRate:0.514, pickRate:0.060, banRate:0.055 }, // Cecilion
  101: { roles:['Mage'],                  early:5,  mid:8,  late:9,  damage:9,  tankiness:3, cc:6,  mobility:4, push:6,  pressure:7 }, // Yve
  115: { roles:['Mage'],                  early:4,  mid:7,  late:9,  damage:10, tankiness:3, cc:4,  mobility:4, push:5,  pressure:7,  winRate:0.513, pickRate:0.068, banRate:0.075 }, // Xavier
  119: { roles:['Mage'],                  early:5,  mid:7,  late:9,  damage:9,  tankiness:3, cc:5,  mobility:5, push:4,  pressure:6 }, // Novaria
};

// ─── Default stats lookup ─────────────────────────────────────────────────────

export function getHeroStats(heroId: number): HeroStats {
  const explicit = HERO_STATS[heroId];
  if (explicit) return explicit;
  // Generate sensible defaults based on first role found
  const roles = ['Fighter']; // safe default
  const def   = ROLE_DEFAULTS['Fighter'];
  return { roles, ...def };
}

export function getDefaultsForRoles(roles: string[]): Omit<HeroStats, 'roles'> {
  const primary = roles[0] ?? 'Fighter';
  return ROLE_DEFAULTS[primary] ?? ROLE_DEFAULTS['Fighter'];
}

// ─── Hero pool used when API is completely offline ────────────────────────────
// Minimal flat list — the API normally replaces this at runtime.

export const FALLBACK_HERO_NAMES: string[] = [
  'Miya','Balmond','Saber','Alice','Nana','Tigreal','Alucard','Karina','Akai','Franco',
  'Bane','Bruno','Clint','Rafaela','Eudora','Zilong','Fanny','Layla','Minotaur','Lolita',
  'Hayabusa','Freya','Gord','Natalia','Kagura','Chou','Sun','Alpha','Ruby','Yi Sun-shin',
  'Moskov','Johnson','Cyclops','Estes','Hilda','Aurora','Lapu-Lapu','Vexana','Roger','Karrie',
  'Gatotkaca','Harley','Irithel','Grock','Argus','Odette','Lancelot','Diggie','Hylos','Zhask',
  'Helcurt','Pharsa','Lesley','Jawhead','Angela','Gusion','Valir','Martis','Uranus','Hanabi',
  "Chang'e",'Kaja','Selena','Aldous','Claude','Vale','Leomord','Lunox','Hanzo','Belerick',
  'Kimmy','Thamuz','Harith','Minsitthar','Kadita','Faramis','Badang','Khufra','Granger',
  'Guinevere','Esmeralda','Terizla','X.Borg','Ling','Dyrroth','Lylia','Baxia','Masha',
  'Wanwan','Silvanna','Cecilion','Carmilla','Atlas','Popol and Kupa','Yu Zhong','Luo Yi',
  'Benedetta','Khaleed','Barats','Brody','Yve','Mathilda','Paquito','Gloo','Beatrix',
  'Phoveus','Natan','Aulus','Aamon','Valentina','Edith','Floryn','Yin','Melissa','Xavier',
  'Julian','Fredrinn','Joy','Novaria','Arlott','Ixia','Nolan','Cici','Chip','Zhuxin',
  'Suyou','Lukas','Kalea','Zetian','Obsidia','Sora','Marcel',
];
