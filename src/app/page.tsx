import Link from 'next/link';
import { ArrowRight, Shield, Clock, Vote, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatsSection } from '@/components/stats-section';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-light/50 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
              Decentralized Truth
              <span className="block text-primary mt-2">on NEAR</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-foreground-secondary max-w-2xl mx-auto">
              Nest is an optimistic oracle that enables anyone to assert truths about the world,
              with economic guarantees through bonding and dispute resolution.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/app/propose">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  Launch App
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  How It Works
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <StatsSection />

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
              How It Works
            </h2>
            <p className="mt-4 text-foreground-secondary max-w-2xl mx-auto">
              Three simple steps to decentralized truth verification
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number={1}
              icon={<Shield className="h-6 w-6" />}
              title="Propose"
              description="Make an assertion about the world and back it with a bond. Your bond shows you believe in the truth of your claim."
            />
            <StepCard
              number={2}
              icon={<Clock className="h-6 w-6" />}
              title="Verify"
              description="During the liveness period, anyone can dispute false assertions by matching the bond. Disputes go to community vote."
            />
            <StepCard
              number={3}
              icon={<CheckCircle className="h-6 w-6" />}
              title="Settle"
              description="After the liveness period or DVM vote, the assertion is settled. Winners receive the bond, losers forfeit theirs."
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                Built for NEAR
              </h2>
              <p className="mt-4 text-foreground-secondary">
                Nest leverages NEAR Protocol&apos;s fast finality and low transaction costs
                to make decentralized oracle services accessible to everyone.
              </p>
              <ul className="mt-8 space-y-4">
                <FeatureItem text="NEP-141 token bonds for economic security" />
                <FeatureItem text="Commit-reveal voting for fair dispute resolution" />
                <FeatureItem text="Flexible liveness periods (2h to 48h)" />
                <FeatureItem text="Callback support for smart contract integration" />
              </ul>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-border p-8 flex items-center justify-center">
                <Vote className="h-32 w-32 text-primary/60" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-foreground p-8 sm:p-12 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-background">
              Ready to get started?
            </h2>
            <p className="mt-4 text-background/80 max-w-xl mx-auto">
              Connect your NEAR wallet and start making assertions today.
            </p>
            <div className="mt-8">
              <Link href="/app/propose">
                <Button
                  size="lg"
                  className="bg-primary text-foreground hover:bg-primary-hover gap-2"
                >
                  Launch App
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-foreground">N</span>
              </div>
              <span className="text-xl font-semibold text-foreground">Nest</span>
            </div>
            <p className="text-sm text-foreground-muted">
              Built on NEAR Protocol. Inspired by UMA.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({
  number,
  icon,
  title,
  description,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative p-6 rounded-xl border border-border bg-surface hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary-light text-primary">
          {icon}
        </div>
        <span className="text-sm font-medium text-foreground-muted">Step {number}</span>
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-foreground-secondary">{description}</p>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-3">
      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
      <span className="text-foreground-secondary">{text}</span>
    </li>
  );
}
