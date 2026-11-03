import { DataTable, BarCell, GroupBars, SeedLines, PairColumns, Tag, Stat, LogBars, StageBars } from './ui.jsx';
import {
  TAGS, DATASET, RUNS, PER_CLASS, SWEEP, ABLATION, ZERO_DAY, ZERO_DAY_MEAN, STEALTH, PRUNING, CLIP, PHASE_B, LINKS,
  CLASS_SPLIT, STANDALONE, JOURNEY, JOURNEY_STAGES, LATENCY,
  fmt, pct, int, mean,
} from './data.js';

const seeds3 = (arr, d = 3) => (arr ? arr.map((v) => fmt(v, d)).join(' / ') : 'n/a');

const SECTIONS = [
  ['data', 'Data and splits'],
  ['runs', 'Real runs'],
  ['speed', 'Speed'],
  ['perclass', 'Per attack type'],
  ['alarms', 'False alarms'],
  ['poison', 'Poisoning'],
  ['zero', 'New attacks'],
  ['stress', 'Stress tests'],
  ['live', 'Live replay'],
  ['limits', 'Limitations'],
];

function Panel({ id, title, tag, light, children }) {
  return (
    <section id={id} className={`panel${light ? ' light' : ''}`}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h2>{title}</h2>
        {tag && <Tag>{tag}</Tag>}
      </div>
      {children}
    </section>
  );
}

export default function Results() {
  return (
    <main className="page">
      <div className="page-inner">
        <header className="page-head">
          <h1>Every measured result.</h1>
          <p className="lede" style={{ color: 'var(--ink)', maxWidth: '64ch' }}>
            Full pool (1,985,768 unique rows), split by connection. Seeds are 42 / 43 / 44 in that order. Each table carries a tag that says how its numbers were measured.
            Source: PAPER_NOTES.md section 8.15 in the <a href={LINKS.repo} target="_blank" rel="noreferrer">repository</a>.
          </p>
          <div className="toc">
            {SECTIONS.map(([id, t]) => <a key={id} className="pill" href={`#/results`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }}>{t}</a>)}
          </div>
        </header>

        <Panel id="data" title="Data and splits" tag={TAGS.cfg}>
          <div className="stats">
            <Stat value={int(DATASET.rawRows)} label="rows in Edge-IIoTset" />
            <Stat value={int(DATASET.usableRows)} label="unique rows used" accent />
            <Stat value={DATASET.features} label="features" />
            <Stat value={DATASET.classes} label="classes" />
            <Stat value={int(DATASET.flows)} label="connections" />
          </div>
          <DataTable
            columns={[{ key: 's', label: 'Seed' }, { key: 'c', label: 'Server calibration rows', num: true }, { key: 'p', label: 'Rows shared among sites', num: true }]}
            rows={[42, 43, 44].map((s, i) => ({ s, c: int(DATASET.calibration[i]), p: int(DATASET.clientPool[i]) }))}
            caption={`Per-site test slices hold ${DATASET.testRows} rows per run. A connection stays whole in the calibration set, in exactly one site, and in exactly one of that site's train, normal-validation or test slices. MITM (406 rows) is one connection and goes wholly to the calibration set.`}
          />
        </Panel>

        <Panel id="runs" title="Real multi-process runs" tag={TAGS.real3} light>
          <p className="note">One server process and 10 or 20 site processes, 20 rounds, no attackers. Macro recall averages the attack types present in the test slices.</p>
          <DataTable
            columns={[
              { key: 'run', label: 'Run' },
              { key: 'macro', label: 'Macro recall', num: true, render: (r) => fmt(r.macro, 4) },
              { key: 'micro', label: 'Micro recall', num: true, render: (r) => fmt(r.micro, 4) },
              { key: 'clf', label: 'Classifier alone', num: true, render: (r) => fmt(r.clf, 4) },
              { key: 'p', label: 'False alarms, packets', num: true, render: (r) => pct(r.pktFpr, 2) },
              { key: 'f', label: 'False alarms, connections', num: true, render: (r) => pct(r.flowFpr, 2) },
              { key: 't', label: 'Test rows', num: true, render: (r) => int(r.test) },
              { key: 'a', label: 'Phase A (s)', num: true, render: (r) => int(r.phaseA) },
            ]}
            rows={RUNS}
          />
        </Panel>

        <Panel id="speed" title="Training time and time to decide on a packet" tag={TAGS.real3}>
          <div className="two">
            <div>
              <h3 style={{ marginBottom: 8 }}>Class split of the training data</h3>
              <LogBars items={CLASS_SPLIT.map((c) => ({ label: c.cls.replace('Vulnerability_scanner', 'Vuln_scanner'), value: c.rows }))} width={620} rowH={19} labelW={118} />
            </div>
            <div>
              <h3 style={{ marginBottom: 8 }}>Time of each stage of each run</h3>
              <StageBars runs={JOURNEY} stages={JOURNEY_STAGES} width={620} labelW={118} />
            </div>
          </div>
          <DataTable
            columns={[{ key: 'run', label: 'Run' }, ...JOURNEY_STAGES.map((st, k) => ({ key: `s${k}`, label: st, num: true })), { key: 't', label: 'Total (s)', num: true }]}
            rows={JOURNEY.map((rr) => ({ run: rr.run, ...Object.fromEntries(rr.s.map((v, k) => [`s${k}`, v])), t: rr.total }))}
            caption={`The standalone classifier on all rows, split by connection, trained in ${STANDALONE.trainSeconds} s (${int(STANDALONE.train)} training rows, ${int(STANDALONE.val)} for early stopping, ${int(STANDALONE.test)} for testing). Some runs overlapped other jobs on the VM, so these times are upper bounds.`}
          />
          <h3>Time to decide on one packet</h3>
          <DataTable
            columns={[
              { key: 'm', label: 'Stage' },
              { key: 'a', label: 'One packet, median (ms)', num: true },
              { key: 'b', label: '95th (ms)', num: true },
              { key: 'c', label: '99th (ms)', num: true },
              { key: 'd', label: 'Batch of 200,000 (packets/s)', num: true },
            ]}
            rows={[['Classifier', 'classifier'], ['Autoencoder', 'autoencoder'], ['Both stages', 'cascade']].map(([m, k]) => ({
              m, a: fmt(LATENCY.single[k].median, 3), b: fmt(LATENCY.single[k].p95, 3), c: fmt(LATENCY.single[k].p99, 3), d: int(LATENCY.batch[k].perSec),
            }))}
            caption="Measured on the saved 10-client seed-42 model with 3,000 held-out packets timed one call each, on one CPU thread of the VM (tools/latency_benchmark.py). Model time only: it excludes reading the capture, tshark feature extraction and the switch. The live demo classifies a whole capture after extracting its features, so it does not block packets inline; averaged over a whole replay it took 83 µs a packet for DDoS UDP, 80 for DDoS ICMP and 104 for DDoS TCP (wall time divided by packets)."
          />
        </Panel>

        <Panel id="perclass" title="Recall by attack type, by stage" tag="measured · full pool · 10 clients · seed 42">
          <DataTable
            columns={[
              { key: 'cls', label: 'Attack type' },
              { key: 'rows', label: 'Test rows', num: true, render: (r) => int(r.rows) },
              { key: 'clf', label: 'Classifier alone', render: (r) => <BarCell value={r.clf} digits={4} /> },
              { key: 'ae', label: 'Autoencoder alone', render: (r) => <BarCell value={r.ae} digits={4} /> },
              { key: 'cascade', label: 'Cascade', render: (r) => <BarCell value={r.cascade} digits={4} /> },
            ]}
            rows={PER_CLASS}
          />
        </Panel>

        <Panel id="alarms" title="False alarms: per packet and per connection" tag={TAGS.real3} light>
          <div className="two">
            <PairColumns
              items={RUNS.map((r) => ({ label: r.run.replace(' clients · seed ', 'c·s'), a: r.pktFpr, b: r.flowFpr }))}
              aName="per packet" bName="per connection" aColor="var(--accent)" bColor="var(--fg)" unit="%"
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p>Per packet: 2.5% to 16.3% of normal test packets flagged. Per connection: 0.34% to 1.04%. The median site is at 2.9% to 3.2% in all six runs.</p>
              <p>A few very long normal connections (7,000 to 11,800 packets each) are flagged as a block. In five of six runs, 80% to 94% of false-alarm packets come from the ten largest connections; in the sixth it is 52%.</p>
              <p className="note">Report both numbers. Quoting 3% for the whole test set would be wrong.</p>
            </div>
          </div>
        </Panel>

        <Panel id="poison" title="Poisoning: sign-flip cheaters, 10 sites" tag={TAGS.real3}>
          <div className="two">
            <div><h3 style={{ marginBottom: 8 }}>Share of poisoned updates that got through</h3><SeedLines points={SWEEP.filter((s) => s.surv).map((s) => ({ x: s.pct, v: s.surv }))} yLabel="survival" /></div>
            <div><h3 style={{ marginBottom: 8 }}>Autoencoder recall on known attacks</h3><SeedLines points={SWEEP.map((s) => ({ x: s.pct, v: s.ae }))} yLabel="recall" /></div>
          </div>
          <DataTable
            columns={[
              { key: 'pct', label: 'Cheaters', render: (r) => `${r.pct}%` },
              { key: 'macro', label: 'Known-attack macro recall', render: (r) => seeds3(r.macro) },
              { key: 'ae', label: 'Autoencoder alone', render: (r) => seeds3(r.ae) },
              { key: 'surv', label: 'Cheaters through', render: (r) => (r.surv ? seeds3(r.surv, 2) : 'n/a') },
            ]}
            rows={SWEEP}
          />
          <h3>Ablation at 30% cheaters</h3>
          <DataTable
            columns={[
              { key: 'v', label: 'Variant' },
              { key: 'macro', label: 'Known-attack macro recall', render: (r) => seeds3(r.macro) },
              { key: 'ae', label: 'Autoencoder alone', render: (r) => seeds3(r.ae) },
              { key: 'fpr', label: 'False alarms, packets', render: (r) => seeds3(r.fpr, 4) },
            ]}
            rows={ABLATION}
            caption="The full-pipeline row is the sweep's 30% point; it was not trained twice. Three seeds with wide ranges: no interval is claimed. The trust filter lets more cheaters through at full scale than in earlier smaller runs; why is not established."
          />
        </Panel>

        <Panel id="zero" title="New attack types: leave one class out" tag={TAGS.real3} light>
          <div className="stats">
            <Stat value={seeds3(ZERO_DAY_MEAN.cascade)} label="cascade, mean over 14 held-out types" accent />
            <Stat value={seeds3(ZERO_DAY_MEAN.clf)} label="classifier alone" />
            <Stat value={seeds3(ZERO_DAY_MEAN.ae)} label="autoencoder alone" />
          </div>
          <GroupBars
            groups={ZERO_DAY.map((z) => ({ label: z.cls.replace('Vulnerability_scanner', 'Vuln_scanner'), values: [mean(z.clf), mean(z.ae), mean(z.cascade)] }))}
            series={[{ name: 'classifier alone', color: 'var(--dim)' }, { name: 'autoencoder alone', color: 'var(--fg)' }, { name: 'cascade', color: 'var(--accent)' }]}
            labelW={140} rowH={22}
          />
          <DataTable
            columns={[
              { key: 'cls', label: 'Held out' },
              { key: 'rows', label: 'Rows scored', num: true, render: (r) => int(r.rows) },
              { key: 'cascade', label: 'Cascade', render: (r) => seeds3(r.cascade) },
              { key: 'clf', label: 'Classifier alone', render: (r) => seeds3(r.clf) },
              { key: 'ae', label: 'Autoencoder alone', render: (r) => seeds3(r.ae) },
            ]}
            rows={ZERO_DAY}
            caption="Every row of each held-out class is scored. Weakest: Uploading (0.527 to 0.665 for the cascade). MITM is one connection."
          />
        </Panel>

        <Panel id="stress" title="Stress tests: smarter attacker, pruning, clipping" tag={TAGS.real1}>
          <DataTable
            columns={[
              { key: 'pct', label: 'Cheaters', render: (r) => `${r.pct}%` },
              { key: 'flip', label: 'Sign-flip through (3 seeds)', render: (r) => seeds3(r.flip, 2) },
              { key: 'stealth', label: 'Stealth through (seed 42)', num: true, render: (r) => fmt(r.stealth, 2) },
              { key: 'fa', label: 'AE recall, sign-flip (3 seeds)', render: (r) => seeds3(r.flipAe) },
              { key: 'sa', label: 'AE recall, stealth (seed 42)', num: true, render: (r) => fmt(r.stealthAe, 3) },
              { key: 'k', label: 'Known-attack recall, stealth', num: true, render: (r) => fmt(r.known, 4) },
            ]}
            rows={STEALTH}
            caption="A stealth attacker steers its update to a cosine similarity of 0.1 with the last aggregate and scales it to 1.5 times an honest update. Single seed."
          />
          <h3>Pruning during federated training (seed 42, no attackers)</h3>
          <DataTable
            columns={[
              { key: 'sp', label: 'Pruned', render: (r) => `${r.sparsity}%` },
              { key: 'w', label: 'Non-zero weights', num: true, render: (r) => int(r.weights) },
              { key: 'ae', label: 'Autoencoder recall', num: true, render: (r) => fmt(r.ae, 3) },
              { key: 'm', label: 'Macro recall', num: true, render: (r) => fmt(r.macro, 3) },
              { key: 'f', label: 'False alarms, packets', num: true, render: (r) => pct(r.fpr, 1) },
            ]}
            rows={PRUNING}
            caption="Pruning after training is worse: autoencoder recall 0.461 falls to 0.098 at 70% (seed 42)."
          />
          <h3>Per-site feature clipping at ±10: final validation loss</h3>
          <p>With clipping, seeds 42 / 43 / 44: {seeds3(CLIP.clip10, 4)}. Without clipping, seed 42: {fmt(CLIP.noClip, 3)}, about 1.9 times worse.</p>
        </Panel>

        <Panel id="live" title="Live replay of every recorded attack" tag={TAGS.phaseB} light>
          <p>10 sites, seed 42. All 14 recordings ended in a block decision with the rule priority=100,ip,nw_src=10.0.0.1 actions=drop read back from the switch. 12 of 14 were named correctly. These are the dataset's own recordings: a demonstration, not a held-out test.</p>
          <DataTable
            columns={[
              { key: 'capture', label: 'Recording' },
              { key: 'cls', label: 'Named as', render: (r) => <span className={r.wrong ? 'bad' : ''}>{r.cls}{r.wrong ? ' (wrong type)' : ''}</span> },
              { key: 'conf', label: 'Confidence', num: true, render: (r) => fmt(r.conf, 3) },
              { key: 'fl', label: 'Packets flagged', num: true, render: (r) => `${int(r.flagged)} / ${int(r.total)}` },
              { key: 'secs', label: 'Seconds', num: true, render: (r) => r.secs },
            ]}
            rows={PHASE_B}
            caption="The released Vulnerability-scanner capture is damaged (a record claims a 136 MB packet); the 265,827 packets before the damage were used."
          />
        </Panel>

        <Panel id="limits" title="Limitations">
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '75ch' }}>
            <li>The autoencoder backstop, unseen-attack detection and the trust filter are weaker at full scale than in earlier smaller runs. The cause is not established.</li>
            <li>Per-packet false alarms reach 16.3%; per connection they are 0.34% to 1.04%.</li>
            <li>MITM is a single connection: scored only by the unseen-attack test and the live replay.</li>
            <li>Stealth, pruning and clip results are single-seed (42). The main results use seeds 42, 43 and 44 with no intervals.</li>
            <li>The live replay uses the dataset's own recordings, one of them damaged.</li>
            <li>One dataset; no split by capture file; no inline streaming mitigation.</li>
          </ul>
        </Panel>

        <div className="footer">
          <p style={{ margin: '0 auto' }}>Aaryan Prakash · Aaron B Ajay · Amal Roy · Amogh Krishna J S · BMS College of Engineering</p>
        </div>
      </div>
    </main>
  );
}
