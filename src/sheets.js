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
  const data = await res.json();
  return data.values || [];
}

function parseAmount(str) {
  if (!str) return 0;
  const clean = String(str).replace(/[€\s]/g, '').replace(',', '.');
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

// Parse JJ/MM/AAAA → { month: 0-11, year }
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
  const curM = now.getMonth();
  const curY = now.getFullYear();
  const d = parseDate(dateStr);
  if (!d) return periode === 'ytd'; // si pas de date, inclure en YTD seulement

  if (periode === 'ytd') return d.year === curY;
  if (periode === 'mois') return d.month === curM && d.year === curY;
  if (periode === 'mois_prec') {
    const pm = curM === 0 ? 11 : curM - 1;
    const py = curM === 0 ? curY - 1 : curY;
    return d.month === pm && d.year === py;
  }
  if (periode === 't2') return d.year === curY && d.month >= 3 && d.month <= 5;
  if (periode === 't1') return d.year === curY && d.month >= 0 && d.month <= 2;
  return true;
}

// Noms affichés pour chaque période
export function getPeriodeLabel(periode) {
  const now = new Date();
  const mois = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
  if (periode === 'ytd') return 'YTD ' + now.getFullYear();
  if (periode === 'mois') return mois[now.getMonth()];
  if (periode === 'mois_prec') {
    const pm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    return mois[pm];
  }
  if (periode === 't2') return 'T2';
  if (periode === 't1') return 'T1';
  return periode;
}

// ─── LECTURE RDV PRINCIPAL ────────────────────────────────────────────────────
export async function fetchRDVData(periode = 'ytd') {
  try {
    const rows = await fetchSheet(SHEETS_IDS.PROSPECTION, 'Liste des rendez-vous Equipe!A2:P300');
    const coaches = ['Alexis', 'Gautier', 'Mathilde', 'Jenny', 'Rémi'];

    function emptyStats() {
      return { rdv: 0, gagnes: 0, encours: 0, perdus: 0, noshow: 0, ca: 0, caEncours: 0, prescripteurCA: 0, rdvPris: 0 };
    }

    const result = { tous: emptyStats() };
    const resultPrecMois = { tous: emptyStats() };
    coaches.forEach(c => {
      result[c] = emptyStats();
      resultPrecMois[c] = emptyStats();
    });

    const dealsGagnes = [];
    const dealsEnCours = [];
    const originesMap = {};

    rows.forEach(row => {
      const prisPar    = row[0]?.trim();
      const origine    = row[1]?.trim();
      const entreprise = row[2]?.trim();
      const contact    = row[3]?.trim();
      const dateRDV    = row[5]?.trim();
      const rdvFaitPar = row[6]?.trim();
      const statut     = row[8]?.trim();
      const resultat   = row[9]?.trim();
      const offre      = row[11]?.trim();
      const caEst      = parseAmount(row[12]); // colonne M = CA estimé
      const caStr      = row[13];
      const ca         = parseAmount(caStr);

      if (!prisPar) return;

      // RDV pris — pas filtré par période
      const coachPris = coaches.find(c => prisPar === c);
      if (coachPris) result[coachPris].rdvPris++;
      result.tous.rdvPris++;

      if (statut !== 'Réalisé' && statut !== 'No show') return;

      const coach = coaches.find(c => rdvFaitPar === c) || coaches.find(c => prisPar === c);
      if (!coach) return;

      // Données mois précédent (pour delta)
      const inPrecMois = matchesPeriode(dateRDV, 'mois_prec');

      // Filtre période courante
      const inPeriode = matchesPeriode(dateRDV, periode);

      // ── Mois précédent ──
      if (inPrecMois) {
        if (statut === 'No show') {
          resultPrecMois.tous.noshow++;
          resultPrecMois[coach].noshow++;
        } else {
          resultPrecMois.tous.rdv++;
          resultPrecMois[coach].rdv++;
          if (resultat === 'Gagné') {
            resultPrecMois.tous.gagnes++; resultPrecMois.tous.ca += ca;
            resultPrecMois[coach].gagnes++; resultPrecMois[coach].ca += ca;
          } else if (resultat === 'En cours') {
            resultPrecMois.tous.encours++;
            resultPrecMois[coach].encours++;
          } else if (resultat === 'Perdu') {
            resultPrecMois.tous.perdus++;
            resultPrecMois[coach].perdus++;
          }
        }
      }

      // ── Période courante ──
      if (!inPeriode) return;

      if (statut === 'No show') {
        result.tous.noshow++;
        result[coach].noshow++;
        return;
      }

      result.tous.rdv++;
      result[coach].rdv++;

      if (resultat === 'Gagné') {
        result.tous.gagnes++;   result.tous.ca += ca;
        result[coach].gagnes++; result[coach].ca += ca;
        if (prisPar === 'Alexis' && offre === 'Prescripteur') {
          result['Alexis'].prescripteurCA += ca;
        }
        if (origine) originesMap[origine] = (originesMap[origine] || 0) + 1;
        if (ca > 0 || entreprise) {
          dealsGagnes.push({ entreprise, contact, coach: rdvFaitPar || prisPar, ca, date: dateRDV, offre });
        }
      } else if (resultat === 'En cours') {
        result.tous.encours++;
        result[coach].encours++;
        result.tous.caEncours += caEst;
        result[coach].caEncours += caEst;
        dealsEnCours.push({ entreprise, contact, coach: rdvFaitPar || prisPar, date: dateRDV, offre, caEst });
      } else if (resultat === 'Perdu') {
        result.tous.perdus++;
        result[coach].perdus++;
      }
    });

    dealsGagnes.sort((a, b) => b.ca - a.ca);
    result._dealsGagnes = dealsGagnes.slice(0, 8);
    result._dealsEnCours = dealsEnCours.slice(0, 15);
    result._origines = originesMap;
    result._precMois = resultPrecMois;

    return result;
  } catch (e) {
    console.error('fetchRDVData error:', e);
    return null;
  }
}

// ─── RÉMUNÉRATION ────────────────────────────────────────────────────────────
// Structure sheet: col 0=label, puis 4 colonnes/mois (Signé, Encaissé, vide, Temps)
// Jan = cols 1-4, Fév = cols 5-8, Mar = cols 9-12...
// Total Rem = ligne contenant "Total Rem", col Signé du mois courant
async function fetchRemuneration(sheetId) {
  try {
    const rows = await fetchSheet(sheetId, 'NEW version!A1:BZ10');
    const totalRemRow = rows.find(r => r[0]?.includes('Total Rem'));
    if (!totalRemRow) return null;
    const moisIndex = new Date().getMonth(); // 0=jan
    // 4 colonnes par mois, col Signé = 1 + moisIndex * 4
    const colSigné = 1 + moisIndex * 4;
    const val = parseAmount(totalRemRow[colSigné]);
    return val > 0 ? val : null;
  } catch (e) {
    console.error('fetchRemuneration error:', e, sheetId);
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
    console.error('fetchRemunerations error:', e);
    return {};
  }
}