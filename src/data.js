// Every number on this site is copied from PAPER_NOTES.md section 8.15 (full pool, split by connection,
// FL-IDS repository) unless a tag says otherwise. Seeds are 42 / 43 / 44, in that order.

export const SEEDS = [42, 43, 44];

export const TAGS = {
  real3: 'measured · full pool · 3 seeds',
  real1: 'measured · full pool · seed 42 only',
  cfg: 'configuration, not a result',
  phaseB: 'measured · live replay · seed 42',
  std: 'measured · standalone classifier · all rows',
  schematic: 'schematic animation',
};

export const TEAM = [
  'Aaryan Prakash',
  'Aaron B Ajay',
  'Amal Roy',
  'Amogh Krishna J S',
];

export const TITLE = 'Federated Learning-based Intrusion Detection System for SDN-enabled IoT Networks';

export const LINKS = {
  repo: 'https://github.com/Aronnnn1/FL-IDS',
  oldSite: 'https://aronnnn1.github.io/FL-IDS/',
  report: 'downloads/FL-IDS_Project_Report.pdf',
  deck: 'downloads/FL-IDS_Review_Presentation.pdf',
};

export const DATASET = {
  rawRows: 2219201,
  usableRows: 1985768,
  features: 130,
  classes: 15,
  flows: 342814,
  calibration: [79866, 72803, 71853],
  clientPool: [1885587, 1885744, 1885673],
  testRows: '283,090 to 295,566',
};

// Real multi-process runs (1 server + 10 or 20 client processes, 20 rounds, no attackers).
export const RUNS = [
  { run: '10 clients · seed 42', phaseA: 1844, macro: 0.9958, micro: 0.9974, clf: 0.9970, pktFpr: 0.1275, flowFpr: 0.0034, test: 288416, noVal: 1 },
  { run: '10 clients · seed 43', phaseA: 1397, macro: 0.9947, micro: 0.9978, clf: 0.9971, pktFpr: 0.0884, flowFpr: 0.0074, test: 283090, noVal: 0 },
  { run: '10 clients · seed 44', phaseA: 1754, macro: 0.9939, micro: 0.9956, clf: 0.9954, pktFpr: 0.0248, flowFpr: 0.0039, test: 288366, noVal: 2 },
  { run: '20 clients · seed 42', phaseA: 1260, macro: 0.9981, micro: 0.9989, clf: 0.9981, pktFpr: 0.0588, flowFpr: 0.0104, test: 283427, noVal: 3 },
  { run: '20 clients · seed 43', phaseA: 1063, macro: 0.9970, micro: 0.9980, clf: 0.9974, pktFpr: 0.1628, flowFpr: 0.0076, test: 292222, noVal: 2 },
  { run: '20 clients · seed 44', phaseA: 1225, macro: 0.9972, micro: 0.9978, clf: 0.9972, pktFpr: 0.1089, flowFpr: 0.0081, test: 295566, noVal: 0 },
];

// Per-class recall by stage, 10 clients, seed 42.
export const PER_CLASS = [
  { cls: 'Backdoor', rows: 2263, clf: 0.9885, ae: 0.0367, cascade: 0.9929 },
  { cls: 'DDoS_HTTP', rows: 6915, clf: 0.9899, ae: 0.4807, cascade: 0.9899 },
  { cls: 'DDoS_ICMP', rows: 9520, clf: 1.0, ae: 0.3171, cascade: 1.0 },
  { cls: 'DDoS_TCP', rows: 6717, clf: 1.0, ae: 0.9394, cascade: 1.0 },
  { cls: 'DDoS_UDP', rows: 17755, clf: 0.9999, ae: 0.3063, cascade: 1.0 },
  { cls: 'Fingerprinting', rows: 129, clf: 0.9845, ae: 0.0698, cascade: 0.9922 },
  { cls: 'Password', rows: 7795, clf: 0.9913, ae: 0.2517, cascade: 0.9914 },
  { cls: 'Port_Scanning', rows: 2929, clf: 1.0, ae: 0.6842, cascade: 1.0 },
  { cls: 'Ransomware', rows: 691, clf: 0.9841, ae: 0.4877, cascade: 0.987 },
  { cls: 'SQL_injection', rows: 7228, clf: 0.999, ae: 0.8944, cascade: 0.9996 },
  { cls: 'Uploading', rows: 5567, clf: 0.9998, ae: 0.5493, cascade: 0.9998 },
  { cls: 'Vulnerability_scanner', rows: 7216, clf: 0.9946, ae: 0.5006, cascade: 0.9961 },
  { cls: 'XSS', rows: 2274, clf: 0.996, ae: 0.4714, cascade: 0.9969 },
];

