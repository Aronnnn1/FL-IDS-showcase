import NetworkMap from './NetworkMap.jsx';
import { Tag, Stat, Marquee, DataTable, BarCell, GroupBars, SeedLines, PairColumns, LogBars, StageBars } from './ui.jsx';
import {
  TAGS, TEAM, TITLE, LINKS, DATASET, RUNS, PER_CLASS, SWEEP, ABLATION, ZERO_DAY, ZERO_DAY_MEAN, STEALTH, PRUNING, CLIP, PHASE_B,
  CLASS_SPLIT, STANDALONE, JOURNEY, JOURNEY_STAGES, LATENCY,
  fmt, pct, int, range, mean,
} from './data.js';

const SERIES3 = [{ name: 'seed 42', color: 'var(--accent)' }, { name: 'seed 43', color: 'var(--fg)' }, { name: 'seed 44', color: 'var(--dim)' }];

function Chip({ children }) { return <Tag>{children}</Tag>; }

export const SLIDES = [
  /* 1 ------------------------------------------------------------ title */
  {
    id: 'title',
    tone: 'coral',
    label: 'Title',
    render: ({ go }) => (
      <>
        <div className="row"><span className="tag" style={{ opacity: 1 }}>BMS College of Engineering · Department of Computer Science &amp; Engineering</span></div>
        <h1>{TITLE}</h1>
        <div className="team">{TEAM.map((t) => <span key={t}>{t}</span>)}</div>
        <Marquee items={['Federated', 'Private', 'Robust to cheaters', 'Two-stage detection', 'Software-defined']} />
        <div className="row">
          <button className="pill solid" onClick={() => go(1)}>Start the walkthrough</button>
          <a className="pill" href="#/results">All results</a>
          <a className="pill" href={LINKS.repo} target="_blank" rel="noreferrer">Source code</a>
        </div>
      </>
    ),
    detail: () => (
      <>
        <h3>About this site</h3>
        <p>An interactive walkthrough of a federated-learning intrusion detection system for IoT networks managed by software-defined networking. Slides are for presenting (arrow keys); the “All results” page holds every table for reading alone.</p>
        <ul>
          <li>Every number is copied from the project’s run logs and carries a small tag saying how it was measured.</li>
          <li>Animations are schematic. They show how data moves, not measured timings.</li>
          <li>Keys: ← → move, D opens this panel, Esc closes, F goes full screen.</li>
        </ul>
      </>
    ),
  },

  /* 2 ------------------------------------------------------------ problem */
  {
    id: 'problem',
    tone: 'ink',
    label: 'Problem',
    render: () => (
      <div className="split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2>Detect attacks on IoT networks without pooling the traffic.</h2>
          <p className="lede">Raw traffic should stay on the site that produced it. New attack types appear that a labelled classifier cannot name. A federated system can be poisoned by its own members. And a detection is only useful if it ends in enforcement.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          {[
            ['Boosting classifier', 'Names known attack types cheaply and decisively.'],
            ['Autoencoder', 'Flags traffic unlike normal, even for attacks it was never taught.'],
            ['Federated learning', 'Sites train together without sharing data (Flower).'],
            ['Trust filter', 'Screens updates so cheating sites cannot steer the model.'],
            ['SDN enforcement', 'Turns a verdict into a drop rule on a switch.'],
          ].map(([h, p]) => (
            <div className="stat" key={h}><h3>{h}</h3><div className="l">{p}</div></div>
          ))}
        </div>
      </div>
    ),
    detail: () => (
      <>
        <h3>How the five fit together</h3>
        <p>Each technique covers a gap the others leave. The classifier is fast and exact on known attacks; the autoencoder is the only part that can flag an unknown one; federated training lets sites learn from each other; the trust filter protects that training; SDN makes a detection stop traffic.</p>
        <p>Training happens first (Phase A, offline), then the trained models drive a live mitigation demo (Phase B). Keeping the two apart separates machine-learning correctness from networking problems.</p>
        <p className="note">Dataset: Edge-IIoTset. Federated learning: Flower. Network: Mininet, Open vSwitch, os-ken.</p>
      </>
    ),
  },

  /* 3 ------------------------------------------------------------ map */
  {
    id: 'map',
    tone: 'paper',
    label: 'The system',
    fill: true,
    render: ({ active }) => <NetworkMap active={active} />,
    detail: () => (
      <>
        <h3>Using the map</h3>
        <ul>
          <li>Pick one of four stories at the top: a training round, cheating sites caught, an attack caught and blocked, or a brand-new attack type.</li>
          <li>Use Previous / Next to step through while you talk, or let it loop. Change the cheater share, the recorded attack or the held-out attack type and the measured numbers on the right change with it.</li>
          <li>Click any dark box to zoom into that part and see what happens inside it.</li>
        </ul>
        <p className="note">The packets and arrows are schematic. The bars and numbers beside them are measured and tagged.</p>
      </>
    ),
  },

  /* 4 ------------------------------------------------------------ data */
  {
    id: 'data',
    tone: 'ink',
    label: 'Data',
    render: () => (
      <div className="split even">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2>All 1.99 million usable rows, split by connection.</h2>
          <p className="lede">Packets of one connection share most of their features, so putting some in training and some in testing would flatter the score. Here a connection stays whole: in one site, and in one of that site’s train, validation or test slices.</p>
          <div className="stats compact">
            <Stat value={int(DATASET.usableRows)} label="unique rows used (of 2,219,201)" tag={TAGS.cfg} accent />
            <Stat value={`${DATASET.features} · ${DATASET.classes}`} label="features · classes" tag={TAGS.cfg} />
            <Stat value={int(DATASET.flows)} label="connections" tag={TAGS.cfg} />
          </div>
          <div className="callout"><p>5% of rows (about 72 to 80 thousand, by seed) stay on the server with labels to start the classifier. The other ~1.89 million rows are shared among 10 or 20 sites.</p></div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h3>Class split of the data the system trains on</h3>
          <LogBars items={CLASS_SPLIT.map((c) => ({ label: c.cls.replace('Vulnerability_scanner', 'Vuln_scanner'), value: c.rows }))} width={620} rowH={19} labelW={118} />
          <Tag>{TAGS.cfg}</Tag>
        </div>
      </div>
    ),
    detail: () => (
      <>
        <h3>Per-seed split sizes</h3>
        <DataTable
          columns={[{ key: 's', label: 'Seed' }, { key: 'c', label: 'Calibration rows', num: true }, { key: 'p', label: 'Site pool rows', num: true }]}
          rows={[42, 43, 44].map((s, i) => ({ s, c: int(DATASET.calibration[i]), p: int(DATASET.clientPool[i]) }))}
          caption={`Test slices per run: ${DATASET.testRows} rows. 24 connections (655 rows) carry two labels and are split per label.`}
        />
        <Tag>{TAGS.real3}</Tag>
        <p>Normal traffic is 72% of the rows (1,436,597); the 14 attack types share the other 549,171. MITM has 406 rows and one connection; Fingerprinting 872. The standalone classifier trained on all rows used {int(STANDALONE.train)} rows for training, {int(STANDALONE.val)} for early stopping and {int(STANDALONE.test)} for testing, split by connection.</p>
        <p>Packets are grouped into connections in capture order, with a new connection after 60 s idle or 120 s active. The 130 features are the original 91 plus the service port, 18 content features and 20 connection features. IP addresses, timestamps, ephemeral ports and row order are never used as features.</p>
      </>
    ),
  },

  /* 5 ------------------------------------------------------------ known attacks */
  {
    id: 'known',
    tone: 'coral',
    label: 'Known attacks',
    render: () => (
      <div className="split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2>Known attacks are caught about 99.6% of the time.</h2>
          <p className="lede">Across six real runs (10 and 20 sites, three seeds) the cascade caught 99.56% to 99.89% of attack packets on held-out connections, not just held-out packets.</p>
          <div className="stats">
            <Stat value="99.56–99.89%" label="attack packets caught (micro recall)" tag={TAGS.real3} />
            <Stat value="0.994–0.998" label="average over 13 attack types (macro recall)" tag={TAGS.real3} />
          </div>
        </div>
        <div>
          <GroupBars
            groups={RUNS.map((r) => ({ label: r.run.replace(' clients', 'c').replace(' · seed ', ' s'), values: [r.micro] }))}
            series={[{ name: 'micro', color: 'var(--accent)' }]} min={0.99} max={1} labelW={110} rowH={26}
            fmtv={(v) => fmt(v, 4)}
          />
          <p className="note" style={{ marginTop: 6 }}>Axis starts at 0.99. Micro recall per run. <Tag>{TAGS.real3}</Tag></p>
        </div>
      </div>
    ),
    detail: () => (
      <>
        <h3>Recall by attack type</h3>
        <p className="note">10 clients, seed 42. The classifier does almost all of the work on known attacks; the autoencoder is a backstop.</p>
        <DataTable
          columns={[
            { key: 'cls', label: 'Attack type' },
            { key: 'rows', label: 'Test rows', num: true, render: (r) => int(r.rows) },
            { key: 'clf', label: 'Classifier', render: (r) => <BarCell value={r.clf} digits={4} /> },
            { key: 'ae', label: 'Autoencoder', render: (r) => <BarCell value={r.ae} digits={4} /> },
            { key: 'cascade', label: 'Cascade', render: (r) => <BarCell value={r.cascade} digits={4} /> },
          ]}
          rows={PER_CLASS}
        />
        <Tag>measured · full pool · seed 42</Tag>
        <p className="note">MITM is absent here by construction (see the Data slide). Macro recall averages the 13 attack types present in the test slices.</p>
      </>
    ),
  },

  /* 6 ------------------------------------------------------------ false alarms */
  {
    id: 'alarms',
    tone: 'ink',
    label: 'False alarms',
    render: () => (
      <div className="split even">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2>False alarms depend on how you count.</h2>
          <p className="lede">Counted per packet, 2.5% to 16.3% of normal packets are flagged. Counted per connection, it is 0.34% to 1.04%. A few very long normal connections (7,000 to 11,800 packets each) are flagged as a block and dominate the packet count.</p>
          <div className="callout"><p>In five of six runs, 80% to 94% of false-alarm packets come from the ten largest connections. The median site sits at 2.9% to 3.2%. Quote both numbers.</p></div>
          <Tag>{TAGS.real3}</Tag>
        </div>
        <PairColumns
          items={RUNS.map((r) => ({ label: r.run.replace(' clients · seed ', 'c·s'), a: r.pktFpr, b: r.flowFpr }))}
          aName="per packet" bName="per connection" aColor="var(--accent)" bColor="var(--fg)" unit="%"
        />
      </div>
    ),
    detail: () => (
      <>
        <h3>False alarms per run</h3>
        <DataTable
          columns={[
            { key: 'run', label: 'Run' },
            { key: 'p', label: 'Per packet', num: true, render: (r) => pct(r.pktFpr, 2) },
            { key: 'f', label: 'Per connection', num: true, render: (r) => pct(r.flowFpr, 2) },
            { key: 'nv', label: 'Sites without normal validation rows', num: true, render: (r) => r.noVal },
          ]}
          rows={RUNS}
        />
        <Tag>{TAGS.real3}</Tag>
        <p>A site with no normal validation rows has an infinite threshold, so its autoencoder never flags anything. That is reported, not hidden.</p>
      </>
    ),
  },

  /* 7 ------------------------------------------------------------ poisoning */
  {
    id: 'poison',
    tone: 'paper',
    label: 'Cheating sites',
    render: () => (
      <div className="split even">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2>Cheating sites are filtered, but not perfectly.</h2>
          <p className="lede">With 30% sign-flip cheaters the full pipeline keeps the autoencoder usable (recall 0.490 / 0.373 / 0.245), while plain averaging collapses (0.013 / 0.002 / 0.092). Known-attack recall barely moves up to 50% cheaters.</p>
          <div className="callout"><p>At full scale the filter lets more poisoned updates through than in smaller earlier runs (0.50 / 0.55 / 0.62 survive at 30%). Why is not established.</p></div>
          <Tag>{TAGS.real3}</Tag>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3>Share of poisoned updates that got through</h3>
          <SeedLines points={SWEEP.filter((s) => s.surv).map((s) => ({ x: s.pct, v: s.surv }))} yLabel="survival" height={210} />
          <h3>Autoencoder recall on known attacks</h3>
          <SeedLines points={SWEEP.map((s) => ({ x: s.pct, v: s.ae }))} yLabel="recall" height={210} />
        </div>
      </div>
    ),
    detail: () => (
      <>
        <h3>Poisoning sweep and ablation</h3>
        <DataTable
          columns={[
            { key: 'pct', label: 'Cheaters', render: (r) => `${r.pct}%` },
            { key: 'macro', label: 'Known-attack macro recall', render: (r) => r.macro.map((v) => fmt(v, 3)).join(' / ') },
            { key: 'ae', label: 'Autoencoder recall', render: (r) => r.ae.map((v) => fmt(v, 3)).join(' / ') },
            { key: 'surv', label: 'Cheaters through', render: (r) => (r.surv ? r.surv.map((v) => fmt(v, 2)).join(' / ') : 'n/a') },
          ]}
          rows={SWEEP}
          caption="Values are seeds 42 / 43 / 44. Ten sites, sign-flip attackers, 20 rounds."
        />
        <h3 style={{ marginTop: 18 }}>At 30%: what each part contributes</h3>
        <DataTable
          columns={[
            { key: 'v', label: 'Variant' },
            { key: 'macro', label: 'Macro recall', render: (r) => r.macro.map((v) => fmt(v, 3)).join(' / ') },
            { key: 'ae', label: 'Autoencoder', render: (r) => (r.ae ? r.ae.map((v) => fmt(v, 3)).join(' / ') : 'n/a') },
          ]}
          rows={ABLATION}
        />
        <Tag>{TAGS.real3}</Tag>
        <p className="note">Three seeds with wide ranges: no interval is claimed.</p>
      </>
    ),
  },

  /* 8 ------------------------------------------------------------ zero-day */
  {
    id: 'zero',
    tone: 'coral',
    label: 'New attacks',
    render: () => (
      <div className="split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2>An attack nobody labelled is caught 90% to 94% of the time.</h2>
          <p className="lede">Each attack type was held out of training in turn, then every one of its rows was scored. The two stages together beat either alone.</p>
          <div className="stats compact">
            <Stat value={range(ZERO_DAY_MEAN.cascade, 3).replace(' to ', '–')} label="cascade, mean over 14 types, by seed" tag={TAGS.real3} />
            <Stat value={range(ZERO_DAY_MEAN.clf, 2).replace(' to ', '–')} label="classifier alone" tag={TAGS.real3} />
            <Stat value={range(ZERO_DAY_MEAN.ae, 2).replace(' to ', '–')} label="autoencoder alone" tag={TAGS.real3} />
          </div>
          <p className="note">Weakest: Uploading (0.527 to 0.665). MITM ranges 0.751 to 1.000 because it is one connection.</p>
        </div>
        <GroupBars
          groups={ZERO_DAY.map((z) => ({ label: z.cls.replace('Vulnerability_scanner', 'Vuln_scanner'), values: [mean(z.clf), mean(z.ae), mean(z.cascade)] }))}
          series={[{ name: 'classifier alone', color: 'var(--dim)' }, { name: 'autoencoder alone', color: 'var(--fg)' }, { name: 'cascade', color: 'var(--accent)' }]}
          labelW={130} rowH={24}
        />
      </div>
    ),
    detail: () => (
      <>
        <h3>Per held-out type</h3>
        <p className="note">Seeds 42 / 43 / 44. Bars on the slide are the mean of the three seeds.</p>
        <DataTable
          columns={[
            { key: 'cls', label: 'Held out' },
            { key: 'rows', label: 'Rows scored', num: true, render: (r) => int(r.rows) },
            { key: 'cascade', label: 'Cascade', render: (r) => r.cascade.map((v) => fmt(v, 3)).join(' / ') },
            { key: 'clf', label: 'Classifier', render: (r) => r.clf.map((v) => fmt(v, 3)).join(' / ') },
            { key: 'ae', label: 'Autoencoder', render: (r) => r.ae.map((v) => fmt(v, 3)).join(' / ') },
          ]}
          rows={ZERO_DAY}
        />
        <Tag>{TAGS.real3}</Tag>
      </>
    ),
  },

  /* 9 ------------------------------------------------------------ stronger attackers + pruning */
  {
    id: 'stress',
    tone: 'ink',
    label: 'Stress tests',
    render: () => (
      <div className="split even">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2>A smarter attacker, and a smaller model.</h2>
          <p className="lede">A stealth attacker that disguises its updates gets through more often than a simple sign-flip one: 0.60 / 0.73 / 0.80 of its updates survive at 20 / 30 / 40%, against 0.30 / 0.50 / 0.60. Known-attack recall stays at 0.995 to 0.996.</p>
          <p className="lede">Pruning the autoencoder during training keeps known-attack recall at 0.993 even with 90% of weights removed, but its own recall as a backstop falls from 0.457 to 0.198.</p>
          <Tag>{TAGS.real1}</Tag>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3>Poisoned updates that got through (seed 42)</h3>
          <GroupBars
            groups={STEALTH.map((s) => ({ label: `${s.pct}% cheaters`, values: [s.flip[0], s.stealth] }))}
            series={[{ name: 'sign-flip', color: 'var(--dim)' }, { name: 'stealth', color: 'var(--accent)' }]} labelW={120} rowH={30}
          />
          <h3>Autoencoder recall as weights are pruned (seed 42)</h3>
          <GroupBars
            groups={PRUNING.map((p) => ({ label: `${p.sparsity}% pruned`, values: [p.ae] }))}
            series={[{ name: 'recall', color: 'var(--accent)' }]} labelW={120} rowH={22}
          />
        </div>
      </div>
    ),
    detail: () => (
      <>
        <h3>Pruning during training</h3>
        <DataTable
          columns={[
            { key: 'sparsity', label: 'Pruned', render: (r) => `${r.sparsity}%` },
            { key: 'weights', label: 'Weights left', num: true, render: (r) => int(r.weights) },
            { key: 'ae', label: 'Autoencoder recall', num: true, render: (r) => fmt(r.ae, 3) },
            { key: 'macro', label: 'Macro recall', num: true, render: (r) => fmt(r.macro, 3) },
            { key: 'fpr', label: 'Packet false alarms', num: true, render: (r) => pct(r.fpr, 1) },
          ]}
          rows={PRUNING}
        />
        <p className="note">Pruning after training is much worse: autoencoder recall 0.461 falls to 0.098 at 70%.</p>
        <h3 style={{ marginTop: 18 }}>Clipping each site’s scaled features</h3>
        <p>Final autoencoder loss with clipping at ±10: {CLIP.clip10.map((v) => fmt(v, 4)).join(' / ')} (seeds 42 / 43 / 44). Without clipping, seed 42: {fmt(CLIP.noClip, 3)}, about 1.9 times worse.</p>
        <p className="note">Stealth, pruning and clipping were run at seed 42 only (clip at three seeds with clipping, one without). Repeats at seeds 43 and 44 are planned.</p>
        <Tag>{TAGS.real1}</Tag>
      </>
    ),
  },

  /* 10 ----------------------------------------------------------- live demo */
  {
    id: 'live',
    tone: 'paper',
    label: 'Live replay',
    render: () => (
      <div className="split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2>All 14 recorded attacks were blocked at the switch.</h2>
          <p className="lede">Each recording was replayed into a Mininet switch; the cascade named it and the controller installed a drop rule, read back from the switch. 12 of 14 were named correctly.</p>
          <div className="callout"><p>The MITM recording was called Ransomware (0.991) and OS fingerprinting was called DDoS_ICMP (0.980). Both were still blocked. These are the dataset’s own recordings, so this is a demonstration, not a test on unseen traffic.</p></div>
          <Tag>{TAGS.phaseB}</Tag>
        </div>
        <div style={{ maxHeight: '100%', overflowY: 'auto' }}>
          <DataTable
            columns={[
              { key: 'capture', label: 'Recording', render: (r) => r.capture },
              { key: 'cls', label: 'Named', render: (r) => <span className={r.wrong ? 'bad' : ''}>{r.cls}</span> },
              { key: 'conf', label: 'Confidence', num: true, render: (r) => fmt(r.conf, 3) },
              { key: 'flag', label: 'Flagged', render: (r) => <BarCell value={r.flagged / r.total} max={1} digits={2} /> },
            ]}
            rows={PHASE_B}
          />
        </div>
      </div>
    ),
    detail: () => (
      <>
        <h3>Replay details</h3>
        <DataTable
          columns={[
            { key: 'capture', label: 'Recording' },
            { key: 'f', label: 'Packets flagged', num: true, render: (r) => `${int(r.flagged)} / ${int(r.total)}` },
            { key: 's', label: 'Seconds', num: true, render: (r) => r.secs },
          ]}
          rows={PHASE_B}
        />
        <p className="note">Decision for every recording: block. Rule read back each time: priority=100,ip,nw_src=10.0.0.1 actions=drop. The released Vulnerability-scanner capture is damaged, so only its readable first 265,827 packets were replayed. Largest replay: DDoS UDP, 3.2 million packets in 268 s.</p>
        <Tag>{TAGS.phaseB}</Tag>
      </>
    ),
  },

  /* 10b ---------------------------------------------------------- speed */
  {
    id: 'speed',
    tone: 'coral',
    label: 'Speed',
    render: () => (
      <div className="split even">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2>Training takes minutes. Deciding on a packet takes under a millisecond.</h2>
          <p className="lede">The first classifier, including the data split, is ready in 17 seconds. The 20 federated rounds take 15 to 27 minutes, and a whole run with evaluation 18 to 31.</p>
          <StageBars runs={JOURNEY} stages={JOURNEY_STAGES} width={620} labelW={118} />
          <Tag>measured · full pool · 3 seeds · some runs overlapped other jobs</Tag>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3>Time to decide on one packet</h3>
          <div className="stats compact">
            <Stat value={`${fmt(LATENCY.single.cascade.median, 2)} ms`} label="both stages, one packet, median" tag="measured · 1 CPU thread" accent />
            <Stat value={`${fmt(LATENCY.single.classifier.median, 2)} ms`} label="classifier stage alone" tag="measured · 1 CPU thread" />
            <Stat value={`${fmt(LATENCY.single.autoencoder.median, 2)} ms`} label="autoencoder stage alone" tag="measured · 1 CPU thread" />
          </div>
          <GroupBars
            groups={[
              { label: 'Classifier', values: [LATENCY.single.classifier.p99] },
              { label: 'Autoencoder', values: [LATENCY.single.autoencoder.p99] },
              { label: 'Both stages', values: [LATENCY.single.cascade.p99] },
            ]}
            series={[{ name: '99th percentile (ms)', color: 'var(--accent)' }]} max={1} labelW={110} rowH={26} fmtv={(v) => `${fmt(v, 2)} ms`}
          />
          <p className="note">99 of 100 packets were decided within the length of the bar. Model time only: it leaves out reading the capture, extracting features with tshark and the switch. In a batch, one CPU thread decides about 3,800 packets a second.</p>
          <div className="callout"><p>The live demo is not inline. It extracts features from the whole recording first, then decides. Averaged over a whole replay, the DDoS UDP recording took 83 microseconds a packet from start to finish, but no single packet was blocked in real time.</p></div>
        </div>
      </div>
    ),
    detail: () => (
      <>
        <h3>How these times were measured</h3>
        <DataTable
          columns={[
            { key: 'm', label: 'Stage' },
            { key: 'a', label: 'One packet, median (ms)', num: true },
            { key: 'b', label: '95th (ms)', num: true },
            { key: 'c', label: '99th (ms)', num: true },
            { key: 'd', label: 'Batch (packets/s)', num: true },
          ]}
          rows={[['Classifier', 'classifier'], ['Autoencoder', 'autoencoder'], ['Both stages', 'cascade']].map(([m, k]) => ({
            m, a: fmt(LATENCY.single[k].median, 3), b: fmt(LATENCY.single[k].p95, 3), c: fmt(LATENCY.single[k].p99, 3), d: int(LATENCY.batch[k].perSec),
          }))}
        />
        <p className="note">Saved 10-client seed-42 model, 3,000 held-out packets timed one call each, then one batch of 200,000 packets, on one thread of the VM’s Intel Xeon. The classifier dominates the cost; the autoencoder adds about 0.06 ms.</p>
        <h3 style={{ marginTop: 18 }}>Time by stage of each run (seconds)</h3>
        <DataTable
          columns={[{ key: 'run', label: 'Run' }, ...JOURNEY_STAGES.map((st, k) => ({ key: `s${k}`, label: st, num: true })), { key: 't', label: 'Total', num: true }]}
          rows={JOURNEY.map((r) => ({ run: r.run, ...Object.fromEntries(r.s.map((v, k) => [`s${k}`, v])), t: r.total }))}
        />
        <p className="note">The standalone classifier on all rows (split by connection) trained in {STANDALONE.trainSeconds} seconds, stopping at tree {STANDALONE.iterations}: {pct(STANDALONE.accuracy, 2)} accuracy, macro F1 {fmt(STANDALONE.macroF1, 3)}. In the live demo the whole-capture average is 83 µs a packet for DDoS UDP (268 s for 3,215,732 packets), 80 µs for DDoS ICMP and 104 µs for DDoS TCP, derived from the wall times in the replay table.</p>
        <Tag>{TAGS.real3}</Tag>
      </>
    ),
  },

  // Limitations slide hidden for now. The same text stays on the Results page.
  // To bring it back, delete the opening and closing comment markers around it; slides renumber on their own.
  /*
  {
    id: 'limits',
    tone: 'ink',
    label: 'Limitations',
    render: () => (
      <div className="split">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2>What this does not show.</h2>
          <p className="lede">Results are only as strong as their evidence. These are the limits we know of.</p>
        </div>
        <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: '62ch' }}>
          <li>The autoencoder backstop, unseen-attack detection and the trust filter are weaker at full scale than in earlier, smaller runs. The cause is not established.</li>
          <li>Per-packet false alarms reach 16%; per-connection they are about 1%. Always report both.</li>
          <li>MITM is a single connection, so it is scored only by the unseen-attack test and the live replay.</li>
          <li>Stealth, pruning and clip results are single-seed (42). Main results use seeds 42, 43 and 44 with no intervals.</li>
          <li>The live replay uses the dataset’s own recordings, one of which is damaged. It is a demonstration, not a held-out test.</li>
          <li>One dataset, no split by capture file, no inline streaming mitigation yet.</li>
        </ul>
      </div>
    ),
    detail: () => (
      <>
        <h3>Not yet done</h3>
        <ul>
          <li>Stealth, pruning and clip at seeds 43 and 44.</li>
          <li>Unseen-attack detection under the stealth attacker and for pruned models.</li>
          <li>Inline, streaming mitigation instead of replayed captures.</li>
          <li>A second dataset, and a split by capture file.</li>
        </ul>
        <p className="note">The full list, with run provenance, is in PAPER_NOTES.md in the repository.</p>
      </>
    ),
  },
  */

  /* end ----------------------------------------------------------- end */
  {
    id: 'end',
    tone: 'coral',
    label: 'Resources',
    render: () => (
      <>
        <h2>Read it, run it, download it.</h2>
        <div className="row">
          <a className="pill solid" href={LINKS.report} target="_blank" rel="noreferrer">Project report (PDF)</a>
          <a className="pill solid" href={LINKS.deck} target="_blank" rel="noreferrer">Presentation (PDF)</a>
          <a className="pill solid" href="downloads/FL-IDS_PP2_Presentation.pptx" target="_blank" rel="noreferrer">Presentation (PPTX)</a>
          <a className="pill" href="#/results">All results</a>
          <a className="pill" href={LINKS.repo} target="_blank" rel="noreferrer">GitHub repository</a>
          <a className="pill" href={LINKS.oldSite} target="_blank" rel="noreferrer">Original results site</a>
        </div>
        <Marquee items={['Aaryan Prakash', 'Aaron B Ajay', 'Amal Roy', 'Amogh Krishna J S']} />
        <p className="lede">Department of Computer Science &amp; Engineering, BMS College of Engineering.</p>
      </>
    ),
    detail: () => (
      <>
        <h3>Reproducing the results</h3>
        <p>The repository holds the code, configurations, run logs and PAPER_NOTES.md, which records every experiment with its provenance. Every number on this site comes from its section 8.15.</p>
      </>
    ),
  },
];
