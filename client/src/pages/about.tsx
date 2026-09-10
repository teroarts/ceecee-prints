import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export default function About() {
  useEffect(() => {
    document.title = "Our story | Northline Supply Co.";
  }, []);

  return (
    <main>
      <section className="border-b border-border/70 bg-card">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Our story
          </p>
          <h1 className="mt-3 font-display text-2xl font-bold sm:text-3xl">
            We started with one very good t-shirt
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Northline began in a garage in 2021 with a single run of heavyweight
            tees printed for a trail-crew fundraiser. They were supposed to last
            a season. Three years later, people are still wearing them — and
            asking us what's next.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="space-y-6 text-base leading-relaxed text-muted-foreground">
          <p>
            Everything we make answers the same question our first tee did: can
            this be the one you reach for without thinking? That means heavier
            fabrics, quieter branding, and colors that go with the trail and the
            Tuesday commute alike.
          </p>
          <p>
            We produce in small runs — usually a few hundred pieces — so nothing
            gets warehoused for years and everything gets inspected by a person
            whose name we know. When a piece sells out, it comes back only if it
            earned it.
          </p>
          <p>
            We're still small, still independent, and still answering every
            email ourselves. If something isn't right, tell us — that feedback
            shapes the next run.
          </p>
        </div>

        <Link
          href="/shop"
          className="mt-10 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          data-testid="link-shop-about"
        >
          See what's in the shop <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </main>
  );
}
