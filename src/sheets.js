const SHEETS_IDS = {
  PROSPECTION: '13r_qAdwCmtdriilX1nzL56r0eEaDX4fDw4vZx3pvfUM',
};

const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const BASE    = 'https://sheets.googleapis.com/v4/spreadsheets';

async function fetchSheet(sheetId, range) {
  const url = `${BASE}/${sheetId}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const json = await res.json();
  return json.values || [];
}

export function parseAmount(str) {
  if (!str) return 0;
  const clean = String(str).replace(/[€\s]/g, '').replace(',', '.');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

function parseDate(str) {
  if (!str) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0]), m = parseInt(parts[1]) - 1, y = parseInt(parts[2]);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return { day: d, month: m, year: y };
}

// Retourne true si la date correspond à la période
function matchesPeriode(dateStr, periodeKey) {
  const d = parseDate(dateStr);
  if (!d) return false;
  const now = new Date();
  const curY = now.getFullYear();

  if (periodeKey === 'ytd') {
    return d.year === curY;
  }
  if (periodeKey.startsWith('t')) {
    const t = parseInt(periodeKey[1]) - 1; // 0-indexed trimestre
    return d.year === curY && Math.floor(d.month / 3) === t;
  }
  if (periodeKey.startsWith('mois_')) {
    const ref = periodeKey.replace('mois_', '');
    const y = parseInt(ref.slice(0, 4));
    const m = parseInt(ref.slice(4)) - 1;
    return d.year === y && d.month === m;
  }
  return false;
}

// Calcule la période précédente du même type
export function getPrecPeriode(periodeKey) {
  const now = new Date();
  const curY = now.getFullYear();

  if (periodeKey === 'ytd') {
    // YTD N-1 : même nb de mois mais année précédente → on ne compare pas (pas d'historique)
    return null;
  }
  if (periodeKey.startsWith('t')) {
    const t = parseInt(periodeKey[1]);
    if (t === 1) return null; // pas de T0
    return `t${t - 1}`;
  }
  if (periodeKey.startsWith('mois_')) {
    const ref = periodeKey.replace('mois_', '');
    const y = parseInt(ref.slice(0, 4));
    const m = parseInt(ref.slice(4)) - 1; // 0-indexed
    const prevM = m === 0 ? 11 : m - 1;
    const prevY = m === 0 ? y - 1 : y;
    return `mois_${prevY}${String(prevM + 1).padStart(2, '0')}`;
  }
  return null;
}

function emptyStats() {
  return { rdv: 0, gagnes: 0, encours: 0, perdus: 0, noshow: 0, ca: 0, caEncours: 0 };
}

// Période des 3 derniers mois glissants
function isLast3Months(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return false;
  const now = new Date();
  const limit = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const dDate = new Date(d.year, d.month, 1);
  return dDate >= limit;
}

export async function fetchRDVData(periodeKey, precPeriodeKey) {
  try {
    const rows = await fetchSheet(SHEETS_IDS.PROSPECTION, 'Liste des rendez-vous Equipe!A2:Q500');
    const coaches = ['Alexis', 'Gautier', 'Mathilde', 'Jenny', 'Rémi'];

    // Stats indexées par coach + 'tous', pour période courante et précédente
    const result = { tous: emptyStats() };
    const prec   = { tous: emptyStats() };
    coaches.forEach(c => { result[c] = emptyStats(); prec[c] = emptyStats(); });

    const dealsGagnes    = [];   // période courante
    const dealsGagnes3m  = [];   // 3 derniers mois glissants
    const dealsEnCours   = [];   // tous, pas de filtre période
    const originesMap    = {};
    const offresMap      = {};

    rows.forEach(row => {
      const prisPar    = row[0]?.trim();
      const origine    = row[1]?.trim() || 'Non renseigné';
      const entreprise = row[2]?.trim();
      const contact    = row[3]?.trim();
      const dateRDV    = row[6]?.trim();
      const rdvFaitPar = row[7]?.trim();
      const statut     = row[9]?.trim();
      const resultat   = row[10]?.trim();
      const dateSign   = row[11]?.trim();
      const offre      = row[12]?.trim() || 'Non défini';
      const caEst      = parseAmount(row[13]);
      const ca         = parseAmount(row[14]);

      if (!prisPar) return;
      const coach = coaches.find(c => rdvFaitPar === c) || coaches.find(c => prisPar === c);
      if (!coach) return;

      // ── Origines (toutes périodes, hors "A venir") ──
      if (statut !== 'A venir') {
        if (!originesMap[origine]) originesMap[origine] = { pris: 0, realises: 0, gagnes: 0, ca: 0 };
        originesMap[origine].pris++;
        if (statut === 'Réalisé') {
          originesMap[origine].realises++;
          if (resultat === 'Gagné') { originesMap[origine].gagnes++; originesMap[origine].ca += ca; }
        }
      }

      // ── Deals en cours (toujours tout, indépendant de la période) ──
      if (statut === 'Réalisé' && resultat === 'En cours') {
        dealsEnCours.push({ entreprise, contact, coach: rdvFaitPar || prisPar, date: dateRDV, offre, caEst });
      }

      // ── Deals signés 3 derniers mois glissants ──
      if (statut === 'Réalisé' && resultat === 'Gagné' && isLast3Months(dateSign || dateRDV)) {
        dealsGagnes3m.push({ entreprise, contact, coach: rdvFaitPar || prisPar, ca, date: dateSign || dateRDV, offre });
      }

      // ── Fonction helper pour accumuler les stats ──
      function accumulate(target, rdv, isGagne, isPerdu, isEnCours, isNoshow, caVal, caEstVal) {
        if (isNoshow) { target.tous.noshow++; target[coach].noshow++; return; }
        if (rdv) { target.tous.rdv++; target[coach].rdv++; }
        if (isGagne)   { target.tous.gagnes++; target.tous.ca += caVal; target[coach].gagnes++; target[coach].ca += caVal; }
        if (isPerdu)   { target.tous.perdus++; target[coach].perdus++; }
        if (isEnCours) { target.tous.encours++; target.tous.caEncours += caEstVal; target[coach].encours++; target[coach].caEncours += caEstVal; }
      }

      // ── Période courante ──
      const dateRef = resultat === 'Gagné' ? (dateSign || dateRDV) : dateRDV;
      if (matchesPeriode(dateRef, periodeKey)) {
        const isNoshow  = statut === 'No show';
        const isRealise = statut === 'Réalisé';
        const isGagne   = isRealise && resultat === 'Gagné';
        const isPerdu   = isRealise && resultat === 'Perdu';
        const isEnCours = isRealise && resultat === 'En cours';

        accumulate(result, isRealise, isGagne, isPerdu, isEnCours, isNoshow, ca, caEst);

        if (isGagne) {
          if (!offresMap[offre]) offresMap[offre] = { gagnes: 0, perdus: 0, ca: 0 };
          offresMap[offre].gagnes++; offresMap[offre].ca += ca;
          dealsGagnes.push({ entreprise, contact, coach: rdvFaitPar || prisPar, ca, date: dateSign || dateRDV, offre });
        }
        if (isPerdu) {
          if (!offresMap[offre]) offresMap[offre] = { gagnes: 0, perdus: 0, ca: 0 };
          offresMap[offre].perdus++;
        }
      }

      // ── Période précédente ──
      if (precPeriodeKey) {
        const dateRefPrec = resultat === 'Gagné' ? (dateSign || dateRDV) : dateRDV;
        if (matchesPeriode(dateRefPrec, precPeriodeKey)) {
          const isNoshow  = statut === 'No show';
          const isRealise = statut === 'Réalisé';
          accumulate(prec, isRealise,
            isRealise && resultat === 'Gagné',
            isRealise && resultat === 'Perdu',
            isRealise && resultat === 'En cours',
            isNoshow, ca, caEst);
        }
      }
    });

    // Tri deals signés par date desc
    const sortByDate = arr => arr.sort((a, b) => {
      const da = a.date?.split('/').reverse().join('') || '';
      const db = b.date?.split('/').reverse().join('') || '';
      return db.localeCompare(da);
    });

    result._dealsGagnes    = sortByDate(dealsGagnes);
    result._dealsGagnes3m  = sortByDate(dealsGagnes3m);
    result._dealsEnCours   = dealsEnCours;
    result._origines       = originesMap;
    result._offres         = offresMap;
    result._prec           = precPeriodeKey ? prec : null;

    return result;
  } catch (e) {
    console.error('fetchRDVData error:', e);
    return null;
  }
}