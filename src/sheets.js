// ─── GOOGLE SHEETS — TRUSTFOLIO UNIQUEMENT ───────────────────────────────────
// Les opportunités sont désormais lues dans Airtable (voir src/airtable.js).
// Ce fichier ne sert plus qu'à la barre de progression des témoignages, qui n'a
// pas d'équivalent dans la base Airtable.

const SHEET_ID = '13r_qAdwCmtdriilX1nzL56r0eEaDX4fDw4vZx3pvfUM';
const API_KEY  = process.env.REACT_APP_GOOGLE_API_KEY;
const BASE     = 'https://sheets.googleapis.com/v4/spreadsheets';

export async function fetchTrustfolioData() {
  try {
    const range = encodeURIComponent('Trustfolio!O2:O3');
    const res = await fetch(`${BASE}/${SHEET_ID}/values/${range}?key=${API_KEY}`);
    if (!res.ok) throw new Error(`Sheets API error: ${res.status}`);
    const rows = (await res.json()).values || [];
    // O2 : objectif, O3 : actuel
    const objectif = parseInt(rows?.[0]?.[0]) || 0;
    const actuel   = parseInt(rows?.[1]?.[0]) || 0;
    return { objectif, actuel };
  } catch (e) {
    console.error('fetchTrustfolioData error:', e);
    return null;
  }
}
