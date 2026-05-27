import React, { useState, useEffect } from 'react';
import { fetchRDVData, fetchRemunerations } from './sheets';

// ─── PHOTOS ──────────────────────────────────────────────────────────────────
const PHOTOS = {
  gautier:  "data:image/jpeg;base64,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",
  alexis:   "data:image/jpeg;base64,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",
  jenny:    "data:image/jpeg;base64,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",
  mathilde: "data:image/jpeg;base64,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",
  remi:     "data:image/jpeg;base64,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",
};

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const PINS = {
  alexis: '2601', remi: '7743', mathilde: '3812',
  jenny: '4956', gautier: '9123', admin: '9123',
};

const COACH_COLORS = {
  Alexis: '#2E8BE6', Gautier: '#1D9E75', Mathilde: '#E8417E',
  Jenny: '#BA7517', Rémi: '#7F77DD',
};

const COACH_CONFIG = {
  Alexis:   { role: 'Responsable de centre', tag: 'RC',           tagColor: '#dbeafe', tagText: '#1e40af', type: 'rc',    fixe: 2500 },
  Rémi:     { role: 'Business développeur',  tag: 'Business Dev', tagColor: '#fef3c7', tagText: '#92400e', type: 'rc',    fixe: 0    },
  Mathilde: { role: 'Coach',                 tag: 'Coach',        tagColor: '#d1fae5', tagText: '#065f46', type: 'coach', fixe: 3000 },
  Jenny:    { role: 'Coach',                 tag: 'Coach',        tagColor: '#d1fae5', tagText: '#065f46', type: 'coach', fixe: 2500 },
  Gautier:  { role: 'Coach senior',          tag: 'Coach',        tagColor: '#d1fae5', tagText: '#065f46', type: 'senior',fixe: null },
};

const MOIS_NOMS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
const COACHES = ['Alexis', 'Rémi', 'Mathilde', 'Jenny', 'Gautier'];

const OBJ_EQUIPE = { rdv: 20, ca: 30000 };

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────
const fmt = (n) => n?.toLocaleString('fr-FR') || '0';
const fmtK = (n) => n >= 1000 ? `${(n/1000).toFixed(1)}k€` : `${n}€`;
const pct = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

// ─── COMPOSANTS ───────────────────────────────────────────────────────────────
function Pill({ children, color = '#2E8BE6', bg = '#dbeafe' }) {
  return (
    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700,
      background: bg, color, display: 'inline-block', letterSpacing: .3 }}>
      {children}
    </span>
  );
}

function Bar({ value, max, color = '#2E8BE6', height = 6 }) {
  const w = Math.min(100, pct(value, max));
  return (
    <div style={{ background: '#dbeafe', borderRadius: 4, height, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height, borderRadius: 4, background: color, width: `${w}%`, transition: 'width .4s' }} />
    </div>
  );
}

