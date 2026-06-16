import Link from "next/link";
import {
    GraduationCap,
    Users,
    ShieldCheck,
    BookOpen,
    Radio,
    ChevronRight,
    LayoutDashboard,
    Mail,
    X,
    ExternalLink,
} from "lucide-react";

export default function Footer() {
    return (
        <>
            <style>{footerStyles}</style>
            <footer className="sgf-footer">
                <div className="sgf-inner">

                    {/* Main grid */}
                    <div className="sgf-grid">

                        {/* Brand col */}
                        <div className="sgf-col-brand">
                            <div className="sgf-logo">
                                StudyGroup<span className="sgf-logo-accent">rr</span>
                            </div>
                            <p className="sgf-brand-desc">
                                Find classmates studying the same course, join study
                                sessions, and build real study groups at your university.
                            </p>
                            <div className="sgf-trust">
                                <div className="sgf-trust-item">
                                    <GraduationCap size={13} className="sgf-trust-icon" />
                                    University students only
                                </div>
                                <div className="sgf-trust-item">
                                    <Users size={13} className="sgf-trust-icon" />
                                    Same-school visibility
                                </div>
                                <div className="sgf-trust-item">
                                    <ShieldCheck size={13} className="sgf-trust-icon" />
                                    No public profiles
                                </div>
                            </div>
                        </div>

                        {/* Navigate col */}
                        <div className="sgf-col">
                            <p className="sgf-col-label">Navigate</p>
                            <ul className="sgf-nav-list">
                                <li>
                                    <Link href="/dashboard" className="sgf-nav-link">
                                        <LayoutDashboard size={12} />
                                        Dashboard
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/sessions" className="sgf-nav-link">
                                        <BookOpen size={12} />
                                        Browse sessions
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/sessions/new" className="sgf-nav-link">
                                        <Radio size={12} />
                                        Host a session
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/profile" className="sgf-nav-link">
                                        <Users size={12} />
                                        My profile
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Legal col */}
                        <div className="sgf-col">
                            <p className="sgf-col-label">Legal</p>
                            <ul className="sgf-nav-list">
                                <li>
                                    <Link href="/privacy" className="sgf-nav-link">
                                        <ChevronRight size={12} />
                                        Privacy policy
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/terms" className="sgf-nav-link">
                                        <ChevronRight size={12} />
                                        Terms of service
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/contact" className="sgf-nav-link">
                                        <ChevronRight size={12} />
                                        Contact us
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Connect col */}
                        <div className="sgf-col">
                            <p className="sgf-col-label">Connect</p>
                            <ul className="sgf-nav-list">
                                <li>
                                    <a
                                        href="mailto:karunsarvajith@gmail.com"
                                        className="sgf-nav-link"
                                    >
                                        <Mail size={12} />
                                        karunsarvajith@gmail.com
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://github.com/GreenTreeGaming/studygrouprr"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="sgf-nav-link"
                                    >
                                        <ExternalLink size={12} />
                                        GitHub
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="sgf-bottom">
                        <span className="sgf-copyright">
                            © {new Date().getFullYear()} StudyGrouprr
                        </span>
                        <span className="sgf-bottom-dot" />
                        <span className="sgf-byline">
                            Designed &amp; built by{" "}
                            <a
                                href="https://sarvajithkarun.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="sgf-byline-link"
                            >
                                Sarvajith Karun
                            </a>
                        </span>
                    </div>
                </div>
            </footer>
        </>
    );
}

const footerStyles = `
  .sgf-footer {
    --indigo: #1B1B3A;
    --violet: #7C3AED;
    --violet-lt: #EDE9FE;
    --violet-mid: #A78BFA;
    --bg: #F5F4FB;
    --surface: #FFFFFF;
    --border: #E4E2F0;
    --text: #1B1B3A;
    --muted: #64748B;
    --faint: #94A3B8;
    background: var(--surface);
    border-top: 1px solid var(--border);
    font-family: inherit;
  }

  .sgf-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 48px 24px 32px;
  }

  /* ── Grid ── */
  .sgf-grid {
    display: grid;
    grid-template-columns: 1.6fr 1fr 1fr 1fr;
    gap: 48px;
    margin-bottom: 36px;
  }

  /* Brand column */
  .sgf-logo {
    font-size: 18px;
    font-weight: 800;
    color: var(--indigo);
    margin-bottom: 12px;
  }
  .sgf-logo-accent { color: var(--violet); }

  .sgf-brand-desc {
    font-size: 13px;
    line-height: 1.65;
    color: var(--muted);
    margin: 0 0 20px;
    max-width: 280px;
  }

  .sgf-trust {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .sgf-trust-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
  }
  .sgf-trust-icon { color: var(--violet); flex-shrink: 0; }

  /* Nav columns */
  .sgf-col-label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--faint);
    margin: 0 0 14px;
  }
  .sgf-nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .sgf-nav-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    text-decoration: none;
    transition: color 0.15s;
  }
  .sgf-nav-link svg { opacity: 0.5; transition: opacity 0.15s; flex-shrink: 0; }
  .sgf-nav-link:hover { color: var(--violet); }
  .sgf-nav-link:hover svg { opacity: 1; }

  /* Bottom bar */
  .sgf-bottom {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .sgf-copyright { font-size: 12px; color: var(--faint); }
  .sgf-bottom-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--border);
    flex-shrink: 0;
  }
  .sgf-byline { font-size: 12px; color: var(--faint); }
  .sgf-byline-link {
    font-weight: 600;
    color: var(--violet);
    text-decoration: none;
    transition: color 0.15s;
  }
  .sgf-byline-link:hover { color: #6D28D9; }

  /* ── Responsive ── */
  @media (max-width: 860px) {
    .sgf-grid {
      grid-template-columns: 1fr 1fr;
      gap: 32px;
    }
    .sgf-col-brand {
      grid-column: 1 / -1;
    }
    .sgf-brand-desc { max-width: 100%; }
    .sgf-trust { flex-direction: row; flex-wrap: wrap; gap: 12px; }
  }

  @media (max-width: 520px) {
    .sgf-inner { padding: 36px 16px 24px; }
    .sgf-grid { grid-template-columns: 1fr; gap: 24px; }
    .sgf-col-brand { grid-column: auto; }
    .sgf-bottom { flex-direction: column; align-items: flex-start; gap: 6px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .sgf-nav-link, .sgf-byline-link { transition: none; }
  }
`;