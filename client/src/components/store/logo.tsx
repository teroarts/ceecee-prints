export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label="Northline Supply Co. logo"
    >
      <rect width="32" height="32" rx="7" fill="hsl(var(--primary))" />
      <path d="M8 23 16 9l8 14h-3.4L16 14.8 11.4 23z" fill="hsl(var(--primary-foreground))" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5" data-testid="link-home">
      <LogoMark />
      <span className="font-display text-sm font-bold uppercase leading-none tracking-[0.12em] sm:text-base">
        Northline
        <span className="mt-1 hidden text-[0.68em] font-medium tracking-[0.22em] text-muted-foreground sm:block">
          Supply Co.
        </span>
      </span>
    </span>
  );
}
