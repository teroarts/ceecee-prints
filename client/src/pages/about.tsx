import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";

export default function About() {
  useEffect(() => {
    document.title = "Our story | CeeCee Prints";
  }, []);

  return (
    <main>
      <section className="border-b border-border/70 bg-card">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="tri-stripe mb-5" aria-hidden>
            <span />
            <span />
            <span />
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Our story
          </p>
          <h1 className="mt-3 font-display text-3xl font-medium sm:text-4xl">
            It started with a print and a purpose
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            CeeCee Prints was born from a love of design and a pride of home.
            The first shirt — a hand-drawn map of Kenya — was printed for
            family. Word travelled, the runs grew, and the mission never
            changed: wear the culture, carry it everywhere.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="space-y-6 text-base leading-relaxed text-muted-foreground">
          <p>
            Every CeeCee design begins as a conversation — about the flag, the
            savannah, the shamba, the sharp boys and girls carrying it all
            forward. We draw from Maasai shields and spears, from maps and
            mountains, from tractors and tea fields, and we print them in the
            bold black, red and green that need no introduction.
          </p>
          <p>
            We print in small runs on premium ringspun cotton, so each shirt
            gets checked by a person whose name we know. When a design sells
            out, it comes back only if it earned it — and new stories are
            always waiting for their turn on the press.
          </p>
          <p>
            We're still small, still independent, and still answering every
            message ourselves. If something isn't right, tell us — that
            feedback shapes the next print.
          </p>
        </div>

        <Link
          href="/shop"
          className="mt-10 inline-flex h-11 items-center gap-2 rounded-md bg-brand-red px-6 text-sm font-semibold uppercase tracking-wide text-brand-red-foreground transition-colors hover:bg-brand-red/90"
          data-testid="link-shop-about"
        >
          See what's in the shop <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </section>
    </main>
  );
}