// Poisoning sweep: sign-flip attackers, 10 clients. Values are [seed 42, 43, 44].
export const SWEEP = [
  { pct: 0, macro: [0.996, 0.996, 0.994], ae: [0.457, 0.492, 0.221], surv: null },
  { pct: 20, macro: [0.995, 0.996, 0.994], ae: [0.466, 0.483, 0.258], surv: [0.30, 0.40, 0.23] },
  { pct: 30, macro: [0.995, 0.997, 0.995], ae: [0.490, 0.373, 0.245], surv: [0.50, 0.55, 0.62] },
  { pct: 40, macro: [0.994, 0.994, 0.992], ae: [0.297, 0.139, 0.074], surv: [0.60, 0.64, 0.61] },
  { pct: 50, macro: [0.995, 0.990, 0.985], ae: [0.249, 0.0, 0.0], surv: [0.64, 1.0, 0.99] },
];

// Ablation at 30% sign-flip attackers.
export const ABLATION = [
  { v: 'Full pipeline', macro: [0.995, 0.997, 0.995], ae: [0.490, 0.373, 0.245], fpr: [0.1112, 0.0653, 0.0075] },
  { v: 'Autoencoder only', macro: [0.105, 0.073, 0.051], ae: [0.105, 0.073, 0.051], fpr: [0.0473, 0.0411, 0.0445] },
  { v: 'Classifier only', macro: [0.990, 0.989, 0.982], ae: null, fpr: [0.0001, 0.0001, 0.0003] },
  { v: 'Plain averaging (FedAvg)', macro: [0.992, 0.994, 0.990], ae: [0.013, 0.002, 0.092], fpr: [0.0947, 0.0301, 0.0301] },
  { v: 'Trimmed mean only', macro: [0.995, 0.995, 0.993], ae: [0.205, 0.0, 0.025], fpr: [0.1070, 0.0261, 0.0299] },
];

// Zero-day: each attack class held out in turn. [seed 42, 43, 44].
export const ZERO_DAY = [
  { cls: 'Backdoor', rows: 24167, cascade: [0.743, 0.998, 0.998], clf: [0.486, 0.996, 0.997], ae: [0.493, 0.550, 0.810] },
  { cls: 'DDoS_HTTP', rows: 49768, cascade: [0.879, 0.932, 0.885], clf: [0.695, 0.764, 0.719], ae: [0.572, 0.698, 0.560] },
  { cls: 'DDoS_ICMP', rows: 68758, cascade: [1.0, 1.0, 1.0], clf: [1.0, 1.0, 0.999], ae: [0.786, 0.802, 0.800] },
  { cls: 'DDoS_TCP', rows: 50062, cascade: [0.933, 0.953, 0.921], clf: [0.865, 0.921, 0.879], ae: [0.640, 0.686, 0.615] },
  { cls: 'DDoS_UDP', rows: 121567, cascade: [0.905, 0.803, 0.866], clf: [0.416, 0.021, 0.334], ae: [0.849, 0.799, 0.799] },
  { cls: 'Fingerprinting', rows: 872, cascade: [0.998, 0.998, 0.997], clf: [0.995, 0.994, 0.994], ae: [0.826, 0.747, 0.492] },
  { cls: 'MITM', rows: 406, cascade: [0.803, 1.0, 0.751], clf: [0.148, 0.200, 0.005], ae: [0.764, 1.0, 0.751] },
  { cls: 'Password', rows: 50033, cascade: [0.932, 0.935, 0.880], clf: [0.872, 0.865, 0.813], ae: [0.505, 0.407, 0.307] },
  { cls: 'Port_Scanning', rows: 20213, cascade: [0.999, 0.993, 0.992], clf: [0.998, 0.988, 0.989], ae: [0.570, 0.745, 0.409] },
  { cls: 'Ransomware', rows: 9885, cascade: [0.990, 0.994, 0.988], clf: [0.984, 0.990, 0.982], ae: [0.621, 0.753, 0.374] },
  { cls: 'SQL_injection', rows: 50981, cascade: [0.961, 0.970, 0.999], clf: [0.828, 0.713, 0.999], ae: [0.764, 0.871, 0.787] },
  { cls: 'Uploading', rows: 37243, cascade: [0.665, 0.652, 0.527], clf: [0.204, 0.266, 0.304], ae: [0.581, 0.512, 0.295] },
  { cls: 'Vulnerability_scanner', rows: 50044, cascade: [0.992, 0.993, 0.859], clf: [0.980, 0.894, 0.335], ae: [0.880, 0.976, 0.772] },
  { cls: 'XSS', rows: 15172, cascade: [0.943, 0.991, 0.867], clf: [0.823, 0.986, 0.767], ae: [0.680, 0.650, 0.483] },
];
export const ZERO_DAY_MEAN = {
  clf: [0.735, 0.757, 0.723],
  ae: [0.681, 0.728, 0.590],
  cascade: [0.910, 0.944, 0.895],
};

