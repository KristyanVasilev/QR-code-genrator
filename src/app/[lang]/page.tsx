import Link from "next/link";
import { QrGenerator } from "@/components/qr/QrGenerator";
import { HeroVisual, MiniQr } from "@/components/landing/HeroVisual";
import { PricingSelector } from "@/components/billing/PricingSelector";
import {
  ArrowUpRight,
  Bolt,
  Check,
  Download,
  Grid,
  Link as LinkIcon,
  Mail,
  Message,
  Palette,
  Phone,
  Pin,
  Shield,
  Text,
  User,
  Wifi,
} from "@/components/icons";
import { PLANS, RETENTION_DAYS, TRIAL } from "@/lib/plans";
import type { QrTypeId } from "@/lib/qr/types";
import { fmt } from "@/i18n/config";
import { getI18n } from "@/i18n/server";

const TYPE_ICONS: { id: QrTypeId; icon: typeof LinkIcon }[] = [
  { id: "url", icon: LinkIcon },
  { id: "wifi", icon: Wifi },
  { id: "vcard", icon: User },
  { id: "email", icon: Mail },
  { id: "phone", icon: Phone },
  { id: "sms", icon: Message },
  { id: "location", icon: Pin },
  { id: "text", icon: Text },
];
const FEATURE_ICONS = [Bolt, Palette, Download, Grid];
const MINI_COLORS = ["#0b0b0c", "#663cf6", "#e0567a", "#0b0b0c", "#d9732f", "#663cf6"];

export default async function Home() {
  const { t, href, price } = await getI18n();
  const h = t.home;
  const trial = price(TRIAL.price);
  const starter = price(PLANS.starter.priceMonthly);
  // „14 days for €1.99“ на текущия език
  const trialShort = fmt(t.pricing.trialShort, { days: TRIAL.days, price: trial });
  const vars = {
    days: TRIAL.days,
    trial,
    n: PLANS.starter.limits.maxQrCodes ?? 0,
    price: starter,
    retention: RETENTION_DAYS,
    starter,
    pro: price(PLANS.pro.priceMonthly),
    business: price(PLANS.business.priceMonthly),
  };

  return (
    <>
      {/* ---------- Герой ---------- */}
      <section className="container hero">
        <div className="hero-proof rise">
          <span className="dots" aria-hidden>
            <span style={{ background: "#663cf6" }}>
              <LinkIcon />
            </span>
            <span style={{ background: "#ff8da4" }}>
              <Wifi />
            </span>
            <span style={{ background: "#ff9b5d" }}>
              <User />
            </span>
          </span>
          {h.proof}
        </div>
        <h1 className="rise d1">{h.title}</h1>
        <p className="rise d2">{h.subtitle}</p>
        <div className="hero-actions rise d2">
          <Link href="#generator" className="btn gradient lg">
            {h.cta} <ArrowUpRight />
          </Link>
          <Link href={href("/pricing")} className="btn outline lg">
            {h.seePricing}
          </Link>
        </div>
        <HeroVisual />
      </section>

      {/* ---------- Типове съдържание ---------- */}
      <section className="container type-strip">
        <p>{h.stripTitle}</p>
        <ul>
          {TYPE_ICONS.map(({ id, icon: Icon }) => (
            <li key={id}>
              <Icon />
              {t.qr.types[id].label}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Предимства ---------- */}
      <section id="features" className="container section">
        <div className="panel lavender">
          <div className="section-head">
            <span className="eyebrow">{h.featuresEyebrow}</span>
            <h2>{h.featuresTitle}</h2>
            <p>{h.featuresSubtitle}</p>
          </div>
          <div className="features">
            {h.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i] ?? Bolt;
              return (
                <div key={f.title} className="card feature">
                  <span className="feature-icon">
                    <Icon />
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Генератор ---------- */}
      <section id="generator" className="container" style={{ scrollMarginTop: 90 }}>
        <div className="section-head">
          <span className="eyebrow">{h.generatorEyebrow}</span>
          <h2>{h.generatorTitle}</h2>
          <p>{h.generatorSubtitle}</p>
        </div>
        <div className="showcase">
          <QrGenerator saveHint={fmt(h.generatorHint, { trial: trialShort, price: starter })} />
        </div>
      </section>

      {/* ---------- Как работи ---------- */}
      <section className="container section">
        <div className="section-head">
          <span className="eyebrow">{h.stepsEyebrow}</span>
          <h2>{h.stepsTitle}</h2>
        </div>
        <div className="steps">
          {h.steps.map((s, i) => (
            <div key={s.title} className="card step">
              <div className="step-num">0{i + 1}</div>
              <h3>{s.title}</h3>
              <p>{fmt(s.text, { trial: trialShort })}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Профил ---------- */}
      <section className="container">
        <div className="panel peach split">
          <div>
            <span className="eyebrow">{h.accountEyebrow}</span>
            <h2 style={{ marginTop: 16 }}>{h.accountTitle}</h2>
            <p>{h.accountText}</p>
            <ul className="check-list">
              {h.accountList.map((item) => (
                <li key={item}>
                  <Check />
                  {item}
                </li>
              ))}
            </ul>
            <Link href={href("/register")} className="btn outline">
              {h.accountCta} <ArrowUpRight />
            </Link>
          </div>
          <div className="split-visual" aria-hidden>
            <div className="card">
              <div className="mini-codes">
                {h.mini.map((c, i) => (
                  <div key={c.name} className="mini-code">
                    <MiniQr seed={`mini-${i}`} color={MINI_COLORS[i]} />
                    <span>
                      <strong>{c.name}</strong>
                      <br />
                      <span className="muted">{c.type}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Цени ---------- */}
      <section className="container section">
        <div className="section-head">
          <span className="eyebrow">{h.pricingEyebrow}</span>
          <h2>{h.pricingTitle}</h2>
          <p>
            <Shield style={{ width: 16, verticalAlign: "-3px" }} /> {fmt(h.pricingSubtitle, { trial: trialShort })}
          </p>
        </div>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <PricingSelector returnTo={href("/")} />
        </div>
      </section>

      {/* ---------- Въпроси ---------- */}
      <section id="faq" className="container" style={{ scrollMarginTop: 90 }}>
        <div className="section-head">
          <span className="eyebrow">{h.faqEyebrow}</span>
          <h2>{h.faqTitle}</h2>
        </div>
        <div className="faq">
          {h.faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{fmt(f.a, vars)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- Финален призив ---------- */}
      <section className="container section" style={{ paddingBottom: 0 }}>
        <div className="cta-dark">
          <h2>{h.ctaTitle}</h2>
          <p>{fmt(h.ctaText, { trial: trialShort, price: starter })}</p>
          <Link href="#generator" className="btn gradient lg">
            {h.cta} <ArrowUpRight />
          </Link>
        </div>
      </section>
    </>
  );
}
