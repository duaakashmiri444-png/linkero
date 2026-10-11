import React from 'react';

/**
 * The dashboard charts are drawn here rather than pulled from a charting library: the admin panel is
 * the heaviest screen in the app and a 30-point line does not justify shipping a dependency.
 */

export interface ChartPoint {
  label: string;
  value: number;
  /** Second value for the paired charts, e.g. sales sitting under revenue. */
  extra?: number;
  extraLabel?: string;
}

function maxOf(points: ChartPoint[]): number {
  return points.reduce((max, point) => Math.max(max, point.value, point.extra || 0), 0);
}

/** Hovering a day is what a owner actually wants from a sparkline, so each point carries a title. */
export const AreaChart: React.FC<{ points: ChartPoint[]; stroke?: string; fill?: string; height?: number }> = ({
  points,
  stroke = '#a855f7',
  fill = 'rgba(168,85,247,0.22)',
  height = 130
}) => {
  if (!points.length) return <p className="text-xs text-slate-500 py-8 text-center">Nothing to chart yet.</p>;

  const peak = maxOf(points) || 1;
  const step = points.length > 1 ? 100 / (points.length - 1) : 0;
  const coords = points.map((point, index) => [index * step, 34 - (point.value / peak) * 30] as const);
  const line = coords.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${line} L100,36 L0,36 Z`;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] text-slate-500">Peak {peak.toLocaleString()}</span>
        <span className="text-[11px] text-slate-500">{points.length} days</span>
      </div>
      <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="w-full" style={{ height }} role="img">
        <path d={area} fill={fill} />
        <path d={line} fill="none" stroke={stroke} strokeWidth="0.9" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {coords.map(([x, y], index) => (
          <circle key={points[index].label} cx={x} cy={y} r="1.1" fill={stroke}>
            <title>{`${points[index].label}: ${points[index].value.toLocaleString()}${
              points[index].extra !== undefined ? ` · ${points[index].extraLabel || 'extra'} ${points[index].extra}` : ''
            }`}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
};

export const BarChart: React.FC<{ points: ChartPoint[]; color?: string; height?: number }> = ({
  points,
  color = '#22d3ee',
  height = 130
}) => {
  if (!points.length) return <p className="text-xs text-slate-500 py-8 text-center">Nothing to chart yet.</p>;

  const peak = maxOf(points) || 1;
  const width = 100 / points.length;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[11px] text-slate-500">Busiest day {peak.toLocaleString()}</span>
        <span className="text-[11px] text-slate-500">{points.length} days</span>
      </div>
      <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="w-full" style={{ height }} role="img">
        {points.map((point, index) => {
          const barHeight = (point.value / peak) * 32;
          return (
            <rect
              key={point.label}
              x={index * width + width * 0.22}
              y={34 - barHeight}
              width={width * 0.56}
              height={Math.max(barHeight, point.value > 0 ? 0.6 : 0)}
              rx="0.6"
              fill={color}
              opacity={point.value > 0 ? 0.9 : 0.18}
            >
              <title>{`${point.label}: ${point.value.toLocaleString()}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
        <span>{points[0]?.label}</span>
        <span>{points[points.length - 1]?.label}</span>
      </div>
    </div>
  );
};

/** A horizontal share bar — used for the catalogue mix, where a pie chart would be unreadable. */
export const ShareBar: React.FC<{ slices: Array<{ label: string; value: number; color: string }> }> = ({ slices }) => {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  return (
    <div>
      <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
        {slices.map(slice => (
          <span key={slice.label} style={{ width: `${(slice.value / total) * 100}%`, background: slice.color }} title={`${slice.label}: ${slice.value}`} />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {slices.map(slice => (
          <li key={slice.label} className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full" style={{ background: slice.color }} />
            {slice.label}
            <span className="text-white font-semibold">{slice.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Null delta means "there was nothing to compare against", which is not the same as zero change. */
export const Delta: React.FC<{ value: number | null | undefined }> = ({ value }) => {
  if (value === null || value === undefined) {
    return <span className="text-[11px] font-semibold text-slate-500">no prior week</span>;
  }
  const up = value > 0;
  const flat = value === 0;
  return (
    <span className={`text-[11px] font-semibold ${flat ? 'text-slate-500' : up ? 'text-emerald-400' : 'text-rose-400'}`}>
      {flat ? '0%' : `${up ? '▲' : '▼'} ${Math.abs(value)}%`}
      <span className="text-slate-500 font-normal"> vs last week</span>
    </span>
  );
};
