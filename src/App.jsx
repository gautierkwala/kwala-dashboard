import React, { useState, useEffect, useCallback } from 'react';
import { fetchRDVData, fetchRemunerations, getPeriodeLabel } from './sheets';

// ─── PHOTOS ──────────────────────────────────────────────────────────────────
const PHOTOS = {
  gautier:  "data:image/jpeg;base64,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",
  alexis:   "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAB4AHgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDxaiiloATFLRRQAU5I2c4UEn2pMY68D1qWOZBH2K5yOKmUrbFRjdiiBMHe+09gR3pEijL7WYLk8ZOKeZVniCSsBzwQvI+tWrfTop5htYOMDLZxWXOzXkQ17ANKqADGOMHk1DJp5SPcWGM4B9a090FsRDM3mAHIxwyn2NVbqZsvhi9u/XjlT60udobgmZstu8YUkcNUNayyoLYK5LbSVwRzz0NZbDk4rWMrmU48rG02n4pMVZAwiinYooAlooooAKKWigB74kRUaN j6Y71pWWk/b2WKMAIvDPngH0FZtrOUn2/3yBn8a7HTgIvJj27SxJ+tc9R2OmlFNq5C/gi+Lf6J5Sitj3oHB4rr9J2mNM16VN3R5FRWkzpbO3Xy1p9zahoXAPJxUdrJiMVaHzr6YrCUWmdEZJxOSuLaWzlMRBB9K09Oe6mUBGKqKmv4A8bMMZFUbPzLZvm+aue0loj0KVRpXN1re5JVZJHB9cVzPirXLqwuJIJpHYjoGbIBrrVuFe3VgOcVzfinS47uBppOWUZ9zXRhpOMkc+LXNFnH/27LOdpYkjsanjvWaMCSTHoRWJLZyRSsFBIPOMVfsoQXXzASMdhXsKaTWh4ShZakmpwzXEwkWRgR6Gohp8m8+ZIzHt81GXA5FaFnZ+a+WJAHatJba0g+cpk9TVOpCOyMpRlLdmJa6fNMSFRjj0FdJp+jeTbecx+Ynp6Un9uRWo8u2hA9yKfD4laLIVBn1NRzPqVGHYd/YiTN8vy/Ws248KxSSBiwFaUXiYTKd6gH2qC41yNvlUA02mVc5i88NyWv7yLJA7YqhHp9zIWVN27HQ16Rb6mt1ZtCpBJ6VxGrW9xBcSyKzKAelZ1I21NG7s6Tw5o1/bQhpU2g9K3NTuWsNKmmf8AgQkVxdh4mvbXbGrsVHpXRTy/2poptp3JEiYBqWk9CoyT0Zh+Hrmb7AskoJLjOTXUWjD7OhNcVp5kW3KbuQa6ew3fZk3dQKxqLlOim9DQaRQelRiQGoyWB4pAwzXNY3JkmbzwuT16UVXdzjHaiiiwF4Cinj1oomkJ6D1GaCKKK5DpEIpKKKYCEU3FFLQB//Z",
  jenny:    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAB4AHgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDP0IH+0CO3l/1rb1BMonFZehR/8TI/9c/61u30eVT61FXZm9LoZAjpfLq2IqcIq5rm9ig8fyk+1Y6OpY4I6100kP7tvoa5EW7K7c9zVRhzmVSp7PoaMZHrVhADWHcXcNiu6e4VPq1Nj8TaYrY+2offmh0pdAjiIvdHSKtSBaxLbxFp1w22K6jY+mcVpfb4kj8x2AT1NRySXQ0VSD6lzZSbKhi1CCUgBuGGVPY1ZDocjFDl6M8y8W6t9qS5jiONkhU/QGvHb68aMSTFiMkCvZfFULWlx9pZQVuVMgPuTkV4ffWjvMbVQcHIr2MG0oHm4pXd0RWmpxXBDI7K3rnrViTVJ1jKFjtHpWCttNBIVmQg9+atJbhgNvXPOa7Yxjsc0nJPVnYeGdOe/0tpg5wfWr02mfZrBiSxbHNP8ESeRpMq8qwPOapalqMwuyGOVFc1apanJaKVxC0jONjPiMUyHS57kEryKfLeyBSQOB0xWoL1LKGMQR/NjqRxV0qUnK7MqlRRVkZNrpjxSEPhT7mumh2W9qxeVQoGcE815/quvGS4uFXJCkj8K6rwnp1xqGjwXl1HJ5TsQGIwD7iu2qoJWRz0HJu8j2X4e6pb3sM9tFIGEY3Z9M12YIPFeBfCG/On+LL2w3FY7mE9ern/AAr3oH196850VyVGj1MK74dX7f5isflpgGadtNNIrzjr5hpFKBTe9LmgYZFNoopAN2ikxS0AFJS0UAJRRRQB//Z",
  mathilde: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAB4AHgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD1y9PzisSU/OfrWxet8w+lYkjfOfrXz/2j2IfCU0PJ+tSXpzpIH+1/jUCnk/Wpbs/8Ssf739K2huRIm0M4tP8AgVXSf3tUtF4tAfc1leKfFdn4amS3nkBkPEcanqxr0JK+iMEdnAwJOD6VZJ4rwKD4iavfXe+WRra3LZLx8ED0H+NT3vxB1C5Zo4ryRIhwBuIz759a2VNmTaZ7iLmHftMqg+5q2h4BFfPdv441m2kBW9eRD03qGru/DPxFjuZVt7wpDITgA/cb6elPkaDRnqGaaTUUM6TxB1P1HpTiakQuaaTRmmk0CMzxElxL4d1CO0Ba4eBlQL1JPpRSeILia10K9mt22yrH8p9CeM0VhVlFPUzna+pervW5H0rGkbLn61p3r8j6VkMcsfrWHU9FbFRT8zfU1PcnOmj/eqqp+dvqasTnOnge9bRM5DUvk0/RjO7BQM8ntgcmvJrewuPHOtT6xfFhp0TFYFPRsV0/j3UGg8OywxtglBGPqxwf0rUt9Oj07R7K3T5IkhXGeMnGSa0TcY8y3LjBSkk9jNXTLOOJYUt02DtisnWdBhuLZ/KRVbHHFdHuR/mRgw6ZBzWbe61bWfFxJt9sZrOLlfQ65Rhy6nkmpWj217JbFtyqdwI+lUzJIZY41tX3noBnFbmqWumapI89q7xTH+JVyDXIlXt7nypWUleM11wa5NTzp80X5HsXw+8S3YsLrT7y2aOCMbkZj1B7Vf1ae+vtLnkm8l97fKsgwxrnvhxpUzWd7LJcXZt5F2+VLyrY7j0rUtZB5l7YvCtxbQNuiA6eoqFBKV+x0Tqtzd9j1r4UazLo+r6bp11q1rHb6g6yiGGJRIzA525PevpC3bMSj0Ar5J8EaCPE3jrTNA1a6gWwnnRXSGEKynP8ArFz0AHO2vs/S4VtbCCGMYSNAoH4Vo1ZGaLdGRmmuciik20AHf9KKKKACiiigD/9k=",
  remi: "data:image/jpeg;base64,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",
};