// Smarter (stealth) attacker vs the simple sign-flip attacker. Stealth is seed 42 only.
export const STEALTH = [
  { pct: 20, flip: [0.30, 0.40, 0.23], stealth: 0.60, flipAe: [0.466, 0.483, 0.258], stealthAe: 0.454, known: 0.9956 },
  { pct: 30, flip: [0.50, 0.55, 0.62], stealth: 0.73, flipAe: [0.490, 0.373, 0.245], stealthAe: 0.427, known: 0.9961 },
  { pct: 40, flip: [0.60, 0.64, 0.61], stealth: 0.80, flipAe: [0.297, 0.139, 0.074], stealthAe: 0.334, known: 0.9949 },
];

// Pruning during federated training, seed 42, no attackers.
export const PRUNING = [
  { sparsity: 0, weights: 9600, ae: 0.457, macro: 0.996, fpr: 0.1182 },
  { sparsity: 50, weights: 4800, ae: 0.439, macro: 0.995, fpr: 0.1400 },
  { sparsity: 70, weights: 2880, ae: 0.350, macro: 0.993, fpr: 0.1201 },
  { sparsity: 80, weights: 1920, ae: 0.338, macro: 0.993, fpr: 0.1451 },
  { sparsity: 90, weights: 960, ae: 0.198, macro: 0.993, fpr: 0.1151 },
];

export const CLIP = { clip10: [0.1292, 0.05736, 0.2644], noClip: 0.242 };

// Live replay of every attack capture (10 clients, seed 42).
export const PHASE_B = [
  { capture: 'Backdoor attack', cls: 'Backdoor', conf: 0.997, flagged: 24543, total: 24914, secs: 12 },
  { capture: 'DDoS HTTP Flood', cls: 'DDoS_HTTP', conf: 0.966, flagged: 119748, total: 229142, secs: 29 },
  { capture: 'DDoS ICMP Flood', cls: 'DDoS_ICMP', conf: 1.0, flagged: 2914156, total: 2914356, secs: 232 },
  { capture: 'DDoS TCP SYN Flood', cls: 'DDoS_TCP', conf: 0.999, flagged: 2020023, total: 2020152, secs: 211 },
  { capture: 'DDoS UDP Flood', cls: 'DDoS_UDP', conf: 0.999, flagged: 2899758, total: 3215732, secs: 268 },
  { capture: 'MITM ARP spoofing + DNS', cls: 'Ransomware', conf: 0.991, flagged: 542, total: 1229, secs: 8, wrong: true },
  { capture: 'OS Fingerprinting', cls: 'DDoS_ICMP', conf: 0.980, flagged: 1134, total: 1176, secs: 9, wrong: true },
  { capture: 'Password attacks', cls: 'Password', conf: 0.957, flagged: 919469, total: 1053893, secs: 130 },
  { capture: 'Port Scanning', cls: 'Port_Scanning', conf: 0.999, flagged: 22495, total: 23329, secs: 12 },
  { capture: 'Ransomware', cls: 'Ransomware', conf: 0.994, flagged: 10620, total: 11030, secs: 11 },
  { capture: 'SQL injection', cls: 'SQL_injection', conf: 1.0, flagged: 51097, total: 51228, secs: 17 },
  { capture: 'Uploading', cls: 'Uploading', conf: 0.999, flagged: 37592, total: 37644, secs: 15 },
  { capture: 'XSS', cls: 'XSS', conf: 0.999, flagged: 15677, total: 16215, secs: 12 },
  { capture: 'Vulnerability scanner', cls: 'Vulnerability_scanner', conf: 0.996, flagged: 262922, total: 265827, secs: 60, damaged: true },
];
export const DROP_RULE = 'priority=100,ip,nw_src=10.0.0.1 actions=drop';

export const fmt = (x, d = 3) => (x === null || x === undefined ? 'n/a' : Number(x).toFixed(d));
export const pct = (x, d = 1) => (x === null || x === undefined ? 'n/a' : `${(x * 100).toFixed(d)}%`);
export const int = (x) => Number(x).toLocaleString('en-US');
export const range = (arr, d = 3) => {
  const lo = Math.min(...arr);
  const hi = Math.max(...arr);
  return lo === hi ? fmt(lo, d) : `${fmt(lo, d)} to ${fmt(hi, d)}`;
};
export const mean = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
