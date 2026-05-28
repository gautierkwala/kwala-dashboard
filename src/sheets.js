// ─── CONNEXION GOOGLE SHEETS ─────────────────────────────────────────────────
const SHEETS_IDS = {
  PROSPECTION: '13r_qAdwCmtdriilX1nzL56r0eEaDX4fDw4vZx3pvfUM',
  MATHILDE:    '1D-01v2Rdi1yYs0BWLVLzNYg4eMEskYA7A57AoiA7Qdg',
  ALEXIS:      '16j6zV1Uj3WU2d6uTh2sVary2_zte4tPJcSfkPNLMpAI',
  JENNY:       '1epCLZjG6HzPkPjJ86POim-gaBeP1u6REoCBlrl3g5oU',
};

const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;
const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function fetchSheet(sheetId, range) {
  const url = `${BASE}/${sheetId}/values/${encodeURIComponent(range)}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
  const json = await res.json();
  return json.values || [];
}

function parseAmount(str) {
  if (!str) return 0;
  const clean = String(str).replace(/[€\s]/g, '').replace(',', '.');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

// Parse JJ/MM/AAAA
function parseDate(str) {
  if (!str) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0]), m = parseInt(parts[1]) - 1, y = parseInt(parts[2]);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
  return { month: m, year: y };
}

function matchesPeriode(dateStr, periode) {
  const now = new Date();
  const curM = now.getMonth(), curY = now.getFullYear();
  const d = parseDate(dateStr);
  if (!d) return periode === 'ytd';
  if (periode === 'ytd')      return d.year === curY;
  if (periode === 'mois')     return d.month === curM && d.year === curY;
  if (periode === 'mois_prec') {
    const pm = curM === 0 ? 11 : curM - 1;
    const py = curM === 0 ? curY - 1 : curY;
    return d.month === pm && d.year === py;
  }
  if (periode === 't2') return d.year === curY && d.month >= 3 && d.month <= 5;
  if (periode === 't1') return d.year === curY && d.month >= 0 && d.month <= 2;
  return true;
}

export async function fetchRDVData(periode = 'mois') {
  try {
    const rows = await fetchSheet(SHEETS_IDS.PROSPECTION, 'Liste des rendez-vous Equipe!A2:P300');
    const coaches = ['Alexis', 'Gautier', 'Mathilde', 'Jenny', 'Rémi'];

    function empty() {
      return { rdv: 0, gagnes: 0, encours: 0, perdus: 0, noshow: 0, ca: 0, caEncours: 0, prescripteurCA: 0, rdvPris: 0 };
    }

    const result = { tous: empty() };
    const resultPrecMois = { tous: empty() };
    coaches.forEach(c => { result[c] = empty(); resultPrecMois[c] = empty(); });

    const dealsGagnes = [];
    const dealsEnCours = [];
    // origines : toutes les lignes "Réalisé", sans filtre période
    const originesMap = {}; // { origine: { rdv: N, ca: N } }

    rows.forEach(row => {
      const prisPar    = row[0]?.trim();
      const origine    = row[1]?.trim() || 'Non renseigné';
      const entreprise = row[2]?.trim();
      const contact    = row[3]?.trim();
      const dateRDV    = row[5]?.trim();
      const rdvFaitPar = row[6]?.trim();
      const statut     = row[8]?.trim();
      const resultat   = row[9]?.trim();
      const offre      = row[11]?.trim();
      const caEst      = parseAmount(row[12]);
      const ca         = parseAmount(row[13]);

      if (!prisPar) return;

      const coach = coaches.find(c => rdvFaitPar === c) || coaches.find(c => prisPar === c);
      if (!coach) return;

      // ── Origines : tous les RDV réalisés, sans filtre ──
      if (statut === 'Réalisé') {
        if (!originesMap[origine]) originesMap[origine] = { rdv: 0, ca: 0 };
        originesMap[origine].rdv++;
        if (resultat === 'Gagné') originesMap[origine].ca += ca;
      }

      // ── Mois précédent ──
      if (matchesPeriode(dateRDV, 'mois_prec') && (statut === 'Réalisé' || statut === 'No show')) {
        if (statut === 'No show') {
          resultPrecMois.tous.noshow++; resultPrecMois[coach].noshow++;
        } else {
          resultPrecMois.tous.rdv++; resultPrecMois[coach].rdv++;
          if (resultat === 'Gagné') { resultPrecMois.tous.gagnes++; resultPrecMois.tous.ca += ca; resultPrecMois[coach].gagnes++; resultPrecMois[coach].ca += ca; }
          else if (resultat === 'En cours') { resultPrecMois.tous.encours++; resultPrecMois[coach].encours++; }
          else if (resultat === 'Perdu') { resultPrecMois.tous.perdus++; resultPrecMois[coach].perdus++; }
        }
      }

      // ── Période courante ──
      if (statut !== 'Réalisé' && statut !== 'No show') return;
      if (!matchesPeriode(dateRDV, periode)) return;

      if (statut === 'No show') {
        result.tous.noshow++; result[coach].noshow++; return;
      }

      result.tous.rdv++; result[coach].rdv++;

      if (resultat === 'Gagné') {
        result.tous.gagnes++; result.tous.ca += ca;
        result[coach].gagnes++; result[coach].ca += ca;
        if (prisPar === 'Alexis' && offre === 'Prescripteur') result['Alexis'].prescripteurCA += ca;
        dealsGagnes.push({ entreprise, contact, coach: rdvFaitPar || prisPar, ca, date: dateRDV, offre });
      } else if (resultat === 'En cours') {
        result.tous.encours++; result[coach].encours++;
        result.tous.caEncours += caEst; result[coach].caEncours += caEst;
        dealsEnCours.push({ entreprise, contact, coach: rdvFaitPar || prisPar, date: dateRDV, offre, caEst });
      } else if (resultat === 'Perdu') {
        result.tous.perdus++; result[coach].perdus++;
      }
    });

    dealsGagnes.sort((a, b) => b.ca - a.ca);
    result._dealsGagnes  = dealsGagnes.slice(0, 10);
    result._dealsEnCours = dealsEnCours.slice(0, 20);
    result._origines     = originesMap;
    result._precMois     = resultPrecMois;

    return result;
  } catch (e) {
    console.error('fetchRDVData error:', e);
    return null;
  }
}

// 4 colonnes/mois : Signé(0) Encaissé(1) vide(2) Temps(3) — col 0 = label
// Total Rem mois courant = col 1 + moisIndex*4
async function fetchRemuneration(sheetId) {
  try {
    const rows = await fetchSheet(sheetId, 'NEW version!A1:BZ10');
    const row = rows.find(r => r[0]?.includes('Total Rem'));
    if (!row) return null;
    const col = 1 + new Date().getMonth() * 4;
    const val = parseAmount(row[col]);
    return val > 0 ? val : null;
  } catch (e) {
    console.error('fetchRemuneration error:', e);
    return null;
  }
}

export async function fetchRemunerations() {
  try {
    const [mathilde, alexis, jenny] = await Promise.all([
      fetchRemuneration(SHEETS_IDS.MATHILDE),
      fetchRemuneration(SHEETS_IDS.ALEXIS),
      fetchRemuneration(SHEETS_IDS.JENNY),
    ]);
    return { mathilde, alexis, jenny };
  } catch (e) {
    return {};
  }
}