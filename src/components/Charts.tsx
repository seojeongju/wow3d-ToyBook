import { useState } from 'react';

/*
 * 차트 색은 dataviz 검증기를 통과한 값만 사용 (카드 바탕 #fffdfb 기준, 3색 all-pairs 통과).
 * 단일 계열은 보라 1색, 범주형은 보라·주황·청록 순서 고정.
 */
export const SERIES = ['#7c5cd6', '#e8673f', '#1fa37a'] as const;

interface Datum {
  label: string;
  value: number;
}

/** 단일 계열 세로 막대 (요일별 값 등). 막대마다 마우스를 올리면 값 표시 */
export function BarChart({ data, unit, height = 200 }: { data: Datum[]; unit: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 420;
  const H = height;
  const pad = { top: 16, right: 8, bottom: 28, left: 34 };
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const ticks = [0, max / 2, max];
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;
  const slot = plotW / data.length;
  const barW = Math.min(28, slot * 0.5);
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${data.map((d) => `${d.label} ${d.value}${unit}`).join(', ')}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.left - 8} y={y(t) + 4} className="axis" textAnchor="end">
              {fmt(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.left + slot * i + slot / 2;
          const top = y(d.value);
          const h = pad.top + plotH - top;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* 막대보다 넓은 히트 영역 */}
              <rect x={cx - slot / 2} y={pad.top} width={slot} height={plotH} fill="transparent" />
              <path
                d={roundedTop(cx - barW / 2, top, barW, h, Math.min(4, h))}
                fill={SERIES[0]}
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
              <text x={cx} y={H - 8} className="axis" textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
        {hover !== null && (
          <Tooltip
            x={pad.left + slot * hover + slot / 2}
            y={y(data[hover].value) - 10}
            text={`${data[hover].label} · ${data[hover].value}${unit}`}
            W={W}
          />
        )}
      </svg>
      <SrTable rows={data.map((d) => [d.label, `${d.value}${unit}`])} />
    </div>
  );
}

/** 부분-전체 비율 (조각 3개까지). 범례에 값과 비율을 함께 표시 */
export function DonutChart({ data, unit }: { data: Datum[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 70;
  const r = 44;
  let angle = -Math.PI / 2;
  const arcs = data.map((d, i) => {
    const sweep = (d.value / total) * Math.PI * 2;
    const a0 = angle;
    angle += sweep;
    return { d, i, path: arcPath(100, 100, R, r, a0, angle) };
  });
  const shown = hover !== null ? data[hover] : null;

  return (
    <div className="chart donut">
      <svg viewBox="0 0 200 200" role="img" aria-label={data.map((d) => `${d.label} ${pct(d.value, total)}`).join(', ')}>
        {arcs.map(({ d, i, path }) => (
          <path
            key={d.label}
            d={path}
            fill={SERIES[i]}
            stroke="var(--surface)"
            strokeWidth="2"
            opacity={hover === null || hover === i ? 1 : 0.45}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
        <text x="100" y="96" textAnchor="middle" className="donut-value">
          {shown ? pct(shown.value, total) : `${total}${unit}`}
        </text>
        <text x="100" y="116" textAnchor="middle" className="axis">
          {shown ? shown.label : '전체'}
        </text>
      </svg>
      <ul className="legend">
        {data.map((d, i) => (
          <li key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="swatch" style={{ background: SERIES[i] }} />
            <span className="legend-label">{d.label}</span>
            <span className="legend-value">
              {d.value}
              {unit} · {pct(d.value, total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tooltip({ x, y, text, W }: { x: number; y: number; text: string; W: number }) {
  const w = text.length * 8 + 20;
  const left = Math.min(Math.max(x - w / 2, 2), W - w - 2);
  return (
    <g pointerEvents="none">
      <rect x={left} y={y - 26} width={w} height={24} rx={8} className="tip-bg" />
      <text x={left + w / 2} y={y - 10} textAnchor="middle" className="tip-text">
        {text}
      </text>
    </g>
  );
}

function SrTable({ rows }: { rows: string[][] }) {
  return (
    <table className="sr-only">
      <tbody>
        {rows.map((r) => (
          <tr key={r[0]}>
            <th scope="row">{r[0]}</th>
            <td>{r[1]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, rad: number) {
  if (h <= 0) return '';
  return `M${x},${y + h} V${y + rad} Q${x},${y} ${x + rad},${y} H${x + w - rad} Q${x + w},${y} ${x + w},${y + rad} V${y + h} Z`;
}

function arcPath(cx: number, cy: number, R: number, r: number, a0: number, a1: number) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (rad: number, a: number) => `${cx + rad * Math.cos(a)},${cy + rad * Math.sin(a)}`;
  return `M${p(R, a0)} A${R},${R} 0 ${large} 1 ${p(R, a1)} L${p(r, a1)} A${r},${r} 0 ${large} 0 ${p(r, a0)} Z`;
}

function niceMax(v: number) {
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag / 2) * 2 * mag;
}

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const pct = (v: number, t: number) => `${Math.round((v / t) * 100)}%`;
