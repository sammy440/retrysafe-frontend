/** Two stacked halves of a circle: the same handler, delivered twice. */
export function Logo({ className = "size-8", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M3 14a13 13 0 0 1 26 0Z" fill={color} />
      <path d="M3 18h26a13 13 0 0 1-26 0Z" fill={color} />
    </svg>
  );
}
