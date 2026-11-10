export function Logo({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} role="img" aria-label="ResolveAI logo">
      <path d="M24 3 6 10v12c0 11.5 7.6 20.4 18 23 10.4-2.6 18-11.5 18-23V10L24 3Z" className="fill-secondary" />
      <path d="M24 8 11 13.2v9c0 8.6 5.5 15.4 13 17.6V8Z" className="fill-primary-foreground" fillOpacity="0.18" />
      <path d="m16 24.5 5.5 5.5L33 18.5" fill="none" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" className="stroke-gold" />
    </svg>
  );
}
