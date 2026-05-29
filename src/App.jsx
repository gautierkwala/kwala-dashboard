import { useState, useEffect, useMemo } from "react";
import { fetchRDVData } from "./sheets";

const LOGO = "/logo.jpeg";

const COACHES = ['Alexis', 'Rémi', 'Mathilde', 'Jenny', 'Gautier'];
const COACH_COLORS = {
  Alexis:   '#2E8BE6',
  Rémi:     '#7F77DD',
  Mathilde: '#E8417E',
  Jenny:    '#BA7517',
  Gautier:  '#1D9E75',
};
const OFFRE_BADGE = {
  'Equipe':       { bg: '#e6f1fb', color: '#185FA5' },
  'Entrepreneur': { bg: '#FAEEDA', color: '#854F0B' },
  'Prescripteur': { bg: '#E1F5EE', color: '#0F6E56' },
};

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/13r_qAdwCmtdriilX1nzL56r0eEaDX4fDw4vZx3pvfUM/edit';

function fmtCA(v) {
  if (!v || v === 0) return '—';
  if (v >= 1000) return (v / 1000).toFixed(1).replace('.0', '') + 'k€';
  return v + '€';
}
function fmtPct(num, den) {
  if (!den) return '—';
  return Math.round((num / den) * 100) + '%';
}
function fmtDate(str) {
  if (!str) return '—';
  return str;
}

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

function ArcGauge({ value, max, size = 150, label, sub, color, gradient }) {
  const r = (size / 2) - 12;
  const cx = size / 2;
  const cy = size * 0.55;
  const totalArc = Math.PI * r;
  const pct = Math.min(value / (max || 1), 1);
  const offset = totalArc * (1 - pct);
  const x1 = cx - r;
  const y1 = cy;
  const x2 = cx + r;
  const y2 = cy;
  const gradId = 'grad_' + label?.replace(/\s/g, '') + size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4, textAlign: 'center' }}>{label}</div>
      <svg width={size} height={size * 0.58} viewBox={`0 0 ${size} ${size * 0.58}`} aria-hidden="true">
        {gradient && (
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1D9E75" />
              <stop offset="100%" stopColor="#2E8BE6" />
            </linearGradient>
          </defs>
        )}
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
          fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="11" strokeLinecap="round" />
        <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
          fill="none"
          stroke={gradient ? `url(#${gradId})` : (color || '#2E8BE6')}
          strokeWidth="11" strokeLinecap="round"
          strokeDasharray={totalArc}
          strokeDashoffset={offset} />
        <text x={cx} y={cy - 2} textAnchor="middle" fill="white"
          fontSize={size > 130 ? 22 : 17} fontWeight="700">
          {Math.round(pct * 100)}%
        </text>
      </svg>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 1 }}>{sub}</div>
    </div>
  );
}

function Badge({ offre }) {
  const style = OFFRE_BADGE[offre] || { bg: '#EEEDFE', color: '#3C3489' };
  return (
    <span style={{
      display: 'inline-block', fontSize: 9, padding: '1px 6px',
      borderRadius: 20, fontWeight: 500,
      background: style.bg, color: style.color
    }}>{offre}</span>
  );
}

function CoachDot({ coach }) {
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%', display: 'inline-block',
      marginRight: 3, verticalAlign: 'middle',
      background: COACH_COLORS[coach] || '#888'
    }} />
  );
}

