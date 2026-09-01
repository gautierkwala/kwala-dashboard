// ─── PROXY AIRTABLE ──────────────────────────────────────────────────────────
// Le token Airtable ne doit JAMAIS partir dans le bundle front : il donne accès
// à toute la base. Cette fonction serverless le garde côté serveur et ne renvoie
// au navigateur que les colonnes nécessaires, déjà aplaties.
//
// Variable d'environnement à définir sur Vercel : AIRTABLE_TOKEN
// (Personal Access Token, scope data.records:read, base appAb5Ivl3iph8OjL)

const BASE_ID = 'appAb5Ivl3iph8OjL';

const T = {
  opportunites: 'tblr97WEyGgNfCkHi',
  coachs:       'tblnEG6suYAzanE3B',
  entreprises:  'tblItTvmYPpj2LngE',
  contacts:     'tblBhjUvmtwRSJ2Q2',
};

// On adresse les colonnes par leur ID et non par leur nom : un renommage dans
// Airtable ne casse plus le dashboard.
const F = {
  prisPar:    'fldoLyAZbHKtwAq4s', // Pris Par        (lien → Coach)
  origine:    'fldj0YEklnA3ce2FX', // Origine         (select)
  entreprise: 'fldhHRBBd6JBEpEyx', // Entreprise      (lien → Entreprises)
  contact:    'fldZZ6CbvfeQYCHNI', // Contact         (lien → Contacts)
  dateRDV:    'fldvudjEcQGZZVx0h', // Date de RDV     (date)
  rdvFaitPar: 'fldOqmL3EGTJBdeH2', // RDV fait par    (lien → Coach)
  statut:     'fld4psFKDyTboaSQz', // Statut          (select)
  offre:      'fld24JVZEmb8GBK9w', // Offre cible     (select)
  caEst:      'fldfZf3SNQJypUK0W', // CA estimé       (currency)
  resultat:   'fldDHXjU5wAC5hzZ2', // Résultat        (select)
  dateSign:   'fldcxC5jK2lApO0tO', // Date décision   (date)
  caSigne:    'fldquAjtat7xky00C', // CA signé        (currency)
  dateFin:    'fldCx7gYEAYIH6xdR', // Date de fin     (date)
};

// Champ principal de chaque table liée — c'est le libellé qu'on veut afficher.
const PRIMARY = {
  [T.coachs]:      'flduDHbwtRSFxbtjg', // Nom complet
  [T.entreprises]: 'fldZ7QOsTb1AsNHlR', // Nom de l'entreprise
  [T.contacts]:    'fld0ZOLSkQazF3zll', // Nom du contact
};

async function fetchAll(token, tableId, fieldIds) {
  const out = [];
  let offset;

  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`);
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('returnFieldsByFieldId', 'true');
    fieldIds.forEach(id => url.searchParams.append('fields[]', id));
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Airtable ${res.status} sur ${tableId}: ${detail.slice(0, 200)}`);
    }
    const json = await res.json();
    out.push(...(json.records || []));
    offset = json.offset;
  } while (offset);

  return out;
}

// L'API REST renvoie les champs liés sous forme de tableaux d'IDs
// (["recXXX"]) — et non de noms, contrairement à ce que montre l'UI Airtable.
// On construit donc un index id → libellé pour chaque table liée.
async function buildLabelIndex(token, tableId) {
  const primary = PRIMARY[tableId];
  const records = await fetchAll(token, tableId, [primary]);
  const index = new Map();
  records.forEach(r => index.set(r.id, String(r.fields?.[primary] ?? '').trim()));
  return index;
}

function resolveFirst(ids, index) {
  if (!Array.isArray(ids) || !ids.length) return '';
  return index.get(ids[0]) || '';
}
function resolveJoin(ids, index) {
  if (!Array.isArray(ids) || !ids.length) return '';
  return ids.map(id => index.get(id) || '').filter(Boolean).join(', ');
}

export default async function handler(req, res) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'AIRTABLE_TOKEN manquant côté serveur' });
  }

  try {
    const [records, coachs, entreprises, contacts] = await Promise.all([
      fetchAll(token, T.opportunites, Object.values(F)),
      buildLabelIndex(token, T.coachs),
      buildLabelIndex(token, T.entreprises),
      buildLabelIndex(token, T.contacts),
    ]);

    const rows = records.map(r => {
      const f = r.fields || {};
      return {
        id:         r.id,
        prisPar:    resolveFirst(f[F.prisPar],    coachs),
        rdvFaitPar: resolveFirst(f[F.rdvFaitPar], coachs),
        entreprise: resolveJoin(f[F.entreprise],  entreprises),
        contact:    resolveJoin(f[F.contact],     contacts),
        origine:    f[F.origine] || '',
        dateRDV:    f[F.dateRDV]  || '',   // ISO YYYY-MM-DD
        dateSign:   f[F.dateSign] || '',
        dateFin:    f[F.dateFin]  || '',
        statut:     f[F.statut]   || '',
        resultat:   f[F.resultat] || '',
        offre:      f[F.offre]    || '',
        caEst:      Number(f[F.caEst])   || 0,
        caSigne:    Number(f[F.caSigne]) || 0,
      };
    });

    // Cache CDN : le dashboard peut être ouvert par plusieurs coachs en même
    // temps sans taper Airtable à chaque fois (limite de 5 req/s par base).
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ rows });
  } catch (e) {
    console.error('api/opportunites:', e);
    return res.status(502).json({ error: String(e.message || e) });
  }
}