// ─── CONFIG ───────────────────────────────────────────────────────────────────
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

const COACHES = ['Alexis', 'Rémi', 'Mathilde', 'Jenny', 'Gautier'];
const OBJ_EQUIPE = { rdv: 20, ca: 30000 };
const PERIODES = [
  { value: 'ytd', label: 'YTD' },
  { value: 'mois', label: 'Ce mois' },
  { value: 't2', label: 'T2' },
  { value: 't1', label: 'T1' },
];

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────
const fmt  = n => n?.toLocaleString('fr-FR') || '0';
const fmtK = n => n >= 1000 ? `${(n/1000).toFixed(1)}k€` : `${n}€`;
const pct  = (a, b) => b > 0 ? Math.round(a / b * 100) : 0;

function Delta({ current, prev, suffix = '' }) {
  if (!prev && prev !== 0) return null;
  const diff = current - prev;
  if (diff === 0) return <span style={{ fontSize: 10, color: '#7da3c8' }}>= mois préc.</span>;
  const up = diff > 0;
  const abs = Math.abs(diff);
  const label = suffix === '€' ? (abs >= 1000 ? `${(abs/1000).toFixed(1)}k€` : `${abs}€`) : `${abs}${suffix}`;
  return (
    <span style={{ fontSize: 10, color: up ? '#1D9E75' : '#e24b4a', marginTop: 2, display: 'block' }}>
      {up ? '▲' : '▼'} {label} vs mois préc.
    </span>
  );
}

