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
  return { month: m, year: y };
}

function matchesPeriode(dateStr, periode) {
  const d = parseDate(dateStr);
  const now = new Date();
  const curM = now.getMonth(), curY = now.getFullYear();
  if (!d) return periode === 'ytd';
  if (periode === 'ytd') return d.year === curY;
  if (periode === 't1')  return d.year === curY && d.month >= 0 && d.month <= 2;
  if (periode === 't2')  return d.year === curY && d.month >= 3 && d.month <= 5;
  if (periode.startsWith('mois_prec_')) {
    const ref = periode.replace('mois_prec_', '');
    const y = parseInt(ref.slice(0, 4)), m = parseInt(ref.slice(4)) - 1;
    const pm = m === 0 ? 11 : m - 1;
    const py = m === 0 ? y - 1 : y;
    return d.month === pm && d.year === py;
  }
  if (periode.startsWith('mois_')) {
    const ref = periode.replace('mois_', '');
    const y = parseInt(ref.slice(0, 4)), m = parseInt(ref.slice(4)) - 1;
    return d.month === m && d.year === y;
  }
  return true;
}

export async function fetchRDVData(periode = 'mois_202605') {
  try {
    const rows = await fetchSheet(SHEETS_IDS.PROSPECTION, 'Liste des rendez-vous Equipe!A2:Q300');
    const coaches = ['Alexis', 'Gautier', 'Mathilde', 'Jenny', 'Rémi'];

    function empty() {
      return {
        rdv: 0, gagnes: 0, encours: 0, perdus: 0, noshow: 0,
        ca: 0, caEncours: 0, prescripteurCA: 0,
        // Pour taux de conversion
        realises: 0,
      };
    }

    const result = { tous: empty() };
    const resultPrec = { tous: empty() };
    coaches.forEach(c => { result[c] = empty(); resultPrec[c] = empty(); });

    const dealsGagnes  = [];
    const dealsEnCours = [];

    // originesMap: { [origine]: { pris, realises, gagnes, ca } }
    const originesMap  = {};
    const offresMap    = {};

    const precPeriode = periode.startsWith('mois_') ? 'mois_prec_' + periode.replace('mois_', '') : null;

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

      // ── Origines : comptage RDV pris (tous statuts sauf "A venir")
      // et RDV réalisés (statut === 'Réalisé')
      if (statut !== 'A venir') {
        if (!originesMap[origine]) originesMap[origine] = { pris: 0, realises: 0, gagnes: 0, ca: 0 };
        originesMap[origine].pris++;
        if (statut === 'Réalisé') {
          originesMap[origine].realises++;
          if (resultat === 'Gagné') {
            originesMap[origine].gagnes++;
            originesMap[origine].ca += ca;
          }
        }
      }

      // ── Deals en cours : liste complète, pas de filtre date ──
      if (statut === 'Réalisé' && resultat === 'En cours') {
        dealsEnCours.push({
          entreprise, contact,
          coach: rdvFaitPar || prisPar,
          date: dateRDV, offre, caEst
        });
      }

      // ── Mois précédent (delta) ──
      if (precPeriode) {
        const datePrecRef = resultat === 'Gagné' ? (dateSign || dateRDV) : dateRDV;
        if (matchesPeriode(datePrecRef, precPeriode)) {
          if (statut === 'No show') {
            resultPrec.tous.noshow++; resultPrec[coach].noshow++;
          } else if (statut === 'Réalisé') {
            resultPrec.tous.rdv++; resultPrec[coach].rdv++;
            resultPrec.tous.realises++; resultPrec[coach].realises++;
            if (resultat === 'Gagné')  { resultPrec.tous.gagnes++; resultPrec.tous.ca += ca; resultPrec[coach].gagnes++; resultPrec[coach].ca += ca; }
            if (resultat === 'Perdu')  { resultPrec.tous.perdus++; resultPrec[coach].perdus++; }
          }
        }
      }

      // ── Période courante ──
      const dateRef = resultat === 'Gagné' ? (dateSign || dateRDV) : dateRDV;
      if (!matchesPeriode(dateRef, periode)) return;
      if (statut === 'No show') { result.tous.noshow++; result[coach].noshow++; return; }
      if (statut !== 'Réalisé') return;

      result.tous.rdv++; result[coach].rdv++;
      result.tous.realises++; result[coach].realises++;

      if (resultat === 'Gagné') {
        result.tous.gagnes++; result.tous.ca += ca;
        result[coach].gagnes++; result[coach].ca += ca;
        if (prisPar === 'Alexis' && offre === 'Prescripteur') result['Alexis'].prescripteurCA += ca;
        if (!offresMap[offre]) offresMap[offre] = { gagnes: 0, perdus: 0, ca: 0 };
        offresMap[offre].gagnes++; offresMap[offre].ca += ca;
        dealsGagnes.push({
          entreprise, contact,
          coach: rdvFaitPar || prisPar,
          ca, date: dateSign || dateRDV, offre
        });
      } else if (resultat === 'En cours') {
        result.tous.encours++; result[coach].encours++;
        result.tous.caEncours += caEst; result[coach].caEncours += caEst;
      } else if (resultat === 'Perdu') {
        result.tous.perdus++; result[coach].perdus++;
        if (!offresMap[offre]) offresMap[offre] = { gagnes: 0, perdus: 0, ca: 0 };
        offresMap[offre].perdus++;
      }
    });

    dealsGagnes.sort((a, b) => {
      const da = a.date?.split('/').reverse().join('') || '';
      const db = b.date?.split('/').reverse().join('') || '';
      return db.localeCompare(da);
    });

    result._dealsGagnes  = dealsGagnes.slice(0, 10);
    result._dealsEnCours = dealsEnCours;
    result._origines     = originesMap;
    result._offres       = offresMap;
    result._precMois     = resultPrec;

    return result;
  } catch (e) {
    console.error('fetchRDVData error:', e);
    return null;
  }
}

async function fetchRemuneration(sheetId) {
  try {
    const rows = await fetchSheet(sheetId, 'NEW version!A1:BZ10');
    const row = rows.find(r => r[0]?.includes('Total Rem'));
    if (!row) return null;
    const col = 1 + new Date().getMonth() * 4;
    const val = parseAmount(row[col]);
    return val > 0 ? val : null;
  } catch (e) { return null; }
}

export async function fetchRemunerations() {
  try {
    const [mathilde, alexis, jenny] = await Promise.all([
      fetchRemuneration(SHEETS_IDS.MATHILDE),
      fetchRemuneration(SHEETS_IDS.ALEXIS),
      fetchRemuneration(SHEETS_IDS.JENNY),
    ]);
    return { mathilde, alexis, jenny };
  } catch (e) { return {}; }
}