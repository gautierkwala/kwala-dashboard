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

// Mois courant (0=jan)
function getCurrentMonthIndex() {
  return new Date().getMonth();
}

// ─── LECTURE RDV PRINCIPAL ────────────────────────────────────────────────────
export async function fetchRDVData() {
  try {
    const rows = await fetchSheet(SHEETS_IDS.PROSPECTION, 'Liste des rendez-vous Equipe!A2:P300');
    const coaches = ['Alexis', 'Gautier', 'Mathilde', 'Jenny', 'Rémi'];
    const result = { tous: { rdv: 0, gagnes: 0, encours: 0, perdus: 0, noshow: 0, ca: 0, prescripteurCA: 0, rdvPris: 0 } };
    coaches.forEach(c => { result[c] = { rdv: 0, gagnes: 0, encours: 0, perdus: 0, noshow: 0, ca: 0, prescripteurCA: 0, rdvPris: 0 }; });

    // Deals gagnés pour fil d'activité
    const dealsGagnes = [];
    const dealsEnCours = [];

    rows.forEach(row => {
      const prisPar   = row[0]?.trim();
      const origine   = row[1]?.trim();
      const entreprise= row[2]?.trim();
      const contact   = row[3]?.trim();
      const dateRDV   = row[5]?.trim();
      const rdvFaitPar= row[6]?.trim();
      const statut    = row[8]?.trim();
      const resultat  = row[9]?.trim();
      const offre     = row[11]?.trim();
      const caStr     = row[13];
      const ca        = parseAmount(caStr);

      if (!prisPar) return;

      // Compter RDV pris par chacun
      const coachPris = coaches.find(c => prisPar === c);
      if (coachPris) result[coachPris].rdvPris++;
      result.tous.rdvPris++;

      if (statut !== 'Réalisé' && statut !== 'No show') return;

      const coach = coaches.find(c => rdvFaitPar === c) || coaches.find(c => prisPar === c);
      if (!coach) return;

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
        // Commission prescripteur Alexis
        if (prisPar === 'Alexis' && offre === 'Prescripteur') {
          result['Alexis'].prescripteurCA += ca;
        }
        if (ca > 0) {
          dealsGagnes.push({ entreprise, contact, coach: rdvFaitPar || prisPar, ca, date: dateRDV, offre });
        }
      } else if (resultat === 'En cours') {
        result.tous.encours++;
        result[coach].encours++;
        dealsEnCours.push({ entreprise, contact, coach: rdvFaitPar || prisPar, date: dateRDV, offre });
      } else if (resultat === 'Perdu') {
        result.tous.perdus++;
        result[coach].perdus++;
      }
    });

    // Trier deals gagnés par CA desc
    dealsGagnes.sort((a, b) => b.ca - a.ca);
    result._dealsGagnes = dealsGagnes.slice(0, 8);
    result._dealsEnCours = dealsEnCours.slice(0, 10);

    return result;
  } catch (e) {
    console.error('fetchRDVData error:', e);
    return null;
  }
}

// ─── LECTURE RÉMUNÉRATION INDIVIDUELLE ───────────────────────────────────────
// Lit la ligne "Total Rem" (ligne 6, index 5) du mois courant dans l'onglet "NEW version"
// Structure: col 0=label, puis par mois: Signé(1), Encaissé(2), vide(3), Temps(4) → 5 cols/mois
// Mois: jan=col1, fév=col5, mar=col9... col = 1 + moisIndex*5 + offset(Signé=0,Encaissé=1)
async function fetchRemuneration(sheetId) {
  try {
    const rows = await fetchSheet(sheetId, 'NEW version!A1:BZ20');
    const totalRemRow = rows.find(r => r[0]?.includes('Total Rem'));
    if (!totalRemRow) return null;
    const moisIndex = getCurrentMonthIndex();
    const col = 2 + moisIndex * 5; // col "Encaissé" du mois courant (Total Rem = rémunération nette brute)
    // En fait on veut Total Rem = fixe + commission, colonne Signé (1er du groupe)
    const colSigné = 1 + moisIndex * 5;
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
