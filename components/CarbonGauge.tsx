"use client";

import { ImpactGrade } from "@/lib/types";

const GRADE_COLOR: Record<ImpactGrade, string> = {
  a: "#A8E063",
  b: "#C7D96B",
  c: "#E0B94E",
  d: "#E08A3E",
  e: "#D8672B",
  unknown: "#6B7A70",
};

const GRADE_ANGLE: Record<ImpactGrade, number> = {
  a: 0.15,
  b: 0.32,
  c: 0.5,
  d: 0.7,
  e: 0.9,
  unknown: 0.5,
};

export default function CarbonGauge({
  grade,
  carbonKgPerKg,
  value,
  unitLabel,
}: {
  grade: ImpactGrade;
  carbonKgPerKg: number | null;
  value?: number | null;
  unitLabel?: string;
}) {
  const displayValue = value !== undefined ? value : carbonKgPerKg;
  const label = unitLabel ?? "kg CO₂e / kg";
  const radius = 78;
  const circumference = Math.PI * radius; // demi-cercle
  const progress = GRADE_ANGLE[grade];
  const dashOffset = circumference * (1 - progress);
  const color = GRADE_COLOR[grade];

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 200 110" className="w-56 h-32 overflow-visible">
        <path
          d="M 12 100 A 88 88 0 0 1 188 100"
          fill="none"
          stroke="#1F4D3A"
          strokeWidth="14"
          strokeLinecap="round"
          opacity={0.35}
        />
        <path
          d="M 12 100 A 88 88 0 0 1 188 100"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1), stroke 0.4s" }}
        />
      </svg>
      <div className="absolute top-9 flex flex-col items-center">
        <span className="font-display text-4xl text-sage leading-none">
          {displayValue !== null && displayValue !== undefined ? displayValue.toFixed(displayValue < 10 ? 2 : 1) : "—"}
        </span>
        <span className="text-xs text-sage/60 mt-1">{label}</span>
      </div>
    </div>
  );
}
