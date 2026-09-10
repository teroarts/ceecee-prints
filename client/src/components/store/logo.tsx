import { cn } from "@/lib/utils";

export function LogoMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <img
      src="brand/favicon-96.png"
      alt=""
      className={cn("rounded-full bg-white object-contain", className)}
      aria-hidden
    />
  );
}

/**
 * Header wordmark. The logo JPG has a white background, so in dark mode it
 * sits on a white rounded badge to stay legible.
 */
export function Logo() {
  return (
    <span className="flex items-center" data-testid="link-home">
      <img
        src="brand/logo-full.webp"
        alt="CeeCee Prints logo"
        className="h-9 w-auto rounded object-contain dark:bg-white dark:px-2 dark:py-1 sm:h-10"
      />
    </span>
  );
}
