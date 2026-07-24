$ cat /home/claude/repo/contentflow/components/marketing/landing-page.tsx

import Link from "next/link";
import {
  LayoutDashboard,
  Megaphone,
  FileSignature,
  Radar,
  Briefcase,
  Share2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const FEATURES = [
  {
    icon: LayoutDashboard,
    title: "Dashboard & Analytics",
    body: "Segue crescimento, alcance e engagement de todas as tuas contas ligadas (Instagram, TikTok, YouTube) num só sítio, com tendências calculadas a partir dos teus próprios dados históricos.",
  },
  {
    icon: Megaphone,
    title: "Campanhas & ROI",
    body: "Agrupa conteúdo por campanha e vê o custo por interação e por alcance face ao orçamento — sem números de receita inventados.",
  },
  {
    icon: FileSignature,
    title: "Contratos & pagamentos",
    body: "Regista contratos com criadores, prazos e pagamentos associados, para deixares de perseguir isto em folhas de cálculo.",
  },
  {
    icon: Radar,
    title: "Concorrentes",
    body: "Acompanha manualmente contas concorrentes e vê a evolução delas lado a lado com a tua.",
  },
  {
    icon: Briefcase,
    title: "Marketplace de oportunidades",
    body: "Marcas publicam oportunidades, criadores candidatam-se — com estado de candidatura e contacto direto quando aceite.",
  },
  {
    icon: Share2,
    title: "Relatórios partilháveis",
    body: "Gera um link de relatório de campanha só-leitura para enviar a um cliente, sem lhe dar acesso à tua conta.",
  },
];

// Ficheiros servidos a partir de public/marketing/ (ver instruções de upload).
const DEMO_VIDEO_URL = "/marketing/demo.mp4";
const LAUNCH_VIDEO_URL = "/marketing/launch.mp4";
const PROMO_VIDEO_URL = "/marketing/promo.mp4";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "0€",
    period: "/mês",
    tagline: "Para começar a testar, sem cartão de crédito.",
    features: [
      "1 workspace",
      "Até 2 contas sociais ligadas",
      "Dashboard, calendário e ideias",
      "Relatórios partilháveis",
    ],
    cta: "Começar grátis",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "29€",
    period: "/mês",
    tagline: "Para marcas e criadores a sério.",
    features: [
      "Contas sociais ilimitadas",
      "Campanhas + ROI",
      "Contratos & pagamentos",
      "Concorrentes",
      "Marketplace de oportunidades",
    ],
    cta: "Experimentar Pro",
    highlighted: true,
  },
  {
    id: "studio",
    name: "Studio",
    price: "79€",
    period: "/mês",
    tagline: "Para agências com várias marcas e clientes.",
    features: [
      "Tudo do Pro",
      "Workspaces ilimitados",
      "Vista de roster de marcas",
      "Discover: marketplace de criadores",
      "Suporte prioritário",
    ],
    cta: "Falar sobre Studio",
    highlighted: false,
  },
];

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo size="sm" />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
            <a href="#produto" className="hover:text-foreground">
              Produto
            </a>
            <a href="#precos" className="hover:text-foreground">
              Preços
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:pt-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
              <Badge variant="outline" className="mx-auto mb-6 lg:mx-0">
                Para criadores, marcas e agências
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                Gere o teu conteúdo, campanhas e{" "}
                <span className="text-gradient-brand">contratos</span> num só sítio
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground lg:mx-0">
                O SocialFlow junta análise de desempenho, ROI de campanhas, contratos, relatórios e
                um marketplace de oportunidades — para quem já não aguenta gerir tudo em folhas de
                cálculo e DMs.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Button asChild size="lg">
                  <Link href="/signup">Começar grátis</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/login">Já tenho conta</Link>
                </Button>
              </div>
            </div>
            <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border shadow-xl lg:max-w-none">
              <div className="flex items-center gap-1.5 border-b bg-muted/50 px-3 py-2">
                <span className="size-2.5 rounded-full bg-destructive/60" />
                <span className="size-2.5 rounded-full bg-yellow-500/60" />
                <span className="size-2.5 rounded-full bg-green-500/60" />
              </div>
              <video
                className="aspect-video w-full bg-muted object-cover"
                src={DEMO_VIDEO_URL}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            </div>
          </div>
        </section>

        {/* Vê em ação */}
        <section className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">Vê o SocialFlow em ação</h2>
              <p className="mt-3 text-muted-foreground">
                Direto da app, sem guiões — assim é mesmo a usar.
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-xl gap-8 sm:grid-cols-2">
              {[
                { url: LAUNCH_VIDEO_URL, label: "Lançamento" },
                { url: PROMO_VIDEO_URL, label: "Promo" },
              ].map((v) => (
                <div key={v.label} className="mx-auto flex flex-col items-center gap-3">
                  <div className="w-full max-w-[220px] overflow-hidden rounded-[2rem] border-8 border-foreground/90 bg-foreground/90 shadow-xl">
                    <video
                      className="aspect-9/16 w-full rounded-[1.1rem] bg-muted object-cover"
                      src={v.url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="produto" className="border-t bg-muted/30 py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">Tudo o que hoje vive em 6 abas diferentes</h2>
              <p className="mt-3 text-muted-foreground">
                Cada módulo abaixo já existe e funciona com dados reais — não são promessas de
                roadmap.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <Card key={f.title}>
                  <CardHeader>
                    <f.icon className="mb-2 size-6 text-primary" />
                    <CardTitle className="text-base">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{f.body}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="precos" className="py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight">Preços simples, por workspace</h2>
              <p className="mt-3 text-muted-foreground">
                Muda de plano quando precisares. Sem contratos anuais.
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <Card
                  key={plan.id}
                  className={
                    plan.highlighted
                      ? "border-primary shadow-md ring-1 ring-primary/30"
                      : undefined
                  }
                >
                  <CardHeader>
                    {plan.highlighted && (
                      <Badge className="mb-2 w-fit">Mais popular</Badge>
                    )}
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold tracking-tight">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </div>
                    <CardDescription>{plan.tagline}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-4">
                    <ul className="flex flex-col gap-2.5 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      asChild
                      className="mt-auto"
                      variant={plan.highlighted ? "default" : "outline"}
                    >
                      <Link href="/signup">{plan.cta}</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t bg-muted/30 py-16">
          <div className="mx-auto max-w-2xl px-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Pronto para deixar as folhas de cálculo?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Cria uma conta em menos de um minuto. Não é preciso cartão de crédito.
            </p>
            <div className="mt-6">
              <Button asChild size="lg">
                <Link href="/signup">Começar grátis</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
          <Logo size="sm" />
          <p>© {new Date().getFullYear()} SocialFlow. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
