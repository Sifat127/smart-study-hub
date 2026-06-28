import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Smartphone, Tablet, Monitor, RefreshCw } from "lucide-react";

type Tier = "mobile" | "tablet" | "desktop";

const BREAKPOINTS: { tier: Tier; label: string; range: string; max: number; icon: typeof Smartphone }[] = [
  { tier: "mobile", label: "Mobile", range: "≤ 767px", max: 767, icon: Smartphone },
  { tier: "tablet", label: "Tablet", range: "768 – 1023px", max: 1023, icon: Tablet },
  { tier: "desktop", label: "Desktop", range: "≥ 1024px", max: Infinity, icon: Monitor },
];

const CHECKS: { id: string; label: string; tiers: Tier[]; detail: string }[] = [
  { id: "no-aurora", label: "Aurora orbs hidden", tiers: ["mobile", "tablet"], detail: "`.aurora-orb` should not render under 1024px." },
  { id: "no-noise", label: "Noise overlay hidden", tiers: ["mobile", "tablet"], detail: "`.noise` removed for paint perf." },
  { id: "no-float", label: "Floating PDF cards static", tiers: ["mobile", "tablet"], detail: "All `animate-float*` paused." },
  { id: "no-shimmer", label: "Shimmer / glow-pulse off", tiers: ["mobile", "tablet"], detail: "Decorative loops disabled." },
  { id: "zero-transition", label: "0s transitions/animations", tiers: ["mobile", "tablet"], detail: "Computed `transition-duration` = 0 on sampled elements." },
  { id: "no-glitch", label: "No GPU stripe glitch on scroll", tiers: ["mobile", "tablet"], detail: "`content-visibility:auto` removed from `main section`." },
  { id: "no-blur", label: "Glass uses solid fallback", tiers: ["mobile", "tablet"], detail: "`backdrop-filter:none`, opaque card surface." },
  { id: "menu-instant", label: "Nav menu opens instantly", tiers: ["mobile", "tablet"], detail: "No slide-in transition." },
  { id: "tap-44", label: "Tap targets ≥ 44px", tiers: ["mobile", "tablet"], detail: "Coarse-pointer rule on buttons/links." },
  { id: "aurora-on", label: "Aurora + animations active", tiers: ["desktop"], detail: "Full ambient experience." },
  { id: "hover-lift", label: "Card hover lift works", tiers: ["desktop"], detail: "`.card-lift:hover` translateY(-4px)." },
];

function useViewport() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));
  const [h, setH] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 800));
  useEffect(() => {
    const on = () => {
      setW(window.innerWidth);
      setH(window.innerHeight);
    };
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  const tier: Tier = w <= 767 ? "mobile" : w <= 1023 ? "tablet" : "desktop";
  return { w, h, tier };
}

const STORAGE_KEY = "qa-checklist-v1";

export default function QaChecklist() {
  const { w, h, tier } = useViewport();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(JSON.parse(raw));
    } catch {}
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {}
  }, [checked]);

  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));
  const reset = () => setChecked({});

  const relevant = CHECKS.filter((c) => c.tiers.includes(tier));
  const done = relevant.filter((c) => checked[`${tier}:${c.id}`]).length;

  return (
    <Layout>
      <PageHeader
        title="Responsive QA Checklist"
        subtitle="Verify tablet & mobile breakpoints match the production build after every publish."
        badge="Internal QA"
        badgeIcon={<CheckCircle2 className="h-4 w-4" />}
      />

      <section className="container mx-auto px-4 py-8 md:py-12 relative z-10">
        {/* Live viewport */}
        <Card className="glass-strong p-5 md:p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Current viewport</div>
              <div className="font-display text-2xl md:text-3xl font-bold">
                {w} × {h}px
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Detected tier: <Badge variant="secondary" className="ml-1 capitalize">{tier}</Badge>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {BREAKPOINTS.map((b) => {
                const Icon = b.icon;
                const active = b.tier === tier;
                return (
                  <div
                    key={b.tier}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                      active ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium capitalize">{b.label}</span>
                    <span className="text-xs opacity-70">{b.range}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Progress + actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{done}</span> / {relevant.length} checks passed for{" "}
            <span className="capitalize">{tier}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reload
            </Button>
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset
            </Button>
          </div>
        </div>

        {/* Checks */}
        <div className="grid gap-3">
          {relevant.map((c) => {
            const key = `${tier}:${c.id}`;
            const isOn = !!checked[key];
            return (
              <Card
                key={c.id}
                className={`p-4 transition-colors ${isOn ? "border-accent/50 bg-accent/5" : ""}`}
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={isOn} onCheckedChange={() => toggle(key)} className="mt-1" />
                  <div className="flex-1">
                    <div className="font-medium">{c.label}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{c.detail}</div>
                    <div className="flex gap-1 mt-2">
                      {c.tiers.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px] capitalize">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </label>
              </Card>
            );
          })}
        </div>

        {/* Production parity tip */}
        <Card className="glass p-5 mt-8 text-sm">
          <div className="font-semibold mb-2">Verify against production</div>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Publish → wait ~1 min for the new bundle.</li>
            <li>
              Open this page in an incognito tab at{" "}
              <code className="text-accent">{origin || "https://your-app.lovable.app"}/qa-checklist</code>.
            </li>
            <li>Resize the browser (or use DevTools device toolbar) through all three breakpoints.</li>
            <li>Run each check; preview and production should produce identical results.</li>
          </ol>
        </Card>
      </section>
    </Layout>
  );
}