function Gauge({ label, value, max, color = '#2E8BE6', unit = '' }) {
  const p = Math.min(100, pct(value, max));
  return (
    <div style={{ background: '#fff', border: '0.5px solid #c7d9f5', borderRadius: 12, padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#4b6fa8', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color }}>{value}{unit}</span>
      </div>
      <div style={{ background: '#dbeafe', borderRadius: 6, height: 8, overflow: 'hidden' }}>
        <div style={{ height: 8, borderRadius: 6, background: color, width: `${p}%`, transition: 'width .5s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#7da3c8' }}>
        <span>{p}% objectif</span>
        <span>obj. {max}{unit}</span>
      </div>
    </div>
  );
}

// ─── MODAL PIN ─────────────────────────────────────────────────────────────────
function PinModal({ coach, data, remu, onClose }) {
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState(false);
  const cfg = COACH_CONFIG[coach];
  const d = data?.[coach] || {};
  const photo = PHOTOS[coach.toLowerCase()];

  const checkPin = (val) => {
    if (val.length < 4) return;
    if (val === PINS[coach.toLowerCase()] || val === PINS.admin) {
      setUnlocked(true); setError(false);
    } else {
      setError(true); setPin('');
    }
  };

  const totalRem = remu?.[coach.toLowerCase()] || cfg.fixe || 0;
  const commission = cfg.fixe ? Math.max(0, totalRem - cfg.fixe) : null;
  const panierMoyen = d.gagnes > 0 ? Math.round(d.ca / d.gagnes) : 0;
  const txConv = (d.gagnes + d.perdus) > 0 ? pct(d.gagnes, d.gagnes + d.perdus) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', width: 360,
        maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <img src={photo} alt={coach} style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f1f3d' }}>{coach}</div>
            <div style={{ fontSize: 12, color: '#4b6fa8' }}>{cfg.role}</div>
            <Pill color={cfg.tagText} bg={cfg.tagColor}>{cfg.tag}</Pill>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 20, color: '#7da3c8', lineHeight: 1 }}>✕</button>
        </div>

        {!unlocked ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: 13, color: '#4b6fa8', marginBottom: '1rem' }}>
              Code PIN pour accéder au détail
            </div>
            <input type="password" maxLength={4} value={pin}
              onChange={e => { setPin(e.target.value); setError(false); checkPin(e.target.value); }}
              placeholder="••••"
              style={{ width: 120, textAlign: 'center', fontSize: 22, letterSpacing: 8,
                padding: '8px 12px', border: `1.5px solid ${error ? '#e24b4a' : '#c7d9f5'}`,
                borderRadius: 8, outline: 'none', color: '#0f1f3d' }}
              autoFocus />
            {error && <div style={{ fontSize: 12, color: '#e24b4a', marginTop: 8 }}>PIN incorrect</div>}
          </div>
        ) : (
          <>
            {/* Stats détaillées */}
            <div style={{ marginBottom: '1rem' }}>
              {[
                { label: 'RDV réalisés', val: d.rdv || 0 },
                { label: 'RDV pris', val: d.rdvPris || 0 },
                ...(cfg.type === 'rc' ? [{ label: 'No-show', val: d.noshow || 0 }] : []),
                { label: 'Deals gagnés', val: d.gagnes || 0, color: '#1D9E75' },
                { label: 'Deals en cours', val: d.encours || 0, color: '#2E8BE6' },
                { label: 'Taux de transformation', val: `${txConv}%` },
                { label: 'CA signé', val: fmtK(d.ca || 0), color: '#1D9E75' },
                { label: 'Panier moyen', val: panierMoyen > 0 ? fmtK(panierMoyen) : '—' },
                { label: 'Temps coaching', val: '0j' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '7px 0', borderBottom: '0.5px solid #e8f1fb', fontSize: 13 }}>
                  <span style={{ color: '#4b6fa8' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: color || '#0f1f3d' }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Barre CA (coaches) */}
            {(cfg.type === 'coach' || cfg.type === 'senior') && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: 11, color: '#4b6fa8', marginBottom: 4 }}>CA vs objectif 15k€</div>
                <Bar value={d.ca || 0} max={15000} color='#E8417E' height={8} />
                <div style={{ fontSize: 11, color: '#7da3c8', marginTop: 4 }}>
                  {pct(d.ca || 0, 15000)}% — {fmtK(d.ca || 0)} / 15k€
                </div>
              </div>
            )}

            {/* Barre RDV (RC) */}
            {cfg.type === 'rc' && coach === 'Alexis' && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: 11, color: '#4b6fa8', marginBottom: 4 }}>RDV réalisés vs objectif 20</div>
                <Bar value={d.rdv || 0} max={20} color='#2E8BE6' height={8} />
              </div>
            )}
            {cfg.type === 'rc' && coach === 'Rémi' && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: 11, color: '#4b6fa8', marginBottom: 4 }}>RDV réalisés vs objectif 20</div>
                <Bar value={d.rdv || 0} max={20} color='#7F77DD' height={8} />
              </div>
            )}

            {/* Rémunération */}
            <div style={{ borderTop: '0.5px solid #c7d9f5', paddingTop: '1rem' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#4b6fa8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: .5 }}>
                Rémunération du mois
              </div>
              {cfg.fixe !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px',
                  background: '#f0f6ff', borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#4b6fa8' }}>Fixe mensuel</span>
                  <span style={{ fontWeight: 600, color: '#0f1f3d' }}>{fmt(cfg.fixe)} €</span>
                </div>
              )}
              {commission !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px',
                  background: '#f0f6ff', borderRadius: 8, marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#4b6fa8' }}>Commissions</span>
                  <span style={{ fontWeight: 600, color: '#1D9E75' }}>{fmt(Math.round(commission))} €</span>
                </div>
              )}
              {cfg.type === 'senior' && (
                <div style={{ fontSize: 12, color: '#7da3c8', textAlign: 'center', padding: '0.5rem' }}>
                  Pas de structure de commission définie
                </div>
              )}
              {totalRem > 0 && cfg.type !== 'senior' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
                  background: '#d1fae5', borderRadius: 8, marginTop: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#065f46' }}>Total estimé</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#065f46' }}>{fmt(Math.round(totalRem))} €</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── CARTE COACH ──────────────────────────────────────────────────────────────
function CoachCard({ coach, data, onClick }) {
  const cfg = COACH_CONFIG[coach];
  const d = data?.[coach] || {};
  const color = COACH_COLORS[coach] || '#2E8BE6';
  const photo = PHOTOS[coach.toLowerCase()];
  const txConv = (d.gagnes + d.perdus) > 0 ? pct(d.gagnes, d.gagnes + d.perdus) : 0;

  return (
    <div onClick={onClick} style={{
      background: '#fff', border: '0.5px solid #c7d9f5', borderRadius: 14,
      padding: '1rem', cursor: 'pointer', transition: 'box-shadow .2s',
      borderTop: `3px solid ${color}`,
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(46,139,230,.15)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <img src={photo} alt={coach}
          style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}30` }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f1f3d' }}>{coach}</div>
          <div style={{ fontSize: 11, color: '#4b6fa8' }}>{cfg.role}</div>
          <Pill color={cfg.tagText} bg={cfg.tagColor}>{cfg.tag}</Pill>
        </div>
      </div>

      {/* Stats selon type */}
      {(cfg.type === 'rc') && (
        <>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4b6fa8', marginBottom: 2 }}>
              <span>RDV réalisés</span>
              <span style={{ fontWeight: 700, color: '#0f1f3d' }}>{d.rdv || 0} / 20</span>
            </div>
            <Bar value={d.rdv || 0} max={20} color={color} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4b6fa8', marginBottom: 2 }}>
              <span>RDV pris</span>
              <span style={{ fontWeight: 700, color: '#0f1f3d' }}>{d.rdvPris || 0}</span>
            </div>
          </div>
        </>
      )}

      {(cfg.type === 'coach' || cfg.type === 'senior') && (
        <>
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4b6fa8', marginBottom: 2 }}>
              <span>CA signé</span>
              <span style={{ fontWeight: 700, color: '#1D9E75' }}>{fmtK(d.ca || 0)}</span>
            </div>
            <Bar value={d.ca || 0} max={15000} color='#E8417E' />
            <div style={{ fontSize: 10, color: '#7da3c8', marginTop: 2 }}>{pct(d.ca || 0, 15000)}% obj. 15k€</div>
          </div>
        </>
      )}

      {/* Stats communes */}
      {[
        { label: 'Gagnés', val: d.gagnes || 0, color: '#1D9E75' },
        { label: 'En cours', val: d.encours || 0, color: '#2E8BE6' },
        { label: 'Taux conv.', val: `${txConv}%` },
        { label: 'Coaching', val: '0j' },
      ].map(({ label, val, color: c }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
          padding: '4px 0', borderBottom: '0.5px solid #e8f1fb', fontSize: 12 }}>
          <span style={{ color: '#4b6fa8' }}>{label}</span>
          <span style={{ fontWeight: 600, color: c || '#0f1f3d' }}>{val}</span>
        </div>
      ))}

      <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: '#2E8BE6' }}>
        🔒 Détail + rémunération
      </div>
    </div>
  );
}

// ─── APP PRINCIPALE ───────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(null);
  const [remu, setRemu] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('Chargement...');
  const [filterCoach, setFilterCoach] = useState('tous');
  const [filterPeriode, setFilterPeriode] = useState('ytd');
  const [modalCoach, setModalCoach] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [rdv, remuData] = await Promise.all([fetchRDVData(), fetchRemunerations()]);
        if (rdv) setData(rdv);
        if (remuData) setRemu(remuData);
        setLastUpdate('Temps réel — ' + new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }));
      } catch (e) {
        console.error(e);
        setLastUpdate('Données statiques');
      } finally {
        setLoading(false);
      }
    }
    load();
    const iv = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  const tous = data?.tous || {};
  const panierMoyen = tous.gagnes > 0 ? Math.round(tous.ca / tous.gagnes) : 0;
  const txPresence = tous.rdv + tous.noshow > 0 ? pct(tous.rdv, tous.rdv + tous.noshow) : 0;
  const txConv = (tous.gagnes + tous.perdus) > 0 ? pct(tous.gagnes, tous.gagnes + tous.perdus) : 0;

  const dealsGagnes = data?._dealsGagnes || [];
  const dealsEnCours = data?._dealsEnCours || [];

  const coachesFiltres = filterCoach === 'tous' ? COACHES : [filterCoach];

  const periodeOpts = [
    { value: 'ytd', label: 'YTD' },
    { value: 'mai', label: 'Mai' },
    { value: 'avril', label: 'Avril' },
    { value: 't2', label: 'T2' },
  ];

  return (
    <div style={{
      background: '#eef4fd', minHeight: '100vh', padding: '1rem',
      fontFamily: "'system-ui', '-apple-system', sans-serif",
      color: '#0f1f3d',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f1f3d', letterSpacing: -0.5 }}>
              Kwala — Performance 2026
            </div>
            <div style={{ fontSize: 12, color: '#4b6fa8', marginTop: 2 }}>{lastUpdate}</div>
          </div>
          <Pill color='#1e40af' bg='#dbeafe'>T2 en cours</Pill>
        </div>

        {/* Métriques globales */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: '1rem' }}>
          {[
            { label: 'RDV réalisés', val: tous.rdv || 0, sub: `${txPresence}% présence`, color: '#2E8BE6' },
            { label: 'Deals gagnés', val: tous.gagnes || 0, sub: `${txConv}% conv.`, color: '#1D9E75' },
            { label: 'CA signé', val: fmtK(tous.ca || 0), sub: 'total période', color: '#2E8BE6' },
            { label: 'Panier moyen', val: panierMoyen > 0 ? fmtK(panierMoyen) : '—', sub: 'par deal signé', color: '#0f1f3d' },
            { label: 'En cours', val: tous.encours || 0, sub: 'deals pipe', color: '#7F77DD' },
          ].map(({ label, val, sub, color }) => (
            <div key={label} style={{ background: '#fff', border: '0.5px solid #c7d9f5', borderRadius: 10, padding: '0.75rem' }}>
              <div style={{ fontSize: 11, color: '#4b6fa8', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
              {sub && <div style={{ fontSize: 11, color: '#7da3c8', marginTop: 2 }}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Jauges équipe */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
          <Gauge label="RDV réalisés équipe" value={tous.rdv || 0} max={OBJ_EQUIPE.rdv} color='#2E8BE6' />
          <Gauge label="CA signé équipe" value={Math.round((tous.ca || 0) / 1000)} max={30} color='#1D9E75' unit='k€' />
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 3, background: '#c7d9f5', borderRadius: 8, padding: 3 }}>
            {[{ key: 'tous', label: 'Tous' }, ...COACHES.map(c => ({ key: c, label: c }))].map(({ key, label }) => {
              const active = filterCoach === key;
              const col = key === 'tous' ? '#2E8BE6' : COACH_COLORS[key];
              return (
                <button key={key} onClick={() => setFilterCoach(key)} style={{
                  padding: '5px 11px', borderRadius: 6, border: 'none', fontSize: 12,
                  fontWeight: 500, cursor: 'pointer', transition: 'all .15s',
                  background: active ? col : 'transparent',
                  color: active ? '#fff' : '#2E5FA3',
                }}>{label}</button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 3, background: '#c7d9f5', borderRadius: 8, padding: 3 }}>
            {periodeOpts.map(({ value, label }) => (
              <button key={value} onClick={() => setFilterPeriode(value)} style={{
                padding: '5px 11px', borderRadius: 6, border: 'none', fontSize: 12,
                fontWeight: 500, cursor: 'pointer', transition: 'all .15s',
                background: filterPeriode === value ? '#2E8BE6' : 'transparent',
                color: filterPeriode === value ? '#fff' : '#2E5FA3',
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Cartes coach */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#4b6fa8' }}>Chargement...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: '1rem' }}>
            {coachesFiltres.map(coach => (
              <CoachCard key={coach} coach={coach} data={data} onClick={() => setModalCoach(coach)} />
            ))}
          </div>
        )}

        {/* Deals signés récents */}
        {dealsGagnes.length > 0 && (
          <div style={{ background: '#fff', border: '0.5px solid #c7d9f5', borderRadius: 14, padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4b6fa8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>
              Derniers deals signés
            </div>
            {dealsGagnes.slice(0, 6).map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: i < Math.min(dealsGagnes.length, 6) - 1 ? '0.5px solid #e8f1fb' : 'none', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%',
                    background: COACH_COLORS[d.coach] || '#888', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: '#0f1f3d' }}>{d.entreprise}</span>
                </div>
                <span style={{ color: '#4b6fa8', fontSize: 12 }}>{d.coach}</span>
                <span style={{ fontWeight: 700, color: '#1D9E75' }}>{fmtK(d.ca)}</span>
                {d.offre && <Pill color='#1e40af' bg='#dbeafe'>{d.offre}</Pill>}
              </div>
            ))}
          </div>
        )}

        {/* Deals en cours */}
        {dealsEnCours.length > 0 && (
          <div style={{ background: '#fff', border: '0.5px solid #c7d9f5', borderRadius: 14, padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4b6fa8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>
              Deals en cours
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#7da3c8', borderBottom: '0.5px solid #c7d9f5' }}>
                    {['Entreprise', 'Contact', 'Coach', 'Date RDV', 'Offre'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dealsEnCours.map((d, i) => (
                    <tr key={i} style={{ borderBottom: '0.5px solid #e8f1fb' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{d.entreprise}</td>
                      <td style={{ padding: '8px', color: '#4b6fa8' }}>{d.contact || '—'}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%',
                            background: COACH_COLORS[d.coach] || '#888', display: 'inline-block' }} />
                          {d.coach}
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: '#4b6fa8' }}>{d.date || '—'}</td>
                      <td style={{ padding: '8px' }}>
                        {d.offre && <Pill color='#1e40af' bg='#dbeafe'>{d.offre}</Pill>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Modal */}
      {modalCoach && (
        <PinModal
          coach={modalCoach}
          data={data}
          remu={remu}
          onClose={() => setModalCoach(null)}
        />
      )}
    </div>
  );
}
