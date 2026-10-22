import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { connection } from "next/server";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import HomeHeroSearch from "@/components/home/HomeHeroSearch";
import CuratedOpportunitySections from "@/components/opportunities/CuratedOpportunitySections";
import { getCuratedOpportunitySections } from "@/lib/queries/curated-opportunities";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const features = [
  {
    number: "01",
    title: "Discover opportunities",
    description:
      "Browse competitions, workshops, internships, and programs relevant to your goals.",
  },
  {
    number: "02",
    title: "Track your activities",
    description:
      "Log academic work, leadership roles, service, projects, and more in one place.",
  },
  {
    number: "03",
    title: "Portfolio score",
    description:
      "See a simple estimate of your portfolio strength across key categories.",
  },
  {
    number: "04",
    title: "Tailored guidance",
    description:
      "Get practical next steps and opportunity ideas tailored to your profile.",
  },
  {
    number: "05",
    title: "Build your CV",
    description:
      "Generate a clean CV from your stored activities — ready to copy and refine.",
  },
  {
    number: "06",
    title: "Save what matters",
    description:
      "Bookmark opportunities you want to apply for and revisit them anytime.",
  },
];

const steps = [
  {
    step: "1",
    title: "Sign up",
    description: "Create an account with your education level and dream university.",
  },
  {
    step: "2",
    title: "Explore & save",
    description: "Browse opportunities, filter by subject or type, and save the ones you like.",
  },
  {
    step: "3",
    title: "Build your portfolio",
    description: "Add activities, check your score, get AI tips, and generate your CV.",
  },
];

export default async function HomePage() {
  // Curated opportunity data uses the server Supabase client, which reads the
  // visitor's session cookie. Wait for the request before running that query.
  await connection();

  // The landing page is marketing content with an optional listing preview: a
  // database outage (or an unconfigured Supabase) must not take the whole page
  // down with it.
  const curated = await getCuratedOpportunitySections().catch((error) => {
    console.error("Home page: curated opportunities unavailable:", error);
    return null;
  });

  return (
    <>
      <Header variant="public" />

      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-slate-200 bg-slate-50/80">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-3xl lg:text-left">
              <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-indigo-200/70 bg-indigo-50/70 px-3 py-1 text-xs font-medium tracking-wide text-indigo-900">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
                <span>Kathmandu · NEB · IGCSE · AS &amp; A-Level</span>
              </div>
              <h1 className="font-display text-4xl font-normal tracking-tight text-slate-900 sm:text-5xl">
                {APP_NAME}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
                {APP_TAGLINE}
              </p>
              <HomeHeroSearch />
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Button href="/opportunities" size="lg">
                  Browse opportunities
                </Button>
                <Button href="/signup/student" variant="outline" size="lg">
                  Sign up free
                </Button>
                <Button href="/login" variant="ghost" size="lg">
                  Log in
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Curated discovery preview */}
        {curated ? (
          <section className="border-b border-slate-200 bg-slate-50/80 py-14 sm:py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="mb-8 text-center">
                <h2 className="font-display text-2xl font-normal text-slate-900 sm:text-3xl tracking-tight">
                  Discover what students are applying to
                </h2>
                <p className="mt-2 text-slate-600">
                  Curated rows update from live saves and upcoming deadlines.
                </p>
              </div>
              <CuratedOpportunitySections
                deadlinesThisWeek={curated.deadlinesThisWeek}
                popular={curated.popular}
                featured={curated.featured}
              />
              <div className="mt-10 text-center">
                <Button href="/opportunities" variant="outline" size="lg">
                  Browse full catalog
                </Button>
              </div>
            </div>
          </section>
        ) : (
          <section className="border-b border-slate-200 bg-slate-50/80 py-10">
            <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
              <p className="text-sm text-slate-600">
                Live listings are unavailable right now. Browsing may be
                temporarily offline.
              </p>
              <div className="mt-4">
                <Button href="/opportunities" variant="outline" size="sm">
                  Try the catalog
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Features */}
        <section id="features" className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <h2 className="font-display text-3xl font-normal text-slate-900 sm:text-4xl tracking-tight">
                Everything you need for your portfolio
              </h2>
              <p className="mt-3 text-slate-600">
                Simple tools to help you stand out when applying to university.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="p-6 transition-all hover:border-slate-300"
                >
                  <div className="flex items-baseline justify-between border-b border-slate-100 pb-3">
                    <span className="font-mono text-xs font-semibold tracking-wider text-indigo-700">
                      {feature.number}
                    </span>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      Feature
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-y border-slate-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 text-center">
              <h2 className="font-display text-3xl font-normal text-slate-900 sm:text-4xl tracking-tight">How it works</h2>
              <p className="mt-3 text-slate-600">Three simple steps to get started.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((item) => (
                <div key={item.step} className="border-t border-slate-200 pt-6">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-indigo-700">
                      Step 0{item.step}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Card className="border-0 bg-[var(--brand)] p-8 text-left text-white sm:p-10">
              <div className="flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
                <div className="max-w-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-200">
                    Start simply
                  </p>
                  <h2 className="mt-3 font-display text-3xl font-normal tracking-tight text-white sm:text-4xl">
                    Build a portfolio you can stand behind.
                  </h2>
                  <p className="mt-3 text-base leading-relaxed text-slate-200">
                    Keep your activities, opportunities, and next steps in one clear place.
                  </p>
                </div>
                <Link
                  href="/signup"
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-[var(--brand)] shadow-sm transition-colors hover:bg-slate-100"
                >
                  Create an account
                </Link>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