// ─── COMPOSANTS DE BASE ───────────────────────────────────────────────────────
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
        <span>{p}% objectif</span><span>obj. {max}{unit}</span>
      </div>
    </div>
  );
}

// ─── CAMEMBERT ORIGINES ───────────────────────────────────────────────────────
function PieChart({ data }) {
  if (!data || Object.keys(data).length === 0) return null;
  const total = Object.values(data).reduce((s, v) => s + v, 0);
  if (total === 0) return null;

  const COLORS = ['#2E8BE6','#1D9E75','#E8417E','#BA7517','#7F77DD','#0f1f3d','#4b6fa8','#7da3c8','#e24b4a','#f59e0b','#10b981','#8b5cf6'];
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

  let cumul = 0;
  const slices = entries.map(([label, val], i) => {
    const angle = (val / total) * 360;
    const start = cumul;
    cumul += angle;
    const r = 60;
    const cx = 80, cy = 80;
    const toRad = deg => (deg - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(toRad(start));
    const y1 = cy + r * Math.sin(toRad(start));
    const x2 = cx + r * Math.cos(toRad(start + angle));
    const y2 = cy + r * Math.sin(toRad(start + angle));
    const large = angle > 180 ? 1 : 0;
    return { label, val, path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color: COLORS[i % COLORS.length] };
  });

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <svg width={160} height={160} viewBox="0 0 160 160">
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth={1.5} />)}
      </svg>
      <div style={{ flex: 1, minWidth: 140 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 11 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: '#4b6fa8', flex: 1 }}>{s.label}</span>
            <span style={{ fontWeight: 700, color: '#0f1f3d' }}>{s.val}</span>
            <span style={{ color: '#7da3c8' }}>({pct(s.val, total)}%)</span>
          </div>
        ))}
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

  const checkPin = val => {
    if (val.length < 4) return;
    if (val === PINS[coach.toLowerCase()] || val === PINS.admin) {
      setUnlocked(true); setError(false);
    } else { setError(true); setPin(''); }
  };

  const totalRem = remu?.[coach.toLowerCase()] || cfg.fixe || 0;
  const commission = cfg.fixe !== null ? Math.max(0, totalRem - cfg.fixe) : null;
  const panierMoyen = d.gagnes > 0 ? Math.round(d.ca / d.gagnes) : 0;
  const txConv = (d.gagnes + d.perdus) > 0 ? pct(d.gagnes, d.gagnes + d.perdus) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', width: 360,
        maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
          <img src={photo} alt={coach} style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f1f3d' }}>{coach}</div>
            <div style={{ fontSize: 12, color: '#4b6fa8' }}>{cfg.role}</div>
            <Pill color={cfg.tagText} bg={cfg.tagColor}>{cfg.tag}</Pill>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#7da3c8' }}>✕</button>
        </div>

        {!unlocked ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: 13, color: '#4b6fa8', marginBottom: '1rem' }}>Code PIN pour accéder au détail</div>
            <input type="password" maxLength={4} value={pin}
              onChange={e => { setPin(e.target.value); setError(false); checkPin(e.target.value); }}
              placeholder="••••"
              style={{ width: 120, textAlign: 'center', fontSize: 22, letterSpacing: 8,
                padding: '8px 12px', border: `1.5px solid ${error ? '#e24b4a' : '#c7d9f5'}`,
                borderRadius: 8, outline: 'none', color: '#0f1f3d' }} autoFocus />
            {error && <div style={{ fontSize: 12, color: '#e24b4a', marginTop: 8 }}>PIN incorrect</div>}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              {[
                { label: 'RDV réalisés', val: d.rdv || 0 },
                ...(cfg.type === 'rc' ? [{ label: 'No-show', val: d.noshow || 0 }] : []),
                { label: 'Deals gagnés', val: d.gagnes || 0, color: '#1D9E75' },
                { label: 'Deals en cours', val: d.encours || 0, color: '#2E8BE6' },
                { label: 'Taux conversion', val: `${txConv}%` },
                { label: 'CA signé', val: fmtK(d.ca || 0), color: '#1D9E75' },
                { label: 'Panier moyen', val: panierMoyen > 0 ? fmtK(panierMoyen) : '—' },
                { label: 'Pipe en cours', val: fmtK(d.caEncours || 0), color: '#7F77DD' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between',
                  padding: '7px 0', borderBottom: '0.5px solid #e8f1fb', fontSize: 13 }}>
                  <span style={{ color: '#4b6fa8' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: color || '#0f1f3d' }}>{val}</span>
                </div>
              ))}
            </div>
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
function CoachCard({ coach, data, prevData, onClick }) {
  const cfg = COACH_CONFIG[coach];
  const d = data?.[coach] || {};
  const p = prevData?.[coach] || {};
  const color = COACH_COLORS[coach] || '#2E8BE6';
  const photo = PHOTOS[coach.toLowerCase()];
  const txConv = (d.gagnes + d.perdus) > 0 ? pct(d.gagnes, d.gagnes + d.perdus) : 0;

  return (
    <div onClick={onClick} style={{
      background: '#fff', border: '0.5px solid #c7d9f5', borderRadius: 14,
      padding: '1rem', cursor: 'pointer', transition: 'box-shadow .2s', borderTop: `3px solid ${color}`,
    }}
    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(46,139,230,.15)'}
    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <img src={photo} alt={coach} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}30` }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f1f3d' }}>{coach}</div>
          <div style={{ fontSize: 11, color: '#4b6fa8' }}>{cfg.role}</div>
          <Pill color={cfg.tagText} bg={cfg.tagColor}>{cfg.tag}</Pill>
        </div>
      </div>

      {cfg.type === 'rc' && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4b6fa8', marginBottom: 2 }}>
            <span>RDV réalisés</span><span style={{ fontWeight: 700, color: '#0f1f3d' }}>{d.rdv || 0} / 20</span>
          </div>
          <Bar value={d.rdv || 0} max={20} color={color} />
          <Delta current={d.rdv || 0} prev={p.rdv} suffix="" />
        </div>
      )}

      {(cfg.type === 'coach' || cfg.type === 'senior') && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4b6fa8', marginBottom: 2 }}>
            <span>CA signé</span><span style={{ fontWeight: 700, color: '#1D9E75' }}>{fmtK(d.ca || 0)}</span>
          </div>
          <Bar value={d.ca || 0} max={15000} color='#E8417E' />
          <div style={{ fontSize: 10, color: '#7da3c8', marginTop: 2 }}>{pct(d.ca || 0, 15000)}% obj. 15k€</div>
          <Delta current={d.ca || 0} prev={p.ca} suffix="€" />
        </div>
      )}

      {[
        { label: 'Gagnés', val: d.gagnes || 0, color: '#1D9E75', prev: p.gagnes },
        { label: 'En cours', val: d.encours || 0, color: '#2E8BE6' },
        { label: 'Conv.', val: `${txConv}%` },
      ].map(({ label, val, color: c, prev }) => (
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
  const [data, setData]           = useState(null);
  const [remu, setRemu]           = useState({});
  const [loading, setLoading]     = useState(true);
  const [lastUpdate, setLastUpdate] = useState('Chargement...');
  const [filterCoach, setFilterCoach]   = useState('tous');
  const [filterPeriode, setFilterPeriode] = useState('mois');
  const [modalCoach, setModalCoach] = useState(null);

  const load = useCallback(async () => {
    try {
      const [rdv, remuData] = await Promise.all([
        fetchRDVData(filterPeriode),
        fetchRemunerations(),
      ]);
      if (rdv) setData(rdv);
      if (remuData) setRemu(remuData);
      setLastUpdate('Mis à jour ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error(e);
      setLastUpdate('Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, [filterPeriode]);

  useEffect(() => { setLoading(true); load(); }, [filterPeriode]);
  useEffect(() => {
    const iv = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [load]);

  const tous     = data?.tous || {};
  const prevTous = data?._precMois?.tous || {};
  const txConv   = (tous.gagnes + tous.perdus) > 0 ? pct(tous.gagnes, tous.gagnes + tous.perdus) : 0;
  const prevTxConv = (prevTous.gagnes + prevTous.perdus) > 0 ? pct(prevTous.gagnes, prevTous.gagnes + prevTous.perdus) : 0;
  const panierMoyen = tous.gagnes > 0 ? Math.round(tous.ca / tous.gagnes) : 0;
  const prevPanier  = prevTous.gagnes > 0 ? Math.round(prevTous.ca / prevTous.gagnes) : 0;
  const txPresence  = tous.rdv + tous.noshow > 0 ? pct(tous.rdv, tous.rdv + tous.noshow) : 0;
  const pipeTotal   = tous.caEncours || 0;

  const dealsGagnes  = data?._dealsGagnes  || [];
  const dealsEnCours = data?._dealsEnCours || [];
  const origines     = data?._origines     || {};
  const prevData     = data?._precMois;

  const coachesFiltres = filterCoach === 'tous' ? COACHES : [filterCoach];

  return (
    <div style={{ background: '#eef4fd', minHeight: '100vh', padding: '1rem',
      fontFamily: "'system-ui', '-apple-system', sans-serif", color: '#0f1f3d' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f1f3d', letterSpacing: -0.5 }}>Kwala — Performance 2026</div>
            <div style={{ fontSize: 12, color: '#4b6fa8', marginTop: 2 }}>{lastUpdate}</div>
          </div>
          <Pill color='#1e40af' bg='#dbeafe'>T2 en cours</Pill>
        </div>

        {/* Métriques globales */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8, marginBottom: '1rem' }}>
          {[
            { label: 'RDV réalisés',  val: tous.rdv || 0,                    prev: prevTous.rdv,    color: '#2E8BE6', suffix: '',  sub: `${txPresence}% présence` },
            { label: 'Deals gagnés',  val: tous.gagnes || 0,                 prev: prevTous.gagnes, color: '#1D9E75', suffix: '',  sub: `${txConv}% conv.` },
            { label: 'CA signé',      val: fmtK(tous.ca || 0),               prev: prevTous.ca,     color: '#2E8BE6', suffix: '€', sub: 'période' },
            { label: 'Panier moyen',  val: panierMoyen > 0 ? fmtK(panierMoyen) : '—', prev: prevPanier, color: '#0f1f3d', suffix: '€', sub: 'par deal' },
            { label: 'En cours',      val: tous.encours || 0,                prev: prevTous.encours,color: '#7F77DD', suffix: '',  sub: 'deals' },
            { label: 'Pipe estimé',   val: fmtK(pipeTotal),                  prev: null,             color: '#7F77DD', suffix: '€', sub: 'CA en cours' },
            { label: 'Taux conv.',    val: `${txConv}%`,                     prev: prevTxConv,      color: '#1D9E75', suffix: '%', sub: 'réalisés→gagnés' },
          ].map(({ label, val, prev, color, suffix, sub }) => (
            <div key={label} style={{ background: '#fff', border: '0.5px solid #c7d9f5', borderRadius: 10, padding: '0.75rem' }}>
              <div style={{ fontSize: 11, color: '#4b6fa8', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
              {sub && <div style={{ fontSize: 11, color: '#7da3c8', marginTop: 1 }}>{sub}</div>}
              {typeof prev === 'number' && <Delta current={typeof val === 'number' ? val : 0} prev={prev} suffix={suffix} />}
            </div>
          ))}
        </div>

        {/* Jauges */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: '1rem' }}>
          <Gauge label="RDV équipe" value={tous.rdv || 0} max={OBJ_EQUIPE.rdv} color='#2E8BE6' />
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
                  background: active ? col : 'transparent', color: active ? '#fff' : '#2E5FA3',
                }}>{label}</button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 3, background: '#c7d9f5', borderRadius: 8, padding: 3 }}>
            {PERIODES.map(({ value, label }) => (
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
              <CoachCard key={coach} coach={coach} data={data} prevData={prevData} onClick={() => setModalCoach(coach)} />
            ))}
          </div>
        )}

        {/* Camembert origines */}
        {Object.keys(origines).length > 0 && (
          <div style={{ background: '#fff', border: '0.5px solid #c7d9f5', borderRadius: 14, padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4b6fa8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: .5 }}>
              Origine des deals gagnés
            </div>
            <PieChart data={origines} />
          </div>
        )}

        {/* Deals signés */}
        {dealsGagnes.length > 0 && (
          <div style={{ background: '#fff', border: '0.5px solid #c7d9f5', borderRadius: 14, padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4b6fa8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: .5 }}>
              Derniers deals signés
            </div>
            {dealsGagnes.slice(0, 6).map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: i < 5 ? '0.5px solid #e8f1fb' : 'none', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 2 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: COACH_COLORS[d.coach] || '#888', display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: '#0f1f3d' }}>{d.entreprise}</span>
                </div>
                <span style={{ color: '#4b6fa8', fontSize: 12, flex: 1, textAlign: 'center' }}>{d.coach}</span>
                <span style={{ fontWeight: 700, color: '#1D9E75', flex: 1, textAlign: 'right' }}>{fmtK(d.ca)}</span>
                {d.offre && <span style={{ flex: 1, textAlign: 'right' }}><Pill color='#1e40af' bg='#dbeafe'>{d.offre}</Pill></span>}
              </div>
            ))}
          </div>
        )}

        {/* Deals en cours */}
        {dealsEnCours.length > 0 && (
          <div style={{ background: '#fff', border: '0.5px solid #c7d9f5', borderRadius: 14, padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4b6fa8', textTransform: 'uppercase', letterSpacing: .5 }}>
                Deals en cours
              </div>
              {pipeTotal > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#7F77DD' }}>
                  Pipe total : {fmtK(pipeTotal)}
                </span>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#7da3c8', borderBottom: '0.5px solid #c7d9f5' }}>
                    {['Entreprise','Contact','Coach','Date RDV','Offre','CA estimé'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '5px 8px', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dealsEnCours.map((d, i) => (
                    <tr key={i} style={{ borderBottom: '0.5px solid #e8f1fb' }}>
                      <td style={{ padding: '8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{d.entreprise}</td>
                      <td style={{ padding: '8px', color: '#4b6fa8', whiteSpace: 'nowrap' }}>{d.contact || '—'}</td>
                      <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: COACH_COLORS[d.coach] || '#888', display: 'inline-block' }} />
                          {d.coach}
                        </span>
                      </td>
                      <td style={{ padding: '8px', color: '#4b6fa8', whiteSpace: 'nowrap' }}>{d.date || '—'}</td>
                      <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>{d.offre && <Pill color='#1e40af' bg='#dbeafe'>{d.offre}</Pill>}</td>
                      <td style={{ padding: '8px', fontWeight: 600, color: '#7F77DD', whiteSpace: 'nowrap' }}>
                        {d.caEst > 0 ? fmtK(d.caEst) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {modalCoach && (
        <PinModal coach={modalCoach} data={data} remu={remu} onClose={() => setModalCoach(null)} />
      )}
    </div>
  );
}
