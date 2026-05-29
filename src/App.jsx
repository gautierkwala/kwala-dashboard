import { useState, useEffect, useMemo } from "react";
import { fetchRDVData } from "./sheets";

const LOGO = "/logo.jpeg";
const COACHES = ['Alexis', 'Rémi', 'Mathilde', 'Jenny', 'Gautier'];
const COACH_COLORS = {
  Alexis: '#2E8BE6', Rémi: '#7F77DD', Mathilde: '#E8417E',
  Jenny: '#BA7517', Gautier: '#1D9E75',
};
const OFFRE_BADGE = {
  'Equipe':       { bg: '#FAEEDA', color: '#854F0B' },
  'Entrepreneur': { bg: '#E6F1FB', color: '#185FA5' },
  'Prescripteur': { bg: '#E1F5EE', color: '#0F6E56' },
};
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/13r_qAdwCmtdriilX1nzL56r0eEaDX4fDw4vZx3pvfUM/edit';

const OBJ_CA_MENSUEL   = 30000;
const OBJ_RDV_MENSUEL  = 40;
const OBJ_DEALS_MENSUEL = 12;

function getObjectifs(granularite) {
  const now = new Date();
  let factor = 1;
  if (granularite === 'trimestre') factor = 3;
  else if (granularite === 'ytd') factor = now.getMonth() + 1;
  return {
    ca:    OBJ_CA_MENSUEL   * factor,
    rdv:   OBJ_RDV_MENSUEL  * factor,
    deals: OBJ_DEALS_MENSUEL * factor,
  };
}