function SortableTable({ data }) {
  const [sortCol, setSortCol] = useState(3);
  const [sortDir, setSortDir] = useState(1);

  const cols = [
    { label: 'Contact',   key: 'contact' },
    { label: 'Entreprise',key: 'entreprise' },
    { label: 'Coach',     key: 'coach' },
    { label: 'Date RDV',  key: 'date' },
    { label: 'Offre',     key: 'offre' },
    { label: 'CA est.',   key: 'caEst', right: true },
  ];

  const sorted = useMemo(() => {
    return [...(data || [])].sort((a, b) => {
      const k = cols[sortCol].key;
      const va = a[k] ?? '';
      const vb = b[k] ?? '';
      if (k === 'caEst') return (Number(va) - Number(vb)) * sortDir;
      return String(va).localeCompare(String(vb)) * sortDir;
    });
  }, [data, sortCol, sortDir]);

  const handleSort = (i) => {
    if (sortCol === i) setSortDir(d => -d);
    else { setSortCol(i); setSortDir(1); }
  };

  return (
    <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {cols.map((c, i) => (
            <th key={i} onClick={() => handleSort(i)} style={{
              color: sortCol === i ? '#2E8BE6' : '#4b6fa8',
              fontWeight: 400,
              textAlign: c.right ? 'right' : 'left',
              padding: '3px 6px 6px',
              borderBottom: '0.5px solid #c7d9f5',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              userSelect: 'none',
              fontSize: 11,
            }}>
              {c.label}{' '}
              <span style={{ fontSize: 9, color: sortCol === i ? '#2E8BE6' : '#c7d9f5' }}>
                {sortCol === i ? (sortDir === 1 ? '↑' : '↓') : '⇅'}
              </span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map((d, i) => (
          <tr key={i}>
            <td style={{ padding: '5px 6px', borderBottom: '0.5px solid #eef4fd', color: '#0f1f3d' }}>{d.contact}</td>
            <td style={{ padding: '5px 6px', borderBottom: '0.5px solid #eef4fd', color: '#0f1f3d' }}>{d.entreprise}</td>
            <td style={{ padding: '5px 6px', borderBottom: '0.5px solid #eef4fd', color: '#0f1f3d' }}>
              <CoachDot coach={d.coach} />{d.coach}
            </td>
            <td style={{ padding: '5px 6px', borderBottom: '0.5px solid #eef4fd', color: '#0f1f3d' }}>{fmtDate(d.date)}</td>
            <td style={{ padding: '5px 6px', borderBottom: '0.5px solid #eef4fd' }}><Badge offre={d.offre} /></td>
            <td style={{ padding: '5px 6px', borderBottom: '0.5px solid #eef4fd', textAlign: 'right', fontWeight: 600, color: '#0f1f3d' }}>
              {fmtCA(d.caEst)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function App() {
  const [coach, setCoach] = useState('tous');
  const [periode, setPeriode] = useState('ytd');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState('');
  const width = useWindowWidth();
  const isMobile = width < 600;

  useEffect(() => {
    const now = new Date();
    setUpdatedAt(now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchRDVData(periode).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [periode]);

  const stats = useMemo(() => {
    if (!data) return null;
    const key = coach === 'tous' ? 'tous' : coach;
    return data[key] || data['tous'];
  }, [data, coach]);

  const now = new Date();
  const objRDV = (periode === 't1' || periode === 't2') ? 60
    : periode === 'ytd' ? 20 * (now.getMonth() + 1)
    : 20;
  const objCA = (periode === 't1' || periode === 't2') ? 90000
    : periode === 'ytd' ? 30000 * (now.getMonth() + 1)
    : 30000;

  const origines = useMemo(() => {
    if (!data?._origines) return [];
    return Object.entries(data._origines)
      .map(([nom, o]) => ({ nom, ...o }))
      .sort((a, b) => b.pris - a.pris);
  }, [data]);

  const offres = useMemo(() => {
    if (!data?._offres) return [];
    return Object.entries(data._offres).map(([nom, o]) => ({ nom, ...o }));
  }, [data]);

  const taux = stats ? fmtPct(stats.gagnes, stats.gagnes + stats.perdus) : '—';
  const panierMoyen = stats?.gagnes > 0 ? Math.round(stats.ca / stats.gagnes) : 0;
  const pill = periode === 't1' ? 'T1 2026' : periode === 't2' ? 'T2 2026' : 'YTD 2026';

  const fbtn = (active, borderColor) => ({
    background: active ? '#2E8BE6' : 'rgba(255,255,255,0.07)',
    border: `0.5px solid ${active ? '#2E8BE6' : (borderColor || 'rgba(255,255,255,0.15)')}`,
    color: active ? 'white' : (borderColor || 'rgba(255,255,255,0.65)'),
    fontSize: 11, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
  });

  const panel = {
    background: 'white', borderRadius: 10,
    padding: '12px 14px', border: '0.5px solid #c7d9f5',
  };

  const mc = { ...panel, borderRadius: 8 };

  const thStyle = (right) => ({
    color: '#4b6fa8', fontWeight: 400,
    textAlign: right ? 'right' : 'left',
    padding: '3px 6px 6px',
    borderBottom: '0.5px solid #c7d9f5',
    fontSize: 11,
  });

  const tdStyle = (right, bold) => ({
    padding: '5px 6px',
    borderBottom: '0.5px solid #eef4fd',
    color: '#0f1f3d',
    textAlign: right ? 'right' : 'left',
    fontWeight: bold ? 600 : 400,
  });

  return (
    <div style={{ background: '#eef4fd', minHeight: '100vh', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>

      {/* HEADER */}
      <div style={{ background: '#0f1f3d', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={LOGO} alt="Kwala" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }} />
        <span style={{ color: 'white', fontSize: 14, fontWeight: 500, flex: 1 }}>Kwala Dashboard</span>
        <span style={{ background: '#2E8BE6', color: 'white', fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>{pill}</span>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>màj {updatedAt}</span>
        <a href={SHEET_URL} target="_blank" rel="noreferrer"
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginLeft: 8, textDecoration: 'none', border: '0.5px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '2px 7px' }}>
          ↗ Sheet
        </a>
      </div>

      {/* FILTRES */}
      <div style={{ background: '#0f1f3d', padding: '6px 16px 10px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={fbtn(coach === 'tous')} onClick={() => setCoach('tous')}>Tous</button>
        {COACHES.map(c => (
          <button key={c}
            style={fbtn(coach === c, COACH_COLORS[c])}
            onClick={() => setCoach(c)}>
            {c}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {['ytd', 't1', 't2'].map(p => (
          <button key={p} style={fbtn(periode === p)}
            onClick={() => setPeriode(p)}>
            {p === 'ytd' ? 'YTD' : p.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#4b6fa8' }}>Chargement…</div>
      ) : (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* HERO */}
          <div style={{ display: 'flex', gap: 10, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>

            <div style={{ background: '#0f1f3d', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: isMobile ? '1 1 100%' : 1.3 }}>
              <ArcGauge value={stats?.ca || 0} max={objCA} size={150}
                label={`CA signé — obj. ${fmtCA(objCA)}`}
                sub={`${fmtCA(stats?.ca || 0)} / ${fmtCA(objCA)}`}
                gradient />
            </div>

            <div style={{ background: '#162b4d', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', flex: isMobile ? '1 1 calc(50% - 5px)' : 0.9 }}>
              <ArcGauge value={stats?.rdv || 0} max={objRDV} size={120}
                label={`RDV réalisés — obj. ${objRDV}`}
                sub={`${stats?.rdv || 0} / ${objRDV} RDV`}
                color="#2E8BE6" />
            </div>

            <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 7, flex: isMobile ? '1 1 100%' : 1, flexWrap: 'wrap' }}>
              <div style={mc}>
                <div style={{ color: '#4b6fa8', fontSize: 10, marginBottom: 3 }}>Deals gagnés</div>
                <div style={{ color: '#0f1f3d', fontSize: 18, fontWeight: 600 }}>{stats?.gagnes || 0}</div>
                <div style={{ color: '#7da3c8', fontSize: 10, marginTop: 1 }}>Conv. {taux}</div>
              </div>
              <div style={mc}>
                <div style={{ color: '#4b6fa8', fontSize: 10, marginBottom: 3 }}>Panier moyen</div>
                <div style={{ color: '#0f1f3d', fontSize: 18, fontWeight: 600 }}>{fmtCA(panierMoyen)}</div>
              </div>
              <div style={mc}>
                <div style={{ color: '#4b6fa8', fontSize: 10, marginBottom: 3 }}>Pipe estimé</div>
                <div style={{ color: '#0f1f3d', fontSize: 18, fontWeight: 600 }}>{fmtCA(stats?.caEncours || 0)}</div>
                <div style={{ color: '#7da3c8', fontSize: 10, marginTop: 1 }}>{stats?.encours || 0} deals en cours</div>
              </div>
            </div>
          </div>

          {/* OFFRES + DEALS SIGNÉS */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1.6fr', gap: 10 }}>

            <div style={panel}>
              <div style={{ color: '#0f1f3d', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Répartition par offre</div>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle(false)}>Offre</th>
                    <th style={thStyle(true)}>Deals</th>
                    <th style={thStyle(true)}>CA</th>
                    <th style={thStyle(true)}>Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {offres.map((o, i) => {
                    const conv = o.gagnes / ((o.gagnes + o.perdus) || 1);
                    return (
                      <tr key={i}>
                        <td style={tdStyle(false)}><Badge offre={o.nom} /></td>
                        <td style={tdStyle(true)}>{o.gagnes}</td>
                        <td style={tdStyle(true, true)}>{fmtCA(o.ca)}</td>
                        <td style={{ ...tdStyle(true, true), color: conv > 0.4 ? '#1D9E75' : '#E8417E' }}>
                          {fmtPct(o.gagnes, o.gagnes + o.perdus)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={panel}>
              <div style={{ color: '#0f1f3d', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Derniers deals signés</div>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle(false)}>Contact</th>
                    <th style={thStyle(false)}>Entreprise</th>
                    <th style={thStyle(false)}>Coach</th>
                    <th style={thStyle(true)}>CA</th>
                    <th style={thStyle(false)}>Offre</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?._dealsGagnes || []).map((d, i) => (
                    <tr key={i}>
                      <td style={tdStyle(false)}>{d.contact}</td>
                      <td style={tdStyle(false)}>{d.entreprise}</td>
                      <td style={tdStyle(false)}><CoachDot coach={d.coach} />{d.coach}</td>
                      <td style={tdStyle(true, true)}>{fmtCA(d.ca)}</td>
                      <td style={tdStyle(false)}><Badge offre={d.offre} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ORIGINES */}
          <div style={panel}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ color: '#0f1f3d', fontSize: 12, fontWeight: 600 }}>Origines RDV — entonnoir complet (toutes périodes)</div>
              <a href={SHEET_URL} target="_blank" rel="noreferrer"
                style={{ fontSize: 10, color: '#2E8BE6', textDecoration: 'none', border: '0.5px solid #c7d9f5', borderRadius: 6, padding: '2px 7px', flexShrink: 0 }}>
                ↗ Voir Sheet
              </a>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', minWidth: 500 }}>
                <thead>
                  <tr>
                    {['Origine', 'RDV pris', 'Taux présence', 'RDV réalisés', 'Taux conv.', 'Nb deals', 'Panier moy.', 'CA généré'].map((h, i) => (
                      <th key={h} style={{ ...thStyle(i > 0), textAlign: i === 0 ? 'left' : 'center', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {origines.map((o, i) => {
                    const tauxPresence = o.pris ? Math.round((o.realises / o.pris) * 100) : 0;
                    const tauxConv = o.realises ? Math.round((o.gagnes / o.realises) * 100) : 0;
                    const panier = o.gagnes > 0 ? Math.round(o.ca / o.gagnes) : 0;
                    return (
                      <tr key={i}>
                        <td style={{ ...tdStyle(false), color: o.nom === 'Non renseigné' ? '#7da3c8' : '#0f1f3d', fontStyle: o.nom === 'Non renseigné' ? 'italic' : 'normal' }}>{o.nom}</td>
                        <td style={{ ...tdStyle(false), textAlign: 'center' }}>{o.pris}</td>
                        <td style={{ ...tdStyle(false), textAlign: 'center', fontWeight: 500, color: tauxPresence >= 75 ? '#1D9E75' : tauxPresence >= 50 ? '#BA7517' : '#E8417E' }}>{tauxPresence}%</td>
                        <td style={{ ...tdStyle(false), textAlign: 'center' }}>{o.realises}</td>
                        <td style={{ ...tdStyle(false), textAlign: 'center', fontWeight: 500, color: tauxConv >= 40 ? '#1D9E75' : tauxConv >= 25 ? '#BA7517' : '#E8417E' }}>{tauxConv}%</td>
                        <td style={{ ...tdStyle(false), textAlign: 'center' }}>{o.gagnes}</td>
                        <td style={{ ...tdStyle(false), textAlign: 'center' }}>{panier > 0 ? fmtCA(panier) : '—'}</td>
                        <td style={{ ...tdStyle(false), textAlign: 'center', fontWeight: 600 }}>{fmtCA(o.ca)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* DEALS EN COURS */}
          <div style={panel}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ color: '#0f1f3d', fontSize: 12, fontWeight: 600 }}>Deals en cours</div>
              <span style={{ fontSize: 11, color: '#2E8BE6' }}>Pipe : {fmtCA(stats?.caEncours || 0)}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <SortableTable data={data?._dealsEnCours || []} />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}