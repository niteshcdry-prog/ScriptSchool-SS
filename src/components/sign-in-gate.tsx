import { BookOpen, CheckCircle2, Code2, Sparkles } from "lucide-react";
import Link from "next/link";

const highlights = [
  {
    icon: BookOpen,
    title: "A clear path forward",
    description: "Build your skills with a guided learning experience designed to make progress feel manageable.",
  },
  {
    icon: Code2,
    title: "Learn by doing",
    description: "Put new ideas into practice with interactive activities as you move through your learning journey.",
  },
  {
    icon: CheckCircle2,
    title: "Progress that stays yours",
    description: "Create an account to keep track of what you have completed and pick up again later.",
  },
];

export default function SignInGate() {
  return (
    <main className="public-home">
      <header className="public-header">
        <Link className="brand public-brand" href="/" aria-label="Script School home">
          <span className="brand-mark">{"</>"}</span>
          <span>script<span className="brand-accent">school</span></span>
        </Link>
        <nav className="public-header-actions" aria-label="Account">
          <Link className="public-sign-in" href="/login?required=1&next=%2F">Sign in</Link>
          <Link className="public-sign-up" href="/login?mode=signup&required=1&next=%2F">Create account</Link>
        </nav>
      </header>

      <section className="public-hero" aria-labelledby="public-hero-title">
        <div className="public-hero-copy">
          <span className="public-eyebrow"><Sparkles size={14} aria-hidden="true" /> A FRIENDLIER WAY TO LEARN</span>
          <h1 id="public-hero-title">Build real confidence, one small step at a time.</h1>
          <p>Build practical skills in JavaScript, Python, web development, Git, and SQL with guided lessons and hands-on practice. Sign in or create an account to begin your learning journey.</p>
          <div className="public-hero-actions">
            <Link className="public-sign-up public-hero-primary" href="/login?mode=signup&required=1&next=%2F">
              Create your free account <span aria-hidden="true">→</span>
            </Link>
            <Link className="public-hero-secondary" href="/login?required=1&next=%2F">I already have an account</Link>
          </div>
        </div>
        <div className="public-hero-art" aria-hidden="true">
          <div className="public-art-orbit public-art-orbit-outer" />
          <div className="public-art-orbit public-art-orbit-inner" />
          <div className="public-art-tile"><Code2 size={42} strokeWidth={1.8} /></div>
          <span className="public-art-dot public-art-dot-one" />
          <span className="public-art-dot public-art-dot-two" />
          <span className="public-art-caption">Your next chapter starts here</span>
        </div>
      </section>

      <section className="public-highlights" aria-labelledby="public-highlights-title">
        <div className="public-section-heading">
          <span className="public-eyebrow">MADE FOR CURIOUS MINDS</span>
          <h2 id="public-highlights-title">A better way to keep learning</h2>
          <p>Everything you need to build a steady learning habit, all in one place.</p>
        </div>
        <div className="public-highlight-grid">
          {highlights.map(({ icon: Icon, title, description }) => (
            <article className="public-highlight-card" key={title}>
              <span className="public-highlight-icon"><Icon size={19} aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-bottom-cta" aria-labelledby="public-cta-title">
        <div>
          <span className="public-eyebrow">READY WHEN YOU ARE</span>
          <h2 id="public-cta-title">Your learning journey starts with an account.</h2>
          <p>Sign in to continue, or create an account to get started and save your progress.</p>
        </div>
        <Link className="public-sign-up public-hero-primary" href="/login?mode=signup&required=1&next=%2F">
          Get started <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className="public-footer">
        <Link className="brand public-brand" href="/" aria-label="Script School home">
          <span className="brand-mark">{"</>"}</span>
          <span>script<span className="brand-accent">school</span></span>
        </Link>
        <span>Made for curious minds. Keep experimenting, keep learning.</span>
      </footer>
    </main>
  );
}
