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

function toJSDate(str) {
  const d = parseDate(str);
  if (!d) return null;
  return new Date(d.year, d.month, d.day);
}

function matchesPeriode(dateStr, periodeKey) {
  const d = parseDate(dateStr);
  if (!d) return false;
  const now = new Date();
  const curY = now.getFullYear();
  if (periodeKey === 'ytd') return d.year === curY;
  if (periodeKey.startsWith('t')) {
    const t = parseInt(periodeKey[1]) - 1;
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

export function getPrecPeriode(periodeKey) {
  if (periodeKey === 'ytd') return null;
  if (periodeKey.startsWith('t')) {
    const t = parseInt(periodeKey[1]);
    if (t === 1) return null;
    return `t${t - 1}`;
  }
  if (periodeKey.startsWith('mois_')) {
    const ref = periodeKey.replace('mois_', '');
    const y = parseInt(ref.slice(0, 4));
    const m = parseInt(ref.slice(4)) - 1;
    const prevM = m === 0 ? 11 : m - 1;
    const prevY = m === 0 ? y - 1 : y;
    return `mois_${prevY}${String(prevM + 1).padStart(2, '0')}`;
  }
  return null;
}

function emptyStats() {
  return {
    rdv: 0, rdvPris: 0, rdvTous: 0,
    gagnes: 0, gagnesPris: 0,
    encours: 0, perdus: 0, noshow: 0,
    ca: 0, caEncours: 0, caApporte: 0,
  };
}

function isLast3Months(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return false;
  const now = new Date();
  const limit = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return new Date(d.year, d.month, 1) >= limit;
}

// Statuts "pipe actif" — remplace "En cours"
const STATUTS_PIPE = ['Chaud', 'Froid', 'A recaler'];

export async function fetchRDVData(periodeKey, precPeriodeKey) {
  try {
    // Lire jusqu'à col T (index 19) pour récupérer date début/fin
    const rows = await fetchSheet(SHEETS_IDS.PROSPECTION, 'Liste des rendez-vous Equipe!A2:T500');
    const coaches = ['Alexis', 'Gautier', 'Mathilde', 'Jenny', 'Rémi'];

    const result = { tous: emptyStats() };
    const prec   = { tous: emptyStats() };
    coaches.forEach(c => { result[c] = emptyStats(); prec[c] = emptyStats(); });

    const dealsGagnes   = [];
    const dealsGagnes3m = [];
    const dealsEnCours  = [];
    const finAccompagnement = [];
    const originesMap   = {};
    const offresMap     = {};
    let pipeTotal = 0;

    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

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
      // col P (15) = Coach attribué — ignoré
      // col Q (16) = Envoi notif — ignoré
      // col R (17) = Commentaire — ignoré
      const dateFin    = row[19]?.trim(); // col T

      if (!prisPar) return;
      const coach     = coaches.find(c => rdvFaitPar === c) || coaches.find(c => prisPar === c);
      const coachPris = coaches.find(c => prisPar === c);
      if (!coach) return;

      const isPipeActif = STATUTS_PIPE.includes(resultat);

      // Origines (toutes périodes)
      if (statut !== 'A venir') {
        if (!originesMap[origine]) originesMap[origine] = { pris: 0, realises: 0, gagnes: 0, ca: 0 };
        originesMap[origine].pris++;
        if (statut === 'Réalisé') {
          originesMap[origine].realises++;
          if (resultat === 'Gagné') { originesMap[origine].gagnes++; originesMap[origine].ca += ca; }
        }
      }

      // Deals en cours (toutes périodes) — nouveaux statuts
      if (statut === 'Réalisé' && isPipeActif) {
        const priorite = resultat === 'Chaud' ? 0 : resultat === 'A recaler' ? 1 : 2;
        dealsEnCours.push({ entreprise, contact, coach: rdvFaitPar || prisPar, date: dateRDV, offre, caEst, statut: resultat, priorite });
        if (resultat === 'Chaud') pipeTotal += caEst; // pipe = Chaud uniquement
      }

      // Fin d'accompagnement — deals Gagné avec date de fin dans les 30 prochains jours
      if (resultat === 'Gagné' && dateFin) {
        const dateFinJS = toJSDate(dateFin);
        if (dateFinJS && dateFinJS >= now && dateFinJS <= in30) {
          const joursRestants = Math.ceil((dateFinJS - now) / (1000 * 60 * 60 * 24));
          finAccompagnement.push({
            entreprise, contact, coach: rdvFaitPar || prisPar,
            dateFin, joursRestants, ca, offre
          });
        }
      }

      // Offres — tout-temps
      if (statut === 'Réalisé') {
        if (!offresMap[offre]) offresMap[offre] = { rdv: 0, gagnes: 0, perdus: 0, ca: 0 };
        offresMap[offre].rdv++;
        if (resultat === 'Gagné')  { offresMap[offre].gagnes++; offresMap[offre].ca += ca; }
        if (resultat === 'Perdu')    offresMap[offre].perdus++;
      }

      // Deals signés 3 derniers mois
      if (statut === 'Réalisé' && resultat === 'Gagné' && isLast3Months(dateSign || dateRDV)) {
        dealsGagnes3m.push({ entreprise, contact, coach: rdvFaitPar || prisPar, ca, date: dateSign || dateRDV, offre });
      }

      function accumulate(target, rdv, isGagne, isPerdu, isEnCours, isNoshow, caVal, caEstVal, pris) {
        if (isNoshow) { target.tous.noshow++; target[coach].noshow++; return; }
        if (rdv) {
          target.tous.rdv++; target[coach].rdv++;
          if (pris && target[pris]) { target[pris].rdvPris++; target.tous.rdvPris++; }
        }
        if (isGagne) {
          target.tous.gagnes++; target.tous.ca += caVal;
          target[coach].gagnes++; target[coach].ca += caVal;
          if (pris && target[pris]) {
            target[pris].gagnesPris++; target[pris].caApporte += caVal;
          }
        }
        if (isPerdu)   { target.tous.perdus++; target[coach].perdus++; }
        if (isEnCours) {
          target.tous.encours++; target.tous.caEncours += caEstVal;
          target[coach].encours++; target[coach].caEncours += caEstVal;
        }
      }

      // RDV pris sur la période — basé sur prisPar uniquement (col A)
      if (coachPris && matchesPeriode(dateRDV, periodeKey)) {
        result.tous.rdvTous++;
        result[coachPris].rdvTous++;
      }

      // Période courante
      const dateRef = resultat === 'Gagné' ? (dateSign || dateRDV) : dateRDV;
      if (matchesPeriode(dateRef, periodeKey)) {
        const isNoshow  = statut === 'No show';
        const isRealise = statut === 'Réalisé';
        const isGagne   = isRealise && resultat === 'Gagné';
        const isPerdu   = isRealise && resultat === 'Perdu';
        const isEnCours = isRealise && isPipeActif;

        accumulate(result, isRealise, isGagne, isPerdu, isEnCours, isNoshow, ca, caEst, coachPris);

        if (isGagne) dealsGagnes.push({ entreprise, contact, coach: rdvFaitPar || prisPar, ca, date: dateSign || dateRDV, offre });
      }

      // Période précédente
      if (precPeriodeKey) {
        const dateRefPrec = resultat === 'Gagné' ? (dateSign || dateRDV) : dateRDV;
        if (matchesPeriode(dateRefPrec, precPeriodeKey)) {
          const isNoshow  = statut === 'No show';
          const isRealise = statut === 'Réalisé';
          accumulate(prec, isRealise,
            isRealise && resultat === 'Gagné',
            isRealise && resultat === 'Perdu',
            isRealise && STATUTS_PIPE.includes(resultat),
            isNoshow, ca, caEst, coachPris);
        }
      }
    });

    const sortByDate = arr => arr.sort((a, b) => {
      const da = a.date?.split('/').reverse().join('') || '';
      const db = b.date?.split('/').reverse().join('') || '';
      return db.localeCompare(da);
    });

    // Tri deals en cours : Chaud > A recaler > Froid
    dealsEnCours.sort((a, b) => a.priorite - b.priorite);
    // Tri fins d'accompagnement : plus urgent en premier
    finAccompagnement.sort((a, b) => a.joursRestants - b.joursRestants);

    result._dealsGagnes        = sortByDate(dealsGagnes);
    result._dealsGagnes3m      = sortByDate(dealsGagnes3m);
    result._dealsEnCours       = dealsEnCours;
    result._finAccompagnement  = finAccompagnement;
    result._origines           = originesMap;
    result._offres             = offresMap;
    result._pipeTotal          = pipeTotal;
    result._prec               = precPeriodeKey ? prec : null;

    return result;
  } catch (e) {
    console.error('fetchRDVData error:', e);
    return null;
  }
}