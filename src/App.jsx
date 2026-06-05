import { useState, useEffect, useMemo } from "react";
import { fetchRDVData, getPrecPeriode } from "./sheets";

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
const STATUT_PIPE_BADGE = {
  'Chaud':     { bg: '#FDECEA', color: '#C0392B', icon: '🔥' },
  'Froid':     { bg: '#EAF0FB', color: '#2E5FA3', icon: '🧊' },
  'A recaler': { bg: '#FEF6E4', color: '#7D5A00', icon: '📅' },
};
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/13r_qAdwCmtdriilX1nzL56r0eEaDX4fDw4vZx3pvfUM/edit';
const COACHES_APPORTEURS = ['Alexis', 'Rémi'];

const OBJ_CA_EQUIPE    = 30000;
const OBJ_RDV_EQUIPE   = 20;
const OBJ_DEALS_EQUIPE = 8;
const OBJ_CA_COACH    = { Mathilde: 15000, Jenny: 15000, Gautier: 10000, Alexis: 20000, Rémi: 20000 };
const OBJ_RDV_COACH   = { Jenny: 10, Mathilde: 10, Gautier: 10, Alexis: 20, Rémi: 20 };
const OBJ_DEALS_COACH = { Jenny: 4, Mathilde: 4, Gautier: 2, Alexis: 4, Rémi: 4 };