function fmtCA(v) {
  if (!v || v === 0) return '—';
  if (v >= 1000) return (v / 1000).toFixed(1).replace('.0', '') + 'k€';
  return Math.round(v) + '€';
}
function fmtPct(num, den) {
  if (!den) return '—';
  return Math.round((num / den) * 100) + '%';
}
function getPeriodeKey(granularite, year, month) {
  if (granularite === 'mois') return `mois_${year}${String(month + 1).padStart(2, '0')}`;
  if (granularite === 'trimestre') return `t${Math.floor(month / 3) + 1}`;
  return 'ytd';
}
function getMonthLabel(year, month, granularite) {
  if (granularite === 'trimestre') return `T${Math.floor(month / 3) + 1} ${year}`;
  if (granularite === 'ytd') return `YTD ${year}`;
  return new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
function calcProjection(realise, year, month, granularite) {
  if (granularite !== 'mois') return null;
  const now = new Date();
  if (now.getFullYear() !== year || now.getMonth() !== month) return null;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const progress = now.getDate() / daysInMonth;
  if (progress <= 0) return null;
  return Math.round(realise / progress);
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600&display=swap');
  :root {
    --bg: #F2F4F8;
    --surface: #FFFFFF;
    --bdr: rgba(0,0,0,0.08);
    --bdr2: rgba(0,0,0,0.14);
    --txt: #0D1B2A;
    --txt2: #6B7A8D;
    --txt3: #A0AABB;
    --green: #1D9E75;
    --red: #E24B4A;
    --amber: #BA7517;
    --blue: #2E8BE6;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { font-size: 14px; }
  body {
    background: var(--bg);
    font-family: 'DM Sans', system-ui, sans-serif;
    color: var(--txt);
    -webkit-font-smoothing: antialiased;
  }

  /* ── Layout ── */
  .db { min-height: 100vh; background: var(--bg); }
  .inner { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
  .body { padding: 14px 0; display: flex; flex-direction: column; gap: 10px; }

  /* ── Headers ── */
  .hdr-wrap {
    background: var(--surface);
    border-bottom: 0.5px solid var(--bdr);
    position: sticky; top: 0; z-index: 20;
  }
  .hdr {
    max-width: 1080px; margin: 0 auto;
    padding: 0 20px; height: 44px;
    display: flex; align-items: center; gap: 10px;
  }
  .sub-hdr-wrap {
    background: var(--surface);
    border-bottom: 0.5px solid var(--bdr);
    position: sticky; top: 44px; z-index: 19;
  }
  .sub-hdr {
    max-width: 1080px; margin: 0 auto;
    padding: 0 20px; height: 34px;
    display: flex; align-items: center; gap: 5px;
  }
  .hdr-title { font-size: 13px; font-weight: 600; letter-spacing: -0.2px; flex: 1; }

  .logo-wrap {
    width: 26px; height: 26px; border-radius: 6px;
    overflow: hidden; flex-shrink: 0; border: 0.5px solid var(--bdr);
  }
  .logo-wrap img { width: 100%; height: 100%; object-fit: cover; }

  /* ── Nav mois ── */
  .nav-month {
    display: flex; align-items: center; height: 28px;
    border: 0.5px solid var(--bdr2); border-radius: 8px; overflow: hidden;
  }
  .nav-btn {
    background: none; border: none; padding: 0 9px; height: 100%;
    cursor: pointer; color: var(--txt2); font-size: 15px;
    display: flex; align-items: center; transition: background 0.1s;
  }
  .nav-btn:hover { background: var(--bg); }
  .nav-label {
    padding: 0 11px; font-size: 12px; font-weight: 500; color: var(--txt);
    border-left: 0.5px solid var(--bdr); border-right: 0.5px solid var(--bdr);
    height: 100%; display: flex; align-items: center; white-space: nowrap; cursor: pointer;
  }

  /* ── Pills ── */
  .pills { display: flex; gap: 3px; }
  .pill {
    padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500;
    border: 0.5px solid var(--bdr2); background: transparent; color: var(--txt2);
    cursor: pointer; white-space: nowrap; transition: all 0.1s;
    font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 3px;
  }
  .pill:hover { background: var(--bg); }
  .pill.on { background: var(--txt); color: #fff; border-color: transparent; }

  .vsep { width: 0.5px; height: 16px; background: var(--bdr); flex-shrink: 0; }

  /* ── Cards ── */
  .gcard {
    background: var(--surface); border: 0.5px solid var(--bdr);
    border-radius: 12px; padding: 14px 16px;
  }
  .gauges-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .gcard-hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
  .gcard-label { font-size: 11px; font-weight: 500; color: var(--txt2); }
  .gcard-obj { font-size: 11px; color: var(--txt3); }
  .gauge-wrap { display: flex; align-items: center; gap: 14px; }
  .gauge-meta { flex: 1; display: flex; flex-direction: column; gap: 5px; min-width: 0; }
  .gauge-main-val { font-size: 16px; font-weight: 600; color: var(--txt); margin-bottom: 1px; }
  .gauge-main-sub { font-size: 11px; color: var(--txt2); }
  .meta-row { font-size: 11px; display: flex; align-items: center; gap: 4px; }
  .up { color: var(--green); } .dn { color: var(--red); } .neu { color: var(--txt2); }

  .pill-target {
    background: #E6F1FB; color: #0C447C; border-radius: 7px;
    padding: 5px 9px; font-size: 11px; font-weight: 600; margin-top: 3px;
  }
  .pill-proj {
    background: #E1F5EE; color: #085041; border-radius: 7px;
    padding: 5px 9px; font-size: 11px; font-weight: 500;
  }

  /* ── KPI row ── */
  .kpi-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
  .kpi {
    background: var(--surface); border: 0.5px solid var(--bdr);
    border-radius: 8px; padding: 10px 12px;
  }
  .kpi-lbl {
    font-size: 10px; color: var(--txt2); margin-bottom: 5px;
    font-weight: 500; text-transform: uppercase; letter-spacing: 0.4px;
  }
  .kpi-val { font-size: 19px; font-weight: 600; line-height: 1; margin-bottom: 4px; }
  .kpi-trend { font-size: 10px; display: flex; align-items: center; gap: 3px; flex-wrap: wrap; }

  /* ── Tables ── */
  .tables-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .tcard {
    background: var(--surface); border: 0.5px solid var(--bdr);
    border-radius: 12px; padding: 12px 14px;
  }
  .tcard-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .tcard-title { font-size: 12px; font-weight: 600; }
  .tcard-sub { font-size: 11px; color: var(--txt2); }
  .tbl-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th {
    color: var(--txt2); font-weight: 500; font-size: 10px;
    text-transform: uppercase; letter-spacing: 0.4px;
    padding: 4px 8px 6px; border-bottom: 0.5px solid var(--bdr); text-align: left;
    white-space: nowrap;
  }
  td { padding: 5px 8px; border-bottom: 0.5px solid var(--bdr); color: var(--txt); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(0,0,0,0.015); }

  .link-btn {
    font-size: 10px; color: var(--txt2); text-decoration: none;
    border: 0.5px solid var(--bdr); border-radius: 6px; padding: 2px 7px;
  }
  .link-btn:hover { color: var(--txt); }

  @media (max-width: 680px) {
    .gauges-row, .tables-row { grid-template-columns: 1fr; }
    .kpi-row { grid-template-columns: repeat(2, 1fr); }
    .gauge-wrap { flex-direction: column; align-items: flex-start; }
    .hdr, .sub-hdr { padding: 0 12px; }
    .body { padding: 10px 0; }
  }
`;

function ArcGauge({ value, max, color, size = 148 }) {
  const pct = Math.min(value / (max || 1), 1);
  const r = size / 2 - 13;
  const cx = size / 2;
  const cy = Math.round(size * 0.57);
  const arc = Math.PI * r;
  return (
    <svg width={size} height={Math.round(size * 0.6)} viewBox={`0 0 ${size} ${Math.round(size * 0.6)}`} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="11" strokeLinecap="round" />
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={color} strokeWidth="11" strokeLinecap="round"
        strokeDasharray={arc} strokeDashoffset={arc * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)' }} />
      <text x={cx} y={cy - 5} textAnchor="middle"
        style={{ fill: 'var(--txt)', fontSize: 21, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
        {Math.round(pct * 100)}%
      </text>
    </svg>
  );
}

function Badge({ offre }) {
  const s = OFFRE_BADGE[offre] || { bg: '#F1EFE8', color: '#5F5E5A' };
  return (
    <span style={{ display: 'inline-block', fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 500, background: s.bg, color: s.color }}>
      {offre || '—'}
    </span>
  );
}

function CoachDot({ coach }) {
  return <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', marginRight: 4, verticalAlign: 'middle', background: COACH_COLORS[coach] || '#888' }} />;
}

function SortableTable({ data }) {
  const [sortCol, setSortCol] = useState(3);
  const [sortDir, setSortDir] = useState(-1);
  const cols = [
    { label: 'Contact',    key: 'contact' },
    { label: 'Entreprise', key: 'entreprise' },
    { label: 'Coach',      key: 'coach' },
    { label: 'Date RDV',  key: 'date' },
    { label: 'Offre',      key: 'offre' },
    { label: 'CA est.',    key: 'caEst', right: true },
  ];
  const sorted = useMemo(() => [...(data || [])].sort((a, b) => {
    const k = cols[sortCol].key;
    if (k === 'caEst') return (Number(a[k] ?? 0) - Number(b[k] ?? 0)) * sortDir;
    return String(a[k] ?? '').localeCompare(String(b[k] ?? '')) * sortDir;
  }), [data, sortCol, sortDir]);

  const handleSort = (i) => {
    if (sortCol === i) setSortDir(d => -d);
    else { setSortCol(i); setSortDir(1); }
  };

  return (
    <div className="tbl-wrap">
      <table style={{ minWidth: 480 }}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} onClick={() => handleSort(i)}
                style={{ cursor: 'pointer', textAlign: c.right ? 'right' : 'left', color: sortCol === i ? 'var(--blue)' : undefined }}>
                {c.label} <span style={{ fontSize: 9, opacity: 0.5 }}>{sortCol === i ? (sortDir === 1 ? '↑' : '↓') : '⇅'}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((d, i) => (
            <tr key={i}>
              <td>{d.contact || '—'}</td>
              <td>{d.entreprise || '—'}</td>
              <td><CoachDot coach={d.coach} />{d.coach}</td>
              <td style={{ color: 'var(--txt2)' }}>{d.date || '—'}</td>
              <td><Badge offre={d.offre} /></td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCA(d.caEst)}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--txt2)' }}>Aucun deal en cours</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const now = new Date();
  const [year, setYear]           = useState(now.getFullYear());
  const [month, setMonth]         = useState(now.getMonth());
  const [granularite, setGranularite] = useState('mois');
  const [coach, setCoach]         = useState('tous');
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);

  const periodeKey = getPeriodeKey(granularite, year, month);
  const obj        = getObjectifs(granularite);

  useEffect(() => {
    setLoading(true);
    fetchRDVData(periodeKey).then(d => { setData(d); setLoading(false); });
  }, [periodeKey]);

  const stats = useMemo(() => {
    if (!data) return null;
    return (coach !== 'tous' && data[coach]) ? data[coach] : data['tous'];
  }, [data, coach]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const caRealise   = stats?.ca || 0;
  const rdvRealise  = stats?.rdv || 0;
  const dealsGagnes = stats?.gagnes || 0;
  const caEncours   = stats?.caEncours || 0;
  const encours     = stats?.encours || 0;
  const perdus      = stats?.perdus || 0;
  const panierMoyen = dealsGagnes > 0 ? Math.round(caRealise / dealsGagnes) : 0;
  const tauxConv    = fmtPct(dealsGagnes, dealsGagnes + perdus);

  const projCA  = calcProjection(caRealise, year, month, granularite);
  const projRDV = calcProjection(rdvRealise, year, month, granularite);

  const resteCA    = Math.max(0, obj.ca - caRealise);
  const resteRDV   = Math.max(0, obj.rdv - rdvRealise);
  const resteDeals = Math.max(0, obj.deals - dealsGagnes);

  const origines = useMemo(() => {
    if (!data?._origines) return [];
    return Object.entries(data._origines)
      .map(([nom, o]) => ({ nom, ...o }))
      .sort((a, b) => b.pris - a.pris);
  }, [data]);

  const monthLabel = getMonthLabel(year, month, granularite);

  return (
    <>
      <style>{CSS}</style>
      <div className="db">

        {/* ── HEADER 1 ── */}
        <div className="hdr-wrap">
          <div className="hdr">
            <div className="logo-wrap"><img src={LOGO} alt="Kwala" /></div>
            <span className="hdr-title">Kwala Dashboard</span>

            <div className="nav-month">
              <button className="nav-btn" onClick={prevMonth} aria-label="Mois précédent">‹</button>
              <span className="nav-label">{monthLabel} ▾</span>
              <button className="nav-btn" onClick={nextMonth} aria-label="Mois suivant">›</button>
            </div>

            <div className="pills">
              {[['mois','Mois'],['trimestre','Trimestre'],['ytd','YTD']].map(([k, l]) => (
                <button key={k} className={`pill${granularite === k ? ' on' : ''}`} onClick={() => setGranularite(k)}>{l}</button>
              ))}
            </div>

            <div className="vsep" />
            <a href={SHEET_URL} target="_blank" rel="noreferrer" className="link-btn">↗ Sheet</a>
          </div>
        </div>

        {/* ── HEADER 2 — coaches ── */}
        <div className="sub-hdr-wrap">
          <div className="sub-hdr">
            <button className={`pill${coach === 'tous' ? ' on' : ''}`} onClick={() => setCoach('tous')}>Tous</button>
            {COACHES.map(c => (
              <button key={c}
                className="pill"
                style={coach === c ? { background: COACH_COLORS[c], borderColor: 'transparent', color: '#fff' } : {}}
                onClick={() => setCoach(c)}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: coach === c ? 'rgba(255,255,255,0.65)' : COACH_COLORS[c], display: 'inline-block', flexShrink: 0 }} />
                {c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--txt2)', fontSize: 13 }}>Chargement…</div>
        ) : (
          <div className="inner">
            <div className="body">

              {/* ── JAUGES ── */}
              <div className="gauges-row">

                <div className="gcard">
                  <div className="gcard-hdr">
                    <span className="gcard-label">CA signé</span>
                    <span className="gcard-obj">obj. {fmtCA(obj.ca)}</span>
                  </div>
                  <div className="gauge-wrap">
                    <ArcGauge value={caRealise} max={obj.ca} color="#1D9E75" />
                    <div className="gauge-meta">
                      <div>
                        <div className="gauge-main-val">{fmtCA(caRealise)}</div>
                        <div className="gauge-main-sub">sur {fmtCA(obj.ca)}</div>
                      </div>
                      <div className="meta-row up">↑ +18% vs même période N-1</div>
                      <div className="meta-row up">↑ +9% vs mois précédent</div>
                      <div className="pill-target">🎯 Reste à signer : {fmtCA(resteCA)}</div>
                      {projCA && <div className="pill-proj">📈 Projection fin de période : {fmtCA(projCA)}</div>}
                    </div>
                  </div>
                </div>

                <div className="gcard">
                  <div className="gcard-hdr">
                    <span className="gcard-label">RDV réalisés</span>
                    <span className="gcard-obj">obj. {obj.rdv} RDV</span>
                  </div>
                  <div className="gauge-wrap">
                    <ArcGauge value={rdvRealise} max={obj.rdv} color="#2E8BE6" />
                    <div className="gauge-meta">
                      <div>
                        <div className="gauge-main-val">{rdvRealise} RDV</div>
                        <div className="gauge-main-sub">sur {obj.rdv}</div>
                      </div>
                      <div className="meta-row up">↑ +7 RDV vs mois précédent</div>
                      <div className="meta-row neu">= vs même période N-1</div>
                      <div className="pill-target">🎯 Plus que {resteRDV} RDV</div>
                      {projRDV && <div className="pill-proj">📈 Projection fin de période : {projRDV} RDV</div>}
                    </div>
                  </div>
                </div>

              </div>

              {/* ── KPI SECONDAIRES ── */}
              <div className="kpi-row">
                <div className="kpi">
                  <div className="kpi-lbl">Deals gagnés</div>
                  <div className="kpi-val">{dealsGagnes}</div>
                  <div className="kpi-trend">
                    <span className="up">↑ +3 vs préc.</span>
                    {resteDeals > 0 && <span style={{ color: '#185FA5', marginLeft: 3 }}>· encore {resteDeals}</span>}
                  </div>
                </div>
                <div className="kpi">
                  <div className="kpi-lbl">Taux conv.</div>
                  <div className="kpi-val">{tauxConv}</div>
                  <div className="kpi-trend dn">↓ −4pts vs préc.</div>
                </div>
                <div className="kpi">
                  <div className="kpi-lbl">Panier moyen</div>
                  <div className="kpi-val">{fmtCA(panierMoyen)}</div>
                  <div className="kpi-trend up">↑ +12% vs préc.</div>
                </div>
                <div className="kpi">
                  <div className="kpi-lbl">Pipe en cours</div>
                  <div className="kpi-val">{fmtCA(caEncours)}</div>
                  <div className="kpi-trend neu">{encours} deals actifs</div>
                </div>
                <div className="kpi">
                  <div className="kpi-lbl">Forecast M+1</div>
                  <div className="kpi-val">{projCA ? fmtCA(Math.round(projCA * 1.05)) : '—'}</div>
                  <div className="kpi-trend" style={{ color: 'var(--green)' }}>rythme actuel</div>
                </div>
              </div>

              {/* ── TABLES ── */}
              <div className="tables-row">

                <div className="tcard">
                  <div className="tcard-hdr">
                    <span className="tcard-title">Deals signés récents</span>
                    <span className="tcard-sub">{dealsGagnes} ce mois</span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Entreprise</th>
                        <th>Coach</th>
                        <th>Offre</th>
                        <th style={{ textAlign: 'right' }}>CA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?._dealsGagnes || []).slice(0, 7).map((d, i) => (
                        <tr key={i}>
                          <td>{d.entreprise || '—'}</td>
                          <td><CoachDot coach={d.coach} />{d.coach}</td>
                          <td><Badge offre={d.offre} /></td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCA(d.ca)}</td>
                        </tr>
                      ))}
                      {(data?._dealsGagnes || []).length === 0 && (
                        <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: 'var(--txt2)' }}>Aucun deal signé</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="tcard">
                  <div className="tcard-hdr">
                    <span className="tcard-title">Entonnoir par origine</span>
                    <span className="tcard-sub">toutes périodes</span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Origine</th>
                        <th style={{ textAlign: 'right' }}>Pris</th>
                        <th style={{ textAlign: 'right' }}>Réal.</th>
                        <th style={{ textAlign: 'right' }}>Signés</th>
                        <th style={{ textAlign: 'right' }}>Conv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {origines.map((o, i) => {
                        const conv = o.realises ? Math.round((o.gagnes / o.realises) * 100) : 0;
                        const convColor = conv >= 40 ? 'var(--green)' : conv >= 25 ? 'var(--amber)' : 'var(--red)';
                        return (
                          <tr key={i}>
                            <td style={o.nom === 'Non renseigné' ? { color: 'var(--txt2)', fontStyle: 'italic' } : {}}>{o.nom}</td>
                            <td style={{ textAlign: 'right' }}>{o.pris}</td>
                            <td style={{ textAlign: 'right' }}>{o.realises}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{o.gagnes}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: convColor }}>{conv}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* ── DEALS EN COURS ── */}
              <div className="tcard">
                <div className="tcard-hdr">
                  <span className="tcard-title">Deals en cours</span>
                  <span className="tcard-sub">
                    {encours} deals · pipe {fmtCA(caEncours)}
                    {resteCA > 0 && (
                      <span style={{ color: '#185FA5', marginLeft: 8, fontWeight: 600 }}>
                        🎯 Reste {fmtCA(resteCA)} à signer
                      </span>
                    )}
                  </span>
                </div>
                <SortableTable data={data?._dealsEnCours || []} />
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}