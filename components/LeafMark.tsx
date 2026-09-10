export default function LeafMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <path
        d="M6 26C4 16 10 6 24 5c1 12-6 20-18 21z"
        fill="#A8E063"
      />
      <path
        d="M8 24C10 17 14 11 22 8"
        stroke="#0E1A14"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