function getObjectifs(granularite, coach) {
  const now = new Date();
  let factor = 1;
  if (granularite === 'trimestre') factor = 3;
  else if (granularite === 'ytd') factor = now.getMonth() + 1;
  const caBase    = coach !== 'tous' ? (OBJ_CA_COACH[coach]    ?? OBJ_CA_EQUIPE)    : OBJ_CA_EQUIPE;
  const rdvBase   = coach !== 'tous' ? (OBJ_RDV_COACH[coach]   ?? OBJ_RDV_EQUIPE)   : OBJ_RDV_EQUIPE;
  const dealsBase = coach !== 'tous' ? (OBJ_DEALS_COACH[coach] ?? OBJ_DEALS_EQUIPE) : OBJ_DEALS_EQUIPE;
  return { ca: caBase * factor, rdv: rdvBase * factor, deals: dealsBase * factor };
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

function fmtCA(v) {
  if (!v || v === 0) return '—';
  if (v >= 1000) return (v / 1000).toFixed(1).replace('.0', '') + 'k€';
  return Math.round(v) + '€';
}
function fmtPct(num, den) {
  if (!den) return '—';
  return Math.round((num / den) * 100) + '%';
}
function fmtDelta(curr, prev, isCA = false) {
  if (prev == null || prev === 0) return null;
  const diff = curr - prev;
  const pct  = Math.round((diff / prev) * 100);
  const sign = diff >= 0 ? '+' : '';
  if (isCA) return { label: `${sign}${fmtCA(diff)} vs période préc.`, up: diff >= 0 };
  return { label: `${sign}${diff} (${sign}${pct}%) vs période préc.`, up: diff >= 0 };
}
function getGaugeColor(pct) {
  if (pct >= 1)   return '#1D9E75';
  if (pct >= 0.8) return '#2E8BE6';
  if (pct >= 0.5) return '#BA7517';
  return '#E24B4A';
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  :root {
    --bg: #F2F4F8; --surface: #FFF;
    --bdr: rgba(0,0,0,0.08); --bdr2: rgba(0,0,0,0.14);
    --txt: #0D1B2A; --txt2: #6B7A8D; --txt3: #A0AABB;
    --green: #1D9E75; --red: #E24B4A; --amber: #BA7517; --blue: #2E8BE6;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); font-family: 'DM Sans', system-ui, sans-serif; color: var(--txt); -webkit-font-smoothing: antialiased; }
  .db { min-height: 100vh; }
  .inner { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
  .body { padding: 14px 0; display: flex; flex-direction: column; gap: 10px; }

  .hdr-wrap { background: var(--surface); border-bottom: 0.5px solid var(--bdr); position: sticky; top: 0; z-index: 20; }
  .hdr { max-width: 1080px; margin: 0 auto; padding: 0 20px; height: 44px; display: flex; align-items: center; gap: 10px; }
  .hdr-title { font-size: 13px; font-weight: 600; letter-spacing: -0.2px; flex: 1; }

  .sub-hdr-wrap { background: var(--surface); border-bottom: 0.5px solid var(--bdr); position: sticky; top: 44px; z-index: 19; }
  .sub-hdr { max-width: 1080px; margin: 0 auto; padding: 0 20px; height: 34px; display: flex; align-items: center; gap: 5px; }

  .logo-wrap { width: 26px; height: 26px; border-radius: 6px; overflow: hidden; flex-shrink: 0; border: 0.5px solid var(--bdr); }
  .logo-wrap img { width: 100%; height: 100%; object-fit: cover; }

  .nav-month { display: flex; align-items: center; height: 28px; border: 0.5px solid var(--bdr2); border-radius: 8px; overflow: hidden; }
  .nav-btn { background: none; border: none; padding: 0 9px; height: 100%; cursor: pointer; color: var(--txt2); font-size: 15px; display: flex; align-items: center; transition: background 0.1s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .nav-btn:hover { background: var(--bg); }
  .nav-label { padding: 0 11px; font-size: 12px; font-weight: 500; color: var(--txt); border-left: 0.5px solid var(--bdr); border-right: 0.5px solid var(--bdr); height: 100%; display: flex; align-items: center; white-space: nowrap; }

  .pills { display: flex; gap: 3px; }
  .pill { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; border: 0.5px solid var(--bdr2); background: transparent; color: var(--txt2); cursor: pointer; white-space: nowrap; transition: all 0.1s; font-family: 'DM Sans', sans-serif; display: flex; align-items: center; gap: 3px; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .pill:hover { background: var(--bg); }
  .pill.on { background: var(--txt); color: #fff; border-color: transparent; }
  .vsep { width: 0.5px; height: 16px; background: var(--bdr); flex-shrink: 0; }

  .gauges-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .gcard { background: var(--surface); border: 0.5px solid var(--bdr); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; }
  .gcard-hdr { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .gcard-label { font-size: 11px; font-weight: 600; color: var(--txt); }
  .gcard-sub { font-size: 10px; color: var(--txt3); margin-top: 1px; }
  .gcard-obj { font-size: 11px; color: var(--txt3); }
  .gauge-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; flex: 1; }
  .gauge-meta { width: 100%; display: flex; flex-direction: column; gap: 6px; align-items: center; text-align: center; }
  .gauge-main-val { font-size: 18px; font-weight: 600; color: var(--txt); }
  .gauge-main-sub { font-size: 11px; color: var(--txt2); }
  .meta-row { font-size: 11px; display: flex; align-items: center; gap: 4px; justify-content: center; }
  .up { color: var(--green); } .dn { color: var(--red); } .neu { color: var(--txt2); }
  .pill-target { background: #E6F1FB; color: #0C447C; border-radius: 7px; padding: 5px 9px; font-size: 11px; font-weight: 600; text-align: center; }
  .pill-info { background: #F2F4F8; color: var(--txt2); border-radius: 7px; padding: 5px 9px; font-size: 11px; font-weight: 500; text-align: center; }

  .kpi-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .kpi { background: var(--surface); border: 0.5px solid var(--bdr); border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; align-items: center; text-align: center; }
  .kpi-lbl { font-size: 10px; color: var(--txt2); margin-bottom: 5px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.4px; }
  .kpi-val { font-size: 19px; font-weight: 600; line-height: 1; margin-bottom: 4px; }
  .kpi-trend { font-size: 10px; display: flex; align-items: center; gap: 3px; flex-wrap: wrap; justify-content: center; }

  .tables-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .tcard { background: var(--surface); border: 0.5px solid var(--bdr); border-radius: 12px; padding: 12px 14px; }
  .tcard-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .tcard-title { font-size: 12px; font-weight: 600; }
  .tcard-sub { font-size: 11px; color: var(--txt2); }
  .tbl-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { color: var(--txt2); font-weight: 500; font-size: 10px; text-transform: uppercase; letter-spacing: 0.4px; padding: 4px 8px 6px; border-bottom: 0.5px solid var(--bdr); text-align: left; white-space: nowrap; }
  td { padding: 5px 8px; border-bottom: 0.5px solid var(--bdr); color: var(--txt); }
  tr:last-child td { border-bottom: none; }
  tr:hover td { background: rgba(0,0,0,0.012); }

  .alert-card { background: #FFF8E1; border: 1.5px solid #F59E0B; border-radius: 12px; padding: 12px 14px; }
  .alert-card .tcard-title { color: #92400E; }

  .link-btn { font-size: 10px; color: var(--txt2); text-decoration: none; border: 0.5px solid var(--bdr); border-radius: 6px; padding: 2px 7px; }
  .link-btn:hover { color: var(--txt); }

  @media (max-width: 680px) {
    .gauges-row, .tables-row { grid-template-columns: 1fr; }
    .kpi-row { grid-template-columns: repeat(2, 1fr); }
    .hdr, .sub-hdr { padding: 0 12px; }
    .nav-btn { min-width: 36px; min-height: 36px; }
  }
`;

function ArcGauge({ value, max, size = 160 }) {
  const rawPct = value / (max || 1);
  const pct    = Math.min(rawPct, 1);
  const color  = getGaugeColor(rawPct);
  const r   = size / 2 - 14;
  const cx  = size / 2;
  const cy  = Math.round(size * 0.57);
  const arc = Math.PI * r;
  return (
    <svg width={size} height={Math.round(size * 0.62)} viewBox={`0 0 ${size} ${Math.round(size * 0.62)}`} aria-hidden="true">
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="12" strokeLinecap="round" />
      <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={arc} strokeDashoffset={arc * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)' }} />
      <text x={cx} y={cy - 5} textAnchor="middle"
        style={{ fill: rawPct >= 1 ? color : 'var(--txt)', fontSize: 22, fontWeight: 600, fontFamily: 'DM Sans, sans-serif' }}>
        {Math.round(rawPct * 100)}%
      </text>
    </svg>
  );
}

function Badge({ offre }) {
  const s = OFFRE_BADGE[offre] || { bg: '#F1EFE8', color: '#5F5E5A' };
  return <span style={{ display: 'inline-block', fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 500, background: s.bg, color: s.color }}>{offre || '—'}</span>;
}

function StatutBadge({ statut }) {
  const s = STATUT_PIPE_BADGE[statut] || { bg: '#F1EFE8', color: '#5F5E5A', icon: '' };
  return <span style={{ display: 'inline-block', fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600, background: s.bg, color: s.color }}>{s.icon} {statut}</span>;
}

function CoachDot({ coach }) {
  return <span style={{ width: 7, height: 7, borderRadius: '50%', display: 'inline-block', marginRight: 4, verticalAlign: 'middle', background: COACH_COLORS[coach] || '#888' }} />;
}

function DealsEnCoursTable({ data }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState(1);

  const cols = [
    { label: 'Statut',    key: 'priorite' },
    { label: 'Contact',   key: 'contact' },
    { label: 'Entreprise',key: 'entreprise' },
    { label: 'Coach',     key: 'coach' },
    { label: 'Date RDV',  key: 'date' },
    { label: 'Offre',     key: 'offre' },
    { label: 'CA est.',   key: 'caEst', right: true },
  ];

  const sorted = useMemo(() => {
    const arr = [...(data || [])];
    if (sortCol === null) return arr; // tri par défaut : priorite (déjà fait dans sheets.js)
    return arr.sort((a, b) => {
      const k = cols[sortCol].key;
      if (k === 'caEst' || k === 'priorite') return (Number(a[k] ?? 0) - Number(b[k] ?? 0)) * sortDir;
      return String(a[k] ?? '').localeCompare(String(b[k] ?? '')) * sortDir;
    });
  }, [data, sortCol, sortDir]);

  const onSort = (i) => { if (sortCol === i) setSortDir(d => -d); else { setSortCol(i); setSortDir(1); } };

  return (
    <div className="tbl-wrap">
      <table style={{ minWidth: 520 }}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} onClick={() => onSort(i)}
                style={{ cursor: 'pointer', textAlign: c.right ? 'right' : 'left', color: sortCol === i ? 'var(--blue)' : undefined }}>
                {c.label} <span style={{ fontSize: 9, opacity: 0.5 }}>{sortCol === i ? (sortDir === 1 ? '↑' : '↓') : '⇅'}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((d, i) => (
            <tr key={i} style={d.statut === 'Chaud' ? { background: '#FFFBF5' } : {}}>
              <td><StatutBadge statut={d.statut} /></td>
              <td>{d.contact || '—'}</td>
              <td>{d.entreprise || '—'}</td>
              <td><CoachDot coach={d.coach} />{d.coach}</td>
              <td style={{ color: 'var(--txt2)' }}>{d.date || '—'}</td>
              <td><Badge offre={d.offre} /></td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCA(d.caEst)}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--txt2)' }}>Aucun deal en cours</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function FinAccompagnementTable({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="alert-card">
      <div className="tcard-hdr">
        <span className="tcard-title">⚠️ Fins d'accompagnement proches</span>
        <span className="tcard-sub" style={{ color: '#92400E' }}>{data.length} client{data.length > 1 ? 's' : ''} · dans les 30 jours</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Entreprise</th>
            <th>Coach</th>
            <th>Offre</th>
            <th style={{ textAlign: 'right' }}>Date fin</th>
            <th style={{ textAlign: 'right' }}>Jours restants</th>
            <th style={{ textAlign: 'right' }}>CA signé</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => {
            const urgence = d.joursRestants <= 7 ? '#E24B4A' : d.joursRestants <= 14 ? '#BA7517' : '#854F0B';
            return (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{d.entreprise || '—'}</td>
                <td><CoachDot coach={d.coach} />{d.coach}</td>
                <td><Badge offre={d.offre} /></td>
                <td style={{ textAlign: 'right', color: 'var(--txt2)' }}>{d.dateFin}</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: urgence }}>
                  {d.joursRestants}j
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCA(d.ca)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OffresTable({ offresMap }) {
  const OFFRES_CIBLES = ['Equipe', 'Entrepreneur'];
  const rows = OFFRES_CIBLES.map(offre => {
    const o = offresMap[offre] || { rdv: 0, gagnes: 0, perdus: 0, ca: 0 };
    const taux = o.gagnes + o.perdus > 0 ? Math.round((o.gagnes / (o.gagnes + o.perdus)) * 100) : null;
    const panier = o.gagnes > 0 ? Math.round(o.ca / o.gagnes) : 0;
    return { offre, rdv: o.rdv, gagnes: o.gagnes, taux, ca: o.ca, panier };
  });
  return (
    <div className="tcard">
      <div className="tcard-hdr">
        <span className="tcard-title">Performance par offre</span>
        <span className="tcard-sub">toutes périodes</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Offre</th>
            <th style={{ textAlign: 'right' }}>RDV</th>
            <th style={{ textAlign: 'right' }}>Signés</th>
            <th style={{ textAlign: 'right' }}>Conv.</th>
            <th style={{ textAlign: 'right' }}>CA signé</th>
            <th style={{ textAlign: 'right' }}>Panier moy.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const tauxColor = r.taux == null ? 'var(--txt2)' : r.taux >= 40 ? 'var(--green)' : r.taux >= 25 ? 'var(--amber)' : 'var(--red)';
            return (
              <tr key={i}>
                <td><Badge offre={r.offre} /></td>
                <td style={{ textAlign: 'right' }}>{r.rdv || '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{r.gagnes || '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: tauxColor }}>{r.taux != null ? r.taux + '%' : '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCA(r.ca)}</td>
                <td style={{ textAlign: 'right', color: 'var(--txt2)' }}>{fmtCA(r.panier)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const now = new Date();
  const [year, setYear]               = useState(now.getFullYear());
  const [month, setMonth]             = useState(now.getMonth());
  const [granularite, setGranularite] = useState('mois');
  const [coach, setCoach]             = useState('tous');
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);

  const isApporteur    = COACHES_APPORTEURS.includes(coach);
  const periodeKey     = getPeriodeKey(granularite, year, month);
  const precPeriodeKey = getPrecPeriode(periodeKey);
  const obj            = getObjectifs(granularite, coach);

  useEffect(() => {
    setLoading(true);
    fetchRDVData(periodeKey, precPeriodeKey).then(d => { setData(d); setLoading(false); });
  }, [periodeKey]);

  const stats = useMemo(() => {
    if (!data) return null;
    return (coach !== 'tous' && data[coach]) ? data[coach] : data['tous'];
  }, [data, coach]);

  const precStats = useMemo(() => {
    if (!data?._prec) return null;
    return (coach !== 'tous' && data._prec[coach]) ? data._prec[coach] : data._prec['tous'];
  }, [data, coach]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const caRealise   = (isApporteur ? stats?.caApporte : stats?.ca)     || 0;
  const rdvRealise  = (isApporteur ? stats?.rdvPris   : stats?.rdv)    || 0;
  const rdvTous     = stats?.rdvTous || 0;
  const dealsGagnes = (isApporteur ? stats?.gagnesPris : stats?.gagnes) || 0;
  const perdus      = stats?.perdus  || 0;
  const panierMoyen = dealsGagnes > 0 ? Math.round(caRealise / dealsGagnes) : 0;
  const tauxConv    = fmtPct(dealsGagnes, dealsGagnes + perdus);

  const resteCA    = Math.max(0, obj.ca - caRealise);
  const resteRDV   = Math.max(0, obj.rdv - rdvRealise);
  const resteDeals = Math.max(0, obj.deals - dealsGagnes);

  const precCA    = isApporteur ? precStats?.caApporte  : precStats?.ca;
  const precRDV   = isApporteur ? precStats?.rdvPris    : precStats?.rdv;
  const precDeals = isApporteur ? precStats?.gagnesPris : precStats?.gagnes;

  const deltaCA    = fmtDelta(caRealise, precCA, true);
  const deltaRDV   = fmtDelta(rdvRealise, precRDV, false);
  const deltaDeals = fmtDelta(dealsGagnes, precDeals, false);
  const deltaConv  = precStats ? (() => {
    const curr = dealsGagnes / ((dealsGagnes + perdus) || 1) * 100;
    const prev  = (precStats.gagnes || 0) / (((precStats.gagnes || 0) + (precStats.perdus || 0)) || 1) * 100;
    const diff  = Math.round(curr - prev);
    if (!precStats.gagnes && !precStats.perdus) return null;
    return { label: `${diff >= 0 ? '+' : ''}${diff}pts vs période préc.`, up: diff >= 0 };
  })() : null;

  // Pipe — filtré par coach, tout-temps
  const pipeTotal = useMemo(() => {
    if (!data?._dealsEnCours) return 0;
    const deals = coach === 'tous' ? data._dealsEnCours : data._dealsEnCours.filter(d => d.coach === coach);
    return deals.filter(d => d.statut === 'Chaud').reduce((sum, d) => sum + (d.caEst || 0), 0);
  }, [data, coach]);

  const pipeCount = useMemo(() => {
    if (!data?._dealsEnCours) return 0;
    const deals = coach === 'tous' ? data._dealsEnCours : data._dealsEnCours.filter(d => d.coach === coach);
    return deals.filter(d => d.statut === 'Chaud').length;
  }, [data, coach]);

  const dealsEnCoursFiltres = useMemo(() => {
    if (!data?._dealsEnCours) return [];
    return coach === 'tous' ? data._dealsEnCours : data._dealsEnCours.filter(d => d.coach === coach);
  }, [data, coach]);

  const finAccompFiltres = useMemo(() => {
    if (!data?._finAccompagnement) return [];
    return coach === 'tous' ? data._finAccompagnement : data._finAccompagnement.filter(d => d.coach === coach);
  }, [data, coach]);

  const origines = useMemo(() => {
    if (!data?._origines) return [];
    return Object.entries(data._origines).map(([nom, o]) => ({ nom, ...o })).sort((a, b) => b.pris - a.pris);
  }, [data]);

  const monthLabel = getMonthLabel(year, month, granularite);
  const titreCA    = isApporteur ? 'CA généré — RDV apportés'   : 'CA signé — RDV réalisés';
  const titreRDV   = isApporteur ? 'RDV apportés & réalisés'     : 'RDV réalisés';
  const titreDeals = isApporteur ? 'Deals signés — RDV apportés' : 'Deals signés — RDV réalisés';

  const Delta = ({ d }) => {
    if (!d) return <span className="neu">— pas de données préc.</span>;
    return <span className={d.up ? 'up' : 'dn'}>{d.up ? '↑' : '↓'} {d.label}</span>;
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="db">

        <div className="hdr-wrap">
          <div className="hdr">
            <div className="logo-wrap"><img src={LOGO} alt="Kwala" /></div>
            <span className="hdr-title">Kwala Dashboard</span>
            <div className="nav-month">
              <button className="nav-btn" onClick={prevMonth}>‹</button>
              <span className="nav-label">{monthLabel} ▾</span>
              <button className="nav-btn" onClick={nextMonth}>›</button>
            </div>
            <div className="pills">
              {[['mois','Mois'],['trimestre','Trimestre'],['ytd','YTD']].map(([k,l]) => (
                <button key={k} className={`pill${granularite === k ? ' on' : ''}`} onClick={() => setGranularite(k)}>{l}</button>
              ))}
            </div>
            <div className="vsep" />
            <a href={SHEET_URL} target="_blank" rel="noreferrer" className="link-btn">↗ Sheet</a>
          </div>
        </div>

        <div className="sub-hdr-wrap">
          <div className="sub-hdr">
            <button className={`pill${coach === 'tous' ? ' on' : ''}`} onClick={() => setCoach('tous')}>Tous</button>
            {COACHES.map(c => (
              <button key={c} className="pill"
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

              {/* 1. JAUGES */}
              <div className="gauges-row">
                <div className="gcard">
                  <div className="gcard-hdr">
                    <div>
                      <div className="gcard-label">{titreCA}</div>
                      {isApporteur && <div className="gcard-sub">via RDV apportés par {coach}</div>}
                    </div>
                    <span className="gcard-obj">obj. {fmtCA(obj.ca)}</span>
                  </div>
                  <div className="gauge-wrap">
                    <ArcGauge value={caRealise} max={obj.ca} />
                    <div className="gauge-meta">
                      <div>
                        <div className="gauge-main-val">{fmtCA(caRealise)}</div>
                        <div className="gauge-main-sub">sur {fmtCA(obj.ca)}</div>
                      </div>
                      <div className="meta-row"><Delta d={deltaCA} /></div>
                      {caRealise >= obj.ca
                        ? <div className="pill-target" style={{ background: '#E1F5EE', color: '#085041' }}>🎉 Dépassé de {fmtCA(caRealise - obj.ca)} (+{Math.round(((caRealise - obj.ca) / obj.ca) * 100)}%)</div>
                        : <div className="pill-target">🎯 Reste à signer : {fmtCA(resteCA)}</div>
                      }
                    </div>
                  </div>
                </div>

                <div className="gcard">
                  <div className="gcard-hdr">
                    <div>
                      <div className="gcard-label">{titreRDV}</div>
                      {isApporteur && <div className="gcard-sub">RDV pris par {coach} et réalisés</div>}
                    </div>
                    <span className="gcard-obj">obj. {obj.rdv} RDV</span>
                  </div>
                  <div className="gauge-wrap">
                    <ArcGauge value={rdvRealise} max={obj.rdv} />
                    <div className="gauge-meta">
                      <div>
                        <div className="gauge-main-val">{rdvRealise} RDV</div>
                        <div className="gauge-main-sub">sur {obj.rdv}</div>
                      </div>
                      <div className="meta-row"><Delta d={deltaRDV} /></div>
                      {rdvRealise >= obj.rdv
                        ? <div className="pill-target" style={{ background: '#E1F5EE', color: '#085041' }}>🎉 Dépassé de {rdvRealise - obj.rdv} RDV</div>
                        : <div className="pill-target">🎯 Plus que {resteRDV} RDV</div>
                      }
                      <div className="pill-info">📋 {rdvTous} RDV pris · {stats?.noshow || 0} no show</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. KPI SECONDAIRES */}
              <div className="kpi-row">
                <div className="kpi">
                  <div className="kpi-lbl">{titreDeals}</div>
                  <div className="kpi-val">{dealsGagnes}</div>
                  <div className="kpi-trend">
                    <Delta d={deltaDeals} />
                    {resteDeals > 0 && <span style={{ color: '#185FA5', marginLeft: 3 }}>· encore {resteDeals}</span>}
                  </div>
                </div>
                <div className="kpi">
                  <div className="kpi-lbl">Taux conv.</div>
                  <div className="kpi-val">{tauxConv}</div>
                  <div className="kpi-trend"><Delta d={deltaConv} /></div>
                </div>
                <div className="kpi">
                  <div className="kpi-lbl">Panier moyen</div>
                  <div className="kpi-val">{fmtCA(panierMoyen)}</div>
                  <div className="kpi-trend neu">— pas de données préc.</div>
                </div>
                <div className="kpi">
                  <div className="kpi-lbl">Pipe en cours</div>
                  <div className="kpi-val">{fmtCA(pipeTotal)}</div>
                  <div className="kpi-trend neu">{pipeCount} deal{pipeCount > 1 ? 's' : ''} chauds · tous mois</div>
                </div>
              </div>

              {/* 3. DEALS EN COURS — pleine largeur */}
              <div className="tcard">
                <div className="tcard-hdr">
                  <span className="tcard-title">Deals en cours</span>
                  <span className="tcard-sub">
                    {pipeCount} deal{pipeCount > 1 ? 's' : ''} · pipe {fmtCA(pipeTotal)} · tous mois
                    {resteCA > 0 && <span style={{ color: '#185FA5', marginLeft: 8, fontWeight: 600 }}>🎯 Reste {fmtCA(resteCA)} à signer</span>}
                  </span>
                </div>
                <DealsEnCoursTable data={dealsEnCoursFiltres} />
              </div>

              {/* 4. DEALS RÉCENTS + ENTONNOIR */}
              <div className="tables-row">
                <div className="tcard">
                  <div className="tcard-hdr">
                    <span className="tcard-title">Deals signés récents</span>
                    <span className="tcard-sub">3 derniers mois</span>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Entreprise</th><th>Coach</th><th>Offre</th><th style={{ textAlign: 'right' }}>CA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?._dealsGagnes3m || []).slice(0, 10).map((d, i) => (
                        <tr key={i}>
                          <td>{d.entreprise || '—'}</td>
                          <td><CoachDot coach={d.coach} />{d.coach}</td>
                          <td><Badge offre={d.offre} /></td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCA(d.ca)}</td>
                        </tr>
                      ))}
                      {(data?._dealsGagnes3m || []).length === 0 && (
                        <tr><td colSpan={4} style={{ padding: 16, textAlign: 'center', color: 'var(--txt2)' }}>Aucun deal signé ces 3 derniers mois</td></tr>
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
                        <th style={{ textAlign: 'right' }}>CA</th>
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
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtCA(o.ca)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: convColor }}>{conv}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 5. FINS ACCOMPAGNEMENT + PERF OFFRES */}
              <div className="tables-row">
                {finAccompFiltres.length > 0
                  ? <FinAccompagnementTable data={finAccompFiltres} />
                  : (
                    <div className="tcard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: 'var(--txt3)', fontSize: 12 }}>✅ Aucune fin d'accompagnement dans les 30 jours</span>
                    </div>
                  )
                }
                <OffresTable offresMap={data?._offres || {}} />
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}