import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import HomeHeroSearch from "@/components/home/HomeHeroSearch";
import CuratedOpportunitySections from "@/components/opportunities/CuratedOpportunitySections";
import { getCuratedOpportunitySections } from "@/lib/queries/curated-opportunities";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";

const features = [
  {
    title: "Discover opportunities",
    description:
      "Browse competitions, workshops, internships, and programs relevant to your goals.",
    icon: "🔍",
  },
  {
    title: "Track your activities",
    description:
      "Log academic work, leadership roles, service, projects, and more in one place.",
    icon: "📋",
  },
  {
    title: "Portfolio score",
    description:
      "See a simple estimate of your portfolio strength across key categories.",
    icon: "📊",
  },
  {
    title: "AI suggestions",
    description:
      "Get practical next steps and opportunity ideas tailored to your profile.",
    icon: "✨",
  },
  {
    title: "Build your CV",
    description:
      "Generate a clean CV from your stored activities — ready to copy and refine.",
    icon: "📄",
  },
  {
    title: "Save what matters",
    description:
      "Bookmark opportunities you want to apply for and revisit them anytime.",
    icon: "🔖",
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
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-4 inline-block rounded-full bg-indigo-50 px-4 py-1 text-sm font-medium text-indigo-700">
                For students in Kathmandu · NEB · IGCSE · AS · A-Level
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                {APP_NAME}
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                {APP_TAGLINE}
              </p>
              <HomeHeroSearch />
              <div className="mt-6 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
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
              <h2 className="text-3xl font-bold text-slate-900">
                Everything you need for your portfolio
              </h2>
              <p className="mt-3 text-slate-600">
                Simple tools to help you stand out when applying to university.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="hover:border-indigo-200 transition-colors">
                  <span className="text-2xl" role="img" aria-hidden="true">
                    {feature.icon}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">
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
              <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
              <p className="mt-3 text-slate-600">Three simple steps to get started.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <Card className="bg-indigo-600 border-indigo-600 text-center text-white">
              <h2 className="text-2xl font-bold sm:text-3xl">
                Ready to build your portfolio?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-indigo-100">
                Join OpportunityHub and start discovering opportunities that match your goals.
              </p>
              <div className="mt-8">
                <Button
                  href="/signup"
                  variant="outline"
                  size="lg"
                  className="border-white bg-white text-indigo-700 hover:bg-indigo-50"
                >
                  Create your free account
                </Button>
              </div>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
