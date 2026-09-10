import { Link } from "wouter";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <p className="font-display text-6xl font-extrabold text-primary">404</p>
      <h1 className="mt-4 font-display text-xl font-bold">This trail doesn't exist</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you're after has moved or never was. Head back to the shop and
        pick up the trail from there.
      </p>
      <Link
        href="/shop"
        className="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Back to the shop
      </Link>
    </main>
  );
}
