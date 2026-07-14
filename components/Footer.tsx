import Link from "next/link";

import {
    ArrowUpRight,
    BookOpen,
    FolderGit2,
    GraduationCap,
    Mail,
    MapPin,
    Plus,
    Radio,
    Users,
} from "lucide-react";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <>
            <style>{footerStyles}</style>

            <footer className="sgf-footer">
                <div className="sgf-inner">
                    <div className="sgf-main">
                        <div className="sgf-brand-column">
                            <Link
                                href="/"
                                className="sgf-brand"
                                aria-label="StudyGrouprr home"
                            >
                <span className="sgf-brand-icon" aria-hidden="true">
                  <BookOpen size={18} strokeWidth={2.4} />
                </span>

                                <span>StudyGrouprr</span>
                            </Link>

                            <p className="sgf-brand-description">
                                Find classmates studying the same course, join
                                sessions on campus, and build real study groups.
                            </p>

                            <div className="sgf-principles">
                                <div className="sgf-principle">
                                    <GraduationCap size={14} />
                                    <span>Made for university communities</span>
                                </div>

                                <div className="sgf-principle">
                                    <MapPin size={14} />
                                    <span>Focused on real campus meetups</span>
                                </div>
                            </div>
                        </div>

                        <div className="sgf-links-column">
                            <p className="sgf-column-title">Study</p>

                            <nav aria-label="Study navigation">
                                <ul className="sgf-link-list">
                                    <li>
                                        <Link href="/dashboard" className="sgf-link">
                                            Dashboard
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/sessions" className="sgf-link">
                                            Browse sessions
                                        </Link>
                                    </li>

                                    <li>
                                        <Link
                                            href="/create-session"
                                            className="sgf-link"
                                        >
                                            Create a session
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/live" className="sgf-link">
                                            Study live
                                        </Link>
                                    </li>
                                </ul>
                            </nav>
                        </div>

                        <div className="sgf-links-column">
                            <p className="sgf-column-title">Community</p>

                            <nav aria-label="Community navigation">
                                <ul className="sgf-link-list">
                                    <li>
                                        <Link href="/buddies" className="sgf-link">
                                            Study buddies
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/profile" className="sgf-link">
                                            Your profile
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/feedback" className="sgf-link">
                                            Send feedback
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/contact" className="sgf-link">
                                            Contact
                                        </Link>
                                    </li>
                                </ul>
                            </nav>
                        </div>

                        <div className="sgf-links-column">
                            <p className="sgf-column-title">Information</p>

                            <nav aria-label="Information navigation">
                                <ul className="sgf-link-list">
                                    <li>
                                        <Link href="/privacy" className="sgf-link">
                                            Privacy policy
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/terms" className="sgf-link">
                                            Terms of service
                                        </Link>
                                    </li>

                                    <li>
                                        <a
                                            href="mailto:karunsarvajith@gmail.com"
                                            className="sgf-link sgf-link--icon"
                                        >
                                            <Mail size={13} />
                                            Email
                                        </a>
                                    </li>

                                    <li>
                                        <a
                                            href="https://github.com/GreenTreeGaming/studygrouprr"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="sgf-link sgf-link--icon"
                                        >
                                            <FolderGit2 size={13} />
                                            GitHub
                                            <ArrowUpRight
                                                size={11}
                                                className="sgf-external-icon"
                                            />
                                        </a>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>

                    <div className="sgf-callout">
                        <div className="sgf-callout-copy">
                            <div className="sgf-callout-icon" aria-hidden="true">
                                <Users size={18} />
                            </div>

                            <div>
                                <p className="sgf-callout-title">
                                    Ready to study with classmates?
                                </p>

                                <p className="sgf-callout-description">
                                    See who is studying your course or create a
                                    session of your own.
                                </p>
                            </div>
                        </div>

                        <div className="sgf-callout-actions">
                            <Link href="/live" className="sgf-secondary-button">
                                <Radio size={15} />
                                See who’s live
                            </Link>

                            <Link
                                href="/create-session"
                                className="sgf-primary-button"
                            >
                                <Plus size={15} strokeWidth={2.5} />
                                Create session
                            </Link>
                        </div>
                    </div>

                    <div className="sgf-bottom">
                        <p className="sgf-copyright">
                            © {currentYear} StudyGrouprr
                        </p>

                        <p className="sgf-tagline">
                            Find classmates. Study together.
                        </p>

                        <p className="sgf-byline">
                            Designed and built by{" "}
                            <a
                                href="https://sarvajithkarun.com"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Sarvajith Karun
                            </a>
                        </p>
                    </div>
                </div>
            </footer>
        </>
    );
}

