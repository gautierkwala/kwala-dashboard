// ─── AGRÉGATION DES OPPORTUNITÉS (source : Airtable) ─────────────────────────
// Les données arrivent déjà aplaties par /api/opportunites (le token Airtable
// reste côté serveur). Ce module ne fait que du calcul — même contrat de sortie
// que l'ancien sheets.js pour que App.jsx bouge le moins possible.

// Statuts "pipe actif" — valeurs du champ Résultat de la table Opportunités.
// Ne pas confondre avec l'étiquette "A recaler" : elle vit sur la table
// Contacts et ne concerne pas le pipe commercial.
//
// ⚠️ Ce sont des libellés d'options Airtable, et l'API ne renvoie que le nom,
// jamais l'ID. Un renommage dans Airtable casse donc le calcul en silence —
// c'est arrivé le 31/08/2026 quand "Chaud" est devenu "Closing". On accepte
// les deux le temps que la transition soit finie ; à chaque nouveau libellé,
// c'est ici et seulement ici qu'il faut l'ajouter.
const STATUTS_CHAUD = ['Closing', 'Chaud'];
const STATUTS_PIPE  = [...STATUTS_CHAUD, 'En cours', 'Froid'];

// Ordre d'affichage des deals en cours : Closing > En cours > Froid
const PRIORITE_PIPE = { 'Closing': 0, 'Chaud': 0, 'En cours': 1, 'Froid': 2 };

// Le KPI "Pipe en cours" ne compte que les deals en phase de closing.
export function estChaud(resultat) {
  return STATUTS_CHAUD.includes(resultat);
}

export function parseAmount(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

// Airtable renvoie des dates ISO (YYYY-MM-DD).
function parseDate(iso) {
  if (!iso) return null;
  const m = String(iso).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { year: +m[1], month: +m[2] - 1, day: +m[3] };
}

function toJSDate(iso) {
  const d = parseDate(iso);
  return d ? new Date(d.year, d.month, d.day) : null;
}

// Format d'affichage attendu par les tableaux (et par leur tri) : JJ/MM/AAAA
function fmtDateFR(iso) {
  const d = parseDate(iso);
  if (!d) return '';
  return `${String(d.day).padStart(2, '0')}/${String(d.month + 1).padStart(2, '0')}/${d.year}`;
}

function matchesPeriode(iso, periodeKey) {
  const d = parseDate(iso);
  if (!d) return false;
  const curY = new Date().getFullYear();
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

function isLast3Months(iso) {
  const d = parseDate(iso);
  if (!d) return false;
  const now = new Date();
  const limit = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return new Date(d.year, d.month, 1) >= limit;
}

async function fetchOpportunites() {
  const res = await fetch('/api/opportunites');
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json()).error || ''; } catch (_) {}
    throw new Error(`API opportunités ${res.status}${detail ? ` — ${detail}` : ''}`);
  }
  const json = await res.json();
  return json.rows || [];
}

export async function fetchRDVData(periodeKey, precPeriodeKey) {
  try {
    const rows = await fetchOpportunites();
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
      const prisPar    = row.prisPar;
      const origine    = row.origine || 'Non renseigné';
      const entreprise = row.entreprise;
      const contact    = row.contact;
      const dateRDV    = row.dateRDV;
      const rdvFaitPar = row.rdvFaitPar;
      const statut     = row.statut;
      const caEst      = parseAmount(row.caEst);
      const resultat   = row.resultat;
      const dateSign   = row.dateSign;
      const offre      = row.offre || 'Non défini';
      const ca         = parseAmount(row.caSigne);
      const dateFin    = row.dateFin;

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

      // Deals en cours (toutes périodes)
      if (statut === 'Réalisé' && isPipeActif) {
        dealsEnCours.push({
          entreprise, contact, coach: rdvFaitPar || prisPar,
          date: fmtDateFR(dateRDV), offre, caEst, statut: resultat,
          priorite: PRIORITE_PIPE[resultat] ?? 3,
        });
        if (estChaud(resultat)) pipeTotal += caEst; // pipe = Closing uniquement
      }

      // Fin d'accompagnement — deals Gagné avec date de fin dans les 30 prochains jours
      if (resultat === 'Gagné' && dateFin) {
        const dateFinJS = toJSDate(dateFin);
        if (dateFinJS && dateFinJS >= now && dateFinJS <= in30) {
          const joursRestants = Math.ceil((dateFinJS - now) / (1000 * 60 * 60 * 24));
          finAccompagnement.push({
            entreprise, contact, coach: rdvFaitPar || prisPar,
            dateFin: fmtDateFR(dateFin), joursRestants, ca, offre
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
        let delai = null;
        if (dateSign && dateRDV) {
          const d1 = toJSDate(dateRDV);
          const d2 = toJSDate(dateSign);
          if (d1 && d2 && d2 >= d1) delai = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
        }
        dealsGagnes3m.push({
          entreprise, contact, coach: rdvFaitPar || prisPar, ca,
          date: fmtDateFR(dateSign || dateRDV), offre, delai
        });
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

      // RDV pris sur la période — basé sur "Pris Par" uniquement
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

        if (isGagne) dealsGagnes.push({
          entreprise, contact, coach: rdvFaitPar || prisPar, ca,
          date: fmtDateFR(dateSign || dateRDV), offre
        });
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
            isRealise && isPipeActif,
            isNoshow, ca, caEst, coachPris);
        }
      }
    });

    const sortByDate = arr => arr.sort((a, b) => {
      const da = a.date?.split('/').reverse().join('') || '';
      const db = b.date?.split('/').reverse().join('') || '';
      return db.localeCompare(da);
    });

    dealsEnCours.sort((a, b) => a.priorite - b.priorite);
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