const footerStyles = `
  .sgf-footer {
    --sgf-indigo: #1b1b3a;
    --sgf-violet: #7c3aed;
    --sgf-violet-dark: #6d28d9;
    --sgf-violet-light: #f5f3ff;
    --sgf-green: #10b981;
    --sgf-background: #f8f7fc;
    --sgf-surface: #ffffff;
    --sgf-border: #e7e5ef;
    --sgf-text: #1b1b3a;
    --sgf-muted: #64748b;
    --sgf-faint: #94a3b8;

    border-top: 1px solid var(--sgf-border);
    background: rgba(255, 255, 255, 0.78);
    color: var(--sgf-text);
  }

  .sgf-footer *,
  .sgf-footer *::before,
  .sgf-footer *::after {
    box-sizing: border-box;
  }

  .sgf-inner {
    width: min(1160px, calc(100% - 48px));
    margin: 0 auto;
    padding: 58px 0 28px;
  }

  .sgf-main {
    display: grid;
    grid-template-columns:
      minmax(260px, 1.45fr)
      repeat(3, minmax(130px, 0.65fr));
    gap: 48px;
  }

  .sgf-brand-column {
    max-width: 340px;
  }

  .sgf-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--sgf-indigo);
    font-size: 16px;
    font-weight: 760;
    letter-spacing: -0.025em;
    text-decoration: none;
  }

  .sgf-brand-icon {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border-radius: 11px;
    background: var(--sgf-indigo);
    color: white;
  }

  .sgf-brand-description {
    max-width: 320px;
    margin: 17px 0 20px;
    color: var(--sgf-muted);
    font-size: 13px;
    line-height: 1.7;
  }

  .sgf-principles {
    display: grid;
    gap: 9px;
  }

  .sgf-principle {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--sgf-muted);
    font-size: 11px;
    font-weight: 570;
  }

  .sgf-principle svg {
    flex: 0 0 auto;
    color: var(--sgf-violet);
  }

  .sgf-column-title {
    margin: 7px 0 17px;
    color: var(--sgf-faint);
    font-size: 10px;
    font-weight: 750;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .sgf-link-list {
    display: grid;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .sgf-link {
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 6px;
    color: var(--sgf-muted);
    font-size: 12px;
    font-weight: 560;
    text-decoration: none;
    transition:
      color 150ms ease,
      transform 150ms ease;
  }

  .sgf-link:hover {
    color: var(--sgf-violet);
    transform: translateX(2px);
  }

  .sgf-link--icon svg {
    flex: 0 0 auto;
  }

  .sgf-external-icon {
    color: var(--sgf-faint);
  }

  .sgf-callout {
    display: flex;
    margin-top: 44px;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding: 22px;
    border: 1px solid #ddd6fe;
    border-radius: 19px;
    background:
      linear-gradient(
        135deg,
        rgba(245, 243, 255, 0.9),
        rgba(255, 255, 255, 0.95)
      );
  }

  .sgf-callout-copy {
    display: flex;
    align-items: center;
    gap: 13px;
  }

  .sgf-callout-icon {
    display: grid;
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 13px;
    background: white;
    color: var(--sgf-violet);
    box-shadow: 0 6px 18px rgba(124, 58, 237, 0.08);
  }

  .sgf-callout-title {
    margin: 0;
    color: var(--sgf-indigo);
    font-size: 13px;
    font-weight: 720;
  }

  .sgf-callout-description {
    margin: 4px 0 0;
    color: var(--sgf-muted);
    font-size: 11px;
    line-height: 1.5;
  }

  .sgf-callout-actions {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 8px;
  }

  .sgf-primary-button,
  .sgf-secondary-button {
    display: inline-flex;
    min-height: 38px;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 13px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 680;
    text-decoration: none;
    transition:
      background 150ms ease,
      border-color 150ms ease,
      transform 150ms ease;
  }

  .sgf-primary-button {
    border: 1px solid var(--sgf-violet);
    background: var(--sgf-violet);
    color: white;
  }

  .sgf-primary-button:hover {
    transform: translateY(-1px);
    background: var(--sgf-violet-dark);
    border-color: var(--sgf-violet-dark);
  }

  .sgf-secondary-button {
    border: 1px solid var(--sgf-border);
    background: white;
    color: var(--sgf-indigo);
  }

  .sgf-secondary-button:hover {
    transform: translateY(-1px);
    border-color: #c4b5fd;
  }

  .sgf-bottom {
    display: grid;
    margin-top: 28px;
    padding-top: 23px;
    border-top: 1px solid var(--sgf-border);
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 24px;
  }

  .sgf-bottom p {
    margin: 0;
    color: var(--sgf-faint);
    font-size: 10px;
  }

  .sgf-tagline {
    text-align: center;
  }

  .sgf-byline {
    text-align: right;
  }

  .sgf-byline a {
    color: var(--sgf-violet);
    font-weight: 650;
    text-decoration: none;
  }

  .sgf-byline a:hover {
    color: var(--sgf-violet-dark);
  }

  .sgf-brand:focus-visible,
  .sgf-link:focus-visible,
  .sgf-primary-button:focus-visible,
  .sgf-secondary-button:focus-visible,
  .sgf-byline a:focus-visible {
    outline: 3px solid rgba(124, 58, 237, 0.2);
    outline-offset: 3px;
  }

  @media (max-width: 900px) {
    .sgf-main {
      grid-template-columns: repeat(3, 1fr);
      gap: 36px 28px;
    }

    .sgf-brand-column {
      max-width: none;
      grid-column: 1 / -1;
    }

    .sgf-brand-description {
      max-width: 540px;
    }
  }

  @media (max-width: 720px) {
    .sgf-inner {
      width: min(100% - 32px, 1160px);
      padding-top: 44px;
    }

    .sgf-main {
      grid-template-columns: 1fr 1fr;
    }

    .sgf-brand-column {
      grid-column: 1 / -1;
    }

    .sgf-callout {
      align-items: stretch;
      flex-direction: column;
    }

    .sgf-callout-actions {
      width: 100%;
    }

    .sgf-primary-button,
    .sgf-secondary-button {
      flex: 1;
    }

    .sgf-bottom {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 7px;
    }

    .sgf-tagline,
    .sgf-byline {
      text-align: left;
    }
  }

  @media (max-width: 500px) {
    .sgf-main {
      grid-template-columns: 1fr;
      gap: 30px;
    }

    .sgf-brand-column {
      grid-column: auto;
    }

    .sgf-callout {
      padding: 18px;
    }

    .sgf-callout-copy {
      align-items: flex-start;
    }

    .sgf-callout-actions {
      flex-direction: column;
    }

    .sgf-primary-button,
    .sgf-secondary-button {
      width: 100%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sgf-link,
    .sgf-primary-button,
    .sgf-secondary-button {
      transition: none;
    }

    .sgf-link:hover,
    .sgf-primary-button:hover,
    .sgf-secondary-button:hover {
      transform: none;
    }
  }
`;