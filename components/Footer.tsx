import Link from "next/link";

import {
    ArrowRight,
    ArrowUpRight,
    BookOpen,
    CalendarDays,
    CheckCircle2,
    Compass,
    FolderGit2,
    GraduationCap,
    Mail,
    MapPin,
    Plus,
    Radio,
    Sparkles,
    Users,
    Zap,
} from "lucide-react";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <>
            <style>{footerStyles}</style>

            <footer className="sf2-footer">
                <div
                    className="sf2-background-grid"
                    aria-hidden="true"
                />

                <span
                    className="sf2-background-glow sf2-background-glow--one"
                    aria-hidden="true"
                />

                <span
                    className="sf2-background-glow sf2-background-glow--two"
                    aria-hidden="true"
                />

                <div className="sf2-shell">
                    <section className="sf2-launchpad">
                        <div
                            className="sf2-launchpad-grid"
                            aria-hidden="true"
                        />

                        <span
                            className="sf2-launchpad-orbit sf2-launchpad-orbit--one"
                            aria-hidden="true"
                        />

                        <span
                            className="sf2-launchpad-orbit sf2-launchpad-orbit--two"
                            aria-hidden="true"
                        />

                        <div className="sf2-launchpad-copy">
              <span className="sf2-kicker">
                <Radio size={15} />
                Your campus is studying
              </span>

                            <h2>
                                Your next study group is
                                <span>one signal away.</span>
                            </h2>

                            <p>
                                Find classmates taking the same
                                course, choose a campus table,
                                and turn studying into something
                                you do together.
                            </p>

                            <div className="sf2-launchpad-actions">
                                <Link
                                    href="/sessions"
                                    className="sf2-primary-action"
                                >
                                    <Compass size={18} />

                                    <span>
                    Find a session
                  </span>

                                    <ArrowRight size={17} />
                                </Link>

                                <Link
                                    href="/create-session"
                                    className="sf2-secondary-action"
                                >
                                    <Plus size={18} />

                                    Create your own
                                </Link>
                            </div>
                        </div>

                        <div
                            className="sf2-signal-map"
                            aria-label="How StudyGrouprr works"
                        >
                            <svg
                                className="sf2-signal-route"
                                viewBox="0 0 450 260"
                                fill="none"
                                aria-hidden="true"
                                preserveAspectRatio="none"
                            >
                                <path
                                    className="sf2-signal-route-base"
                                    d="M34 205C92 201 105 115 165 119C229 123 223 200 294 194C361 188 351 79 421 61"
                                />

                                <path
                                    className="sf2-signal-route-active"
                                    d="M34 205C92 201 105 115 165 119C229 123 223 200 294 194C361 188 351 79 421 61"
                                />
                            </svg>

                            <div className="sf2-signal-node sf2-signal-node--find">
                <span className="sf2-node-number">
                  01
                </span>

                                <span className="sf2-node-icon">
                  <BookOpen size={19} />
                </span>

                                <span>
                  <strong>
                    Find
                  </strong>

                  <small>
                    Your course
                  </small>
                </span>
                            </div>

                            <div className="sf2-signal-node sf2-signal-node--join">
                <span className="sf2-node-number">
                  02
                </span>

                                <span className="sf2-node-icon sf2-node-icon--green">
                  <Users size={19} />
                </span>

                                <span>
                  <strong>
                    Join
                  </strong>

                  <small>
                    The table
                  </small>
                </span>
                            </div>

                            <div className="sf2-signal-node sf2-signal-node--meet">
                <span className="sf2-node-number">
                  03
                </span>

                                <span className="sf2-node-icon sf2-node-icon--amber">
                  <MapPin size={19} />
                </span>

                                <span>
                  <strong>
                    Meet
                  </strong>

                  <small>
                    On campus
                  </small>
                </span>
                            </div>

                            <div className="sf2-signal-core">
                                <span className="sf2-core-ring sf2-core-ring--one" />
                                <span className="sf2-core-ring sf2-core-ring--two" />

                                <span className="sf2-core-icon">
                  <Zap size={25} />
                </span>

                                <small>
                                    Study together
                                </small>
                            </div>
                        </div>
                    </section>

                    <section className="sf2-footer-map">
                        <article className="sf2-mission-card">
                            <div
                                className="sf2-mission-grid"
                                aria-hidden="true"
                            />

                            <Link
                                href="/"
                                className="sf2-brand"
                                aria-label="StudyGrouprr home"
                            >
                <span className="sf2-brand-icon">
                  <BookOpen
                      size={22}
                      strokeWidth={2.4}
                  />
                </span>

                                <span>
                  StudyGrouprr
                </span>
                            </Link>

                            <p className="sf2-mission-statement">
                                See who is studying your class
                                right now, join them, and build
                                the people you study with every
                                week.
                            </p>

                            <div className="sf2-mission-principles">
                                <div>
                  <span>
                    <GraduationCap
                        size={17}
                    />
                  </span>

                                    <p>
                                        <strong>
                                            University focused
                                        </strong>

                                        <small>
                                            Built around real campus
                                            communities.
                                        </small>
                                    </p>
                                </div>

                                <div>
                  <span>
                    <MapPin size={17} />
                  </span>

                                    <p>
                                        <strong>
                                            Real-world first
                                        </strong>

                                        <small>
                                            Designed to make actual
                                            meetups happen.
                                        </small>
                                    </p>
                                </div>
                            </div>

                            <div className="sf2-mission-note">
                                <Sparkles size={17} />

                                <span>
                  Finding people—not studying
                  alone.
                </span>
                            </div>
                        </article>

                        <nav
                            className="sf2-route-board"
                            aria-label="Footer navigation"
                        >
                            <section className="sf2-route-column">
                                <div className="sf2-route-heading">
                  <span className="sf2-route-index">
                    A
                  </span>

                                    <span>
                    <strong>
                      Start studying
                    </strong>

                    <small>
                      Find your next table
                    </small>
                  </span>
                                </div>

                                <ul>
                                    <li>
                                        <Link href="/dashboard">
                      <span>
                        Dashboard
                      </span>

                                            <ArrowRight
                                                size={14}
                                            />
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/sessions">
                      <span>
                        Browse sessions
                      </span>

                                            <ArrowRight
                                                size={14}
                                            />
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/create-session">
                      <span>
                        Create a session
                      </span>

                                            <ArrowRight
                                                size={14}
                                            />
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/live">
                      <span>
                        Go live
                      </span>

                                            <ArrowRight
                                                size={14}
                                            />
                                        </Link>
                                    </li>
                                </ul>
                            </section>

                            <section className="sf2-route-column">
                                <div className="sf2-route-heading">
                  <span className="sf2-route-index sf2-route-index--green">
                    B
                  </span>

                                    <span>
                    <strong>
                      Your campus
                    </strong>

                    <small>
                      People and activity
                    </small>
                  </span>
                                </div>

                                <ul>
                                    <li>
                                        <Link href="/buddies">
                      <span>
                        Study buddies
                      </span>

                                            <ArrowRight
                                                size={14}
                                            />
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/campus-activity">
                      <span>
                        Campus activity
                      </span>

                                            <ArrowRight
                                                size={14}
                                            />
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/profile">
                      <span>
                        Your profile
                      </span>

                                            <ArrowRight
                                                size={14}
                                            />
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/feedback">
                      <span>
                        Send feedback
                      </span>

                                            <ArrowRight
                                                size={14}
                                            />
                                        </Link>
                                    </li>
                                </ul>
                            </section>

                            <section className="sf2-route-column">
                                <div className="sf2-route-heading">
                  <span className="sf2-route-index sf2-route-index--amber">
                    C
                  </span>

                                    <span>
                    <strong>
                      Information
                    </strong>

                    <small>
                      Policies and contact
                    </small>
                  </span>
                                </div>

                                <ul>
                                    <li>
                                        <Link href="/privacy">
                      <span>
                        Privacy policy
                      </span>

                                            <ArrowRight
                                                size={14}
                                            />
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/terms">
                      <span>
                        Terms of service
                      </span>

                                            <ArrowRight
                                                size={14}
                                            />
                                        </Link>
                                    </li>

                                    <li>
                                        <Link href="/contact">
                      <span>
                        Contact
                      </span>

                                            <ArrowRight
                                                size={14}
                                            />
                                        </Link>
                                    </li>

                                    <li>
                                        <a
                                            href="mailto:karunsarvajith@gmail.com"
                                        >
                      <span>
                        <Mail size={14} />
                        Email
                      </span>

                                            <ArrowUpRight
                                                size={14}
                                            />
                                        </a>
                                    </li>
                                </ul>
                            </section>
                        </nav>
                    </section>

                    <nav
                        className="sf2-quick-track"
                        aria-label="Quick StudyGrouprr actions"
                    >
                        <Link href="/sessions">
              <span className="sf2-quick-icon">
                <Compass size={19} />
              </span>

                            <span>
                <small>
                  Discover
                </small>

                <strong>
                  Find a session
                </strong>
              </span>

                            <ArrowRight size={16} />
                        </Link>

                        <Link href="/live">
              <span className="sf2-quick-icon sf2-quick-icon--live">
                <Radio size={19} />
              </span>

                            <span>
                <small>
                  Right now
                </small>

                <strong>
                  Go live
                </strong>
              </span>

                            <ArrowRight size={16} />
                        </Link>

                        <Link href="/campus-activity">
              <span className="sf2-quick-icon sf2-quick-icon--green">
                <Zap size={19} />
              </span>

                            <span>
                <small>
                  Campus pulse
                </small>

                <strong>
                  See activity
                </strong>
              </span>

                            <ArrowRight size={16} />
                        </Link>

                        <Link href="/create-session">
              <span className="sf2-quick-icon sf2-quick-icon--amber">
                <CalendarDays
                    size={19}
                />
              </span>

                            <span>
                <small>
                  Take the lead
                </small>

                <strong>
                  Plan a meetup
                </strong>
              </span>

                            <ArrowRight size={16} />
                        </Link>
                    </nav>

                    <div className="sf2-bottom">
                        <div className="sf2-bottom-status">
                            <span>
                Built for successful study
                meetups.
              </span>
                        </div>

                        <p>
                            © {currentYear} StudyGrouprr
                        </p>

                        <div className="sf2-bottom-links">
                            <a
                                href="https://github.com/GreenTreeGaming/studygrouprr"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <FolderGit2 size={14} />
                                GitHub
                                <ArrowUpRight size={12} />
                            </a>

                            <span aria-hidden="true">
                /
              </span>

                            <a
                                href="https://sarvajithkarun.com"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Built by Sarvajith
                                <ArrowUpRight size={12} />
                            </a>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}

const footerStyles = `
  .sf2-footer,
  .sf2-footer *,
  .sf2-footer *::before,
  .sf2-footer *::after {
    box-sizing: border-box;
  }

  .sf2-footer {
    --sf2-indigo: #1B1B3A;
    --sf2-indigo-deep: #111126;
    --sf2-indigo-soft: #292953;
    --sf2-violet: #7C3AED;
    --sf2-violet-dark: #5B21B6;
    --sf2-violet-light: #EDE9FE;
    --sf2-lilac: #C4B5FD;
    --sf2-green: #10B981;
    --sf2-green-dark: #047857;
    --sf2-green-light: #D1FAE5;
    --sf2-amber: #F59E0B;
    --sf2-amber-dark: #B45309;
    --sf2-amber-light: #FEF3C7;
    --sf2-red: #EF4444;
    --sf2-blue: #0EA5E9;
    --sf2-surface: #FFFFFF;
    --sf2-border-dark: rgba(255, 255, 255, 0.1);
    --sf2-text-light: rgba(255, 255, 255, 0.88);
    --sf2-muted-light: rgba(255, 255, 255, 0.56);
    --sf2-faint-light: rgba(255, 255, 255, 0.34);

    position: relative;
    overflow: hidden;
    isolation: isolate;
    padding: 24px 20px 20px;
    color: white;
    background:
      radial-gradient(
        circle at 82% 8%,
        rgba(124, 58, 237, 0.34),
        transparent 28rem
      ),
      radial-gradient(
        circle at 8% 82%,
        rgba(16, 185, 129, 0.11),
        transparent 27rem
      ),
      linear-gradient(
        145deg,
        var(--sf2-indigo-deep),
        var(--sf2-indigo) 55%,
        #252554
      );
  }

  .sf2-footer::before {
    position: absolute;
    top: 0;
    right: 7%;
    left: 7%;
    height: 1px;
    content: "";
    background:
      linear-gradient(
        90deg,
        transparent,
        rgba(196, 181, 253, 0.65),
        transparent
      );
  }

  .sf2-background-grid {
    position: absolute;
    inset: 0;
    z-index: -5;
    opacity: 0.12;
    pointer-events: none;
    background-image:
      linear-gradient(
        rgba(255, 255, 255, 0.13) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.13) 1px,
        transparent 1px
      );
    background-size: 40px 40px;
    mask-image:
      linear-gradient(
        to bottom,
        black,
        transparent 92%
      );
  }

  .sf2-background-glow {
    position: absolute;
    z-index: -4;
    border-radius: 999px;
    pointer-events: none;
    filter: blur(4px);
  }

  .sf2-background-glow--one {
    top: 120px;
    right: -210px;
    width: 430px;
    height: 430px;
    border:
      1px dashed
      rgba(196, 181, 253, 0.17);
  }

  .sf2-background-glow--two {
    bottom: -260px;
    left: -180px;
    width: 480px;
    height: 480px;
    border:
      1px solid
      rgba(110, 231, 183, 0.1);
  }

  .sf2-shell {
    width: min(1220px, 100%);
    margin: 0 auto;
  }

  .sf2-launchpad {
    position: relative;
    display: grid;
    grid-template-columns:
      minmax(0, 1.08fr)
      minmax(390px, 0.92fr);
    align-items: center;
    gap: 42px;
    min-height: 390px;
    overflow: hidden;
    padding: 43px;
    color: var(--sf2-indigo);
    background:
      radial-gradient(
        circle at 83% 15%,
        rgba(124, 58, 237, 0.12),
        transparent 27%
      ),
      linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.98),
        #F7F5FF
      );
    border:
      1px solid
      rgba(255, 255, 255, 0.75);
    border-radius:
      29px 56px 29px 56px;
    box-shadow:
      0 31px 75px
      rgba(0, 0, 0, 0.27);
  }

  .sf2-launchpad-grid {
    position: absolute;
    inset: 0;
    opacity: 0.36;
    pointer-events: none;
    background-image:
      radial-gradient(
        circle,
        rgba(27, 27, 58, 0.13) 1px,
        transparent 1px
      );
    background-size: 25px 25px;
    mask-image:
      radial-gradient(
        circle at 80% 48%,
        black,
        transparent 62%
      );
  }

  .sf2-launchpad-orbit {
    position: absolute;
    top: 50%;
    right: -65px;
    border:
      1px dashed
      rgba(124, 58, 237, 0.14);
    border-radius: 999px;
    pointer-events: none;
    transform: translateY(-50%);
  }

  .sf2-launchpad-orbit--one {
    width: 410px;
    height: 410px;
    animation:
      sf2-orbit-spin
      45s linear infinite;
  }

  .sf2-launchpad-orbit--two {
    right: 5px;
    width: 270px;
    height: 270px;
    animation:
      sf2-orbit-spin-reverse
      38s linear infinite;
  }

  .sf2-launchpad-copy,
  .sf2-signal-map {
    position: relative;
    z-index: 2;
  }

  .sf2-kicker {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    color: var(--sf2-violet);
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .sf2-launchpad h2 {
    max-width: 720px;
    margin: 0;
    font-size:
      clamp(40px, 5.3vw, 67px);
    letter-spacing: -0.068em;
    line-height: 0.96;
  }

  .sf2-launchpad h2 span {
    display: block;
    margin-top: 7px;
    color: var(--sf2-violet);
  }

  .sf2-launchpad-copy > p {
    max-width: 650px;
    margin: 20px 0 0;
    color: #64748B;
    font-size: 15px;
    line-height: 1.72;
  }

  .sf2-launchpad-actions {
    display: flex;
    gap: 10px;
    margin-top: 25px;
    flex-wrap: wrap;
  }

  .sf2-primary-action,
  .sf2-secondary-action {
    display: inline-flex;
    min-height: 50px;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 0 17px;
    border-radius: 13px;
    font-size: 13px;
    font-weight: 850;
    text-decoration: none;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease,
      background 160ms ease,
      border-color 160ms ease;
  }

  .sf2-primary-action {
    color: white;
    background:
      linear-gradient(
        135deg,
        var(--sf2-violet),
        var(--sf2-violet-dark)
      );
    border:
      1px solid var(--sf2-violet);
    box-shadow:
      0 14px 29px
      rgba(91, 33, 182, 0.22);
  }

  .sf2-primary-action:hover {
    box-shadow:
      0 20px 35px
      rgba(91, 33, 182, 0.28);
    transform: translateY(-3px);
  }

  .sf2-secondary-action {
    color: var(--sf2-indigo);
    background: white;
    border: 1px solid #DDD6FE;
  }

  .sf2-secondary-action:hover {
    border-color: var(--sf2-lilac);
    box-shadow:
      0 13px 25px
      rgba(27, 27, 58, 0.1);
    transform: translateY(-3px);
  }

  .sf2-signal-map {
    min-height: 290px;
  }

  .sf2-signal-route {
    position: absolute;
    inset: 12px 0 0;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .sf2-signal-route-base {
    stroke:
      rgba(124, 58, 237, 0.16);
    stroke-width: 5;
    stroke-linecap: round;
  }

  .sf2-signal-route-active {
    stroke: var(--sf2-violet);
    stroke-width: 3;
    stroke-linecap: round;
    stroke-dasharray: 8 12;
    animation:
      sf2-route-travel
      3s linear infinite;
  }

  .sf2-signal-node {
    position: absolute;
    display: grid;
    grid-template-columns:
      auto auto minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    min-width: 156px;
    padding: 9px 11px;
    background:
      rgba(255, 255, 255, 0.96);
    border: 1px solid #E4E2F0;
    border-radius: 14px;
    box-shadow:
      0 12px 27px
      rgba(27, 27, 58, 0.12);
  }

  .sf2-signal-node--find {
    bottom: 13px;
    left: 0;
    transform: rotate(-2deg);
  }

  .sf2-signal-node--join {
    top: 75px;
    left: 31%;
    transform: rotate(1.5deg);
  }

  .sf2-signal-node--meet {
    top: 7px;
    right: 0;
    transform: rotate(-1deg);
  }

  .sf2-node-number {
    color:
      rgba(27, 27, 58, 0.24);
    font-size: 10px;
    font-weight: 900;
  }

  .sf2-node-icon {
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    color: var(--sf2-violet);
    background:
      var(--sf2-violet-light);
    border-radius: 11px;
  }

  .sf2-node-icon--green {
    color: var(--sf2-green-dark);
    background:
      var(--sf2-green-light);
  }

  .sf2-node-icon--amber {
    color: var(--sf2-amber-dark);
    background:
      var(--sf2-amber-light);
  }

  .sf2-signal-node > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .sf2-signal-node strong {
    font-size: 13px;
  }

  .sf2-signal-node small {
    margin-top: 2px;
    color: #64748B;
    font-size: 11px;
  }

  .sf2-signal-core {
    position: absolute;
    right: 12%;
    bottom: 8%;
    display: grid;
    width: 111px;
    height: 111px;
    place-items: center;
    align-content: center;
    color: white;
    background:
      linear-gradient(
        145deg,
        var(--sf2-indigo),
        var(--sf2-indigo-soft)
      );
    border:
      7px solid
      rgba(124, 58, 237, 0.1);
    border-radius: 999px;
    box-shadow:
      0 18px 39px
      rgba(27, 27, 58, 0.25);
  }

  .sf2-core-ring {
    position: absolute;
    border:
      1px dashed
      rgba(124, 58, 237, 0.2);
    border-radius: inherit;
  }

  .sf2-core-ring--one {
    inset: -17px;
  }

  .sf2-core-ring--two {
    inset: -34px;
  }

  .sf2-core-icon {
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
    color: var(--sf2-lilac);
    background:
      rgba(255, 255, 255, 0.08);
    border-radius: 13px;
  }

  .sf2-signal-core small {
    margin-top: 7px;
    color:
      rgba(255, 255, 255, 0.67);
    font-size: 10px;
    font-weight: 800;
  }

  .sf2-footer-map {
    display: grid;
    grid-template-columns:
      minmax(290px, 0.76fr)
      minmax(0, 1.24fr);
    gap: 18px;
    margin-top: 19px;
  }

  .sf2-mission-card {
    position: relative;
    overflow: hidden;
    padding: 27px;
    background:
      radial-gradient(
        circle at 84% 14%,
        rgba(124, 58, 237, 0.3),
        transparent 30%
      ),
      rgba(255, 255, 255, 0.06);
    border:
      1px solid
      var(--sf2-border-dark);
    border-radius:
      21px 39px 21px 39px;
  }

  .sf2-mission-grid {
    position: absolute;
    inset: 0;
    opacity: 0.1;
    pointer-events: none;
    background-image:
      linear-gradient(
        rgba(255, 255, 255, 0.15) 1px,
        transparent 1px
      ),
      linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.15) 1px,
        transparent 1px
      );
    background-size: 31px 31px;
  }

  .sf2-brand,
  .sf2-mission-statement,
  .sf2-mission-principles,
  .sf2-mission-note {
    position: relative;
    z-index: 2;
  }

  .sf2-brand {
    display: inline-flex;
    align-items: center;
    gap: 11px;
    color: white;
    font-size: 19px;
    font-weight: 850;
    letter-spacing: -0.035em;
    text-decoration: none;
  }

  .sf2-brand-icon {
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
    color: var(--sf2-violet-dark);
    background: white;
    border-radius: 13px;
    box-shadow:
      0 9px 21px
      rgba(0, 0, 0, 0.17);
  }

  .sf2-mission-statement {
    max-width: 470px;
    margin: 20px 0 0;
    color: var(--sf2-muted-light);
    font-size: 15px;
    line-height: 1.7;
  }

  .sf2-mission-principles {
    display: grid;
    gap: 9px;
    margin-top: 21px;
  }

  .sf2-mission-principles > div {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px;
    background:
      rgba(255, 255, 255, 0.06);
    border:
      1px solid
      rgba(255, 255, 255, 0.07);
    border-radius: 12px;
  }

  .sf2-mission-principles > div > span {
    display: grid;
    width: 34px;
    height: 34px;
    flex-shrink: 0;
    place-items: center;
    color: var(--sf2-lilac);
    background:
      rgba(255, 255, 255, 0.07);
    border-radius: 10px;
  }

  .sf2-mission-principles p {
    display: flex;
    min-width: 0;
    margin: 0;
    flex-direction: column;
  }

  .sf2-mission-principles strong {
    color: var(--sf2-text-light);
    font-size: 13px;
  }

  .sf2-mission-principles small {
    margin-top: 3px;
    color: var(--sf2-muted-light);
    font-size: 12px;
    line-height: 1.45;
  }

  .sf2-mission-note {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding: 11px 12px;
    color: #FDE68A;
    background:
      rgba(245, 158, 11, 0.1);
    border:
      1px dashed
      rgba(253, 230, 138, 0.22);
    border-radius: 9px 14px 14px 14px;
    font-size: 12px;
    font-weight: 750;
    transform: rotate(-0.35deg);
  }

  .sf2-route-board {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 11px;
    min-width: 0;
    padding: 12px;
    background:
      rgba(255, 255, 255, 0.055);
    border:
      1px solid
      var(--sf2-border-dark);
    border-radius:
      38px 20px 38px 20px;
  }

  .sf2-route-column {
    min-width: 0;
    padding: 17px;
    background:
      rgba(255, 255, 255, 0.055);
    border:
      1px solid
      rgba(255, 255, 255, 0.07);
    border-radius: 15px;
  }

  .sf2-route-heading {
    display: flex;
    align-items: center;
    gap: 9px;
    padding-bottom: 14px;
    border-bottom:
      1px dashed
      rgba(255, 255, 255, 0.11);
  }

  .sf2-route-index {
    display: grid;
    width: 35px;
    height: 35px;
    flex-shrink: 0;
    place-items: center;
    color: var(--sf2-lilac);
    background:
      rgba(124, 58, 237, 0.16);
    border-radius: 10px;
    font-size: 12px;
    font-weight: 900;
  }

  .sf2-route-index--green {
    color: #A7F3D0;
    background:
      rgba(16, 185, 129, 0.12);
  }

  .sf2-route-index--amber {
    color: #FDE68A;
    background:
      rgba(245, 158, 11, 0.12);
  }

  .sf2-route-heading > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .sf2-route-heading strong {
    color: var(--sf2-text-light);
    font-size: 13px;
  }

  .sf2-route-heading small {
    margin-top: 2px;
    color: var(--sf2-faint-light);
    font-size: 11px;
  }

  .sf2-route-column ul {
    display: grid;
    gap: 5px;
    margin: 13px 0 0;
    padding: 0;
    list-style: none;
  }

  .sf2-route-column li {
    min-width: 0;
  }

  .sf2-route-column a {
    display: flex;
    width: 100%;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 9px 8px;
    color: var(--sf2-muted-light);
    border-radius: 9px;
    font-size: 13px;
    font-weight: 650;
    text-decoration: none;
    transition:
      color 150ms ease,
      background 150ms ease,
      transform 150ms ease;
  }

  .sf2-route-column a > span {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 6px;
  }

  .sf2-route-column a > svg {
    flex-shrink: 0;
    color: var(--sf2-faint-light);
    opacity: 0;
    transform: translateX(-5px);
    transition:
      opacity 150ms ease,
      transform 150ms ease;
  }

  .sf2-route-column a:hover {
    color: white;
    background:
      rgba(255, 255, 255, 0.07);
    transform: translateX(3px);
  }

  .sf2-route-column a:hover > svg {
    opacity: 1;
    transform: translateX(0);
  }

  .sf2-quick-track {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-top: 18px;
  }

  .sf2-quick-track > a {
    display: grid;
    grid-template-columns:
      auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-width: 0;
    padding: 13px;
    color: white;
    background:
      rgba(255, 255, 255, 0.055);
    border:
      1px solid
      rgba(255, 255, 255, 0.09);
    border-radius: 13px;
    text-decoration: none;
    transition:
      background 150ms ease,
      border-color 150ms ease,
      transform 150ms ease;
  }

  .sf2-quick-track > a:hover {
    background:
      rgba(255, 255, 255, 0.09);
    border-color:
      rgba(196, 181, 253, 0.26);
    transform: translateY(-3px);
  }

  .sf2-quick-icon {
    display: grid;
    width: 39px;
    height: 39px;
    flex-shrink: 0;
    place-items: center;
    color: var(--sf2-lilac);
    background:
      rgba(124, 58, 237, 0.15);
    border-radius: 11px;
  }

  .sf2-quick-icon--live {
    color: #FCA5A5;
    background:
      rgba(239, 68, 68, 0.12);
  }

  .sf2-quick-icon--green {
    color: #A7F3D0;
    background:
      rgba(16, 185, 129, 0.12);
  }

  .sf2-quick-icon--amber {
    color: #FDE68A;
    background:
      rgba(245, 158, 11, 0.12);
  }

  .sf2-quick-track > a > span:nth-child(2) {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .sf2-quick-track small {
    color: var(--sf2-faint-light);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .sf2-quick-track strong {
    overflow: hidden;
    margin-top: 3px;
    color: var(--sf2-text-light);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .sf2-quick-track > a > svg {
    color: var(--sf2-faint-light);
    transition: transform 150ms ease;
  }

  .sf2-quick-track > a:hover > svg {
    transform: translateX(3px);
  }

  .sf2-bottom {
    display: grid;
    grid-template-columns:
      1fr auto 1fr;
    align-items: center;
    gap: 20px;
    margin-top: 19px;
    padding: 18px 5px 2px;
    border-top:
      1px solid
      rgba(255, 255, 255, 0.09);
  }

  .sf2-bottom p,
  .sf2-bottom-status,
  .sf2-bottom-links {
    margin: 0;
    color: var(--sf2-faint-light);
    font-size: 12px;
  }

  .sf2-bottom > p {
    text-align: center;
  }

  .sf2-bottom-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }

  .sf2-status-dot {
    position: relative;
    width: 7px;
    height: 7px;
    flex-shrink: 0;
    border-radius: 999px;
    background: var(--sf2-green);
  }

  .sf2-status-dot::after {
    position: absolute;
    inset: -4px;
    content: "";
    border-radius: inherit;
    background: var(--sf2-green);
    opacity: 0.22;
    animation:
      sf2-status-pulse
      1.8s ease-out infinite;
  }

  .sf2-bottom-links {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .sf2-bottom-links a {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: var(--sf2-muted-light);
    text-decoration: none;
    transition: color 150ms ease;
  }

  .sf2-bottom-links a:hover {
    color: white;
  }

  .sf2-brand:focus-visible,
  .sf2-primary-action:focus-visible,
  .sf2-secondary-action:focus-visible,
  .sf2-route-column a:focus-visible,
  .sf2-quick-track a:focus-visible,
  .sf2-bottom-links a:focus-visible {
    outline:
      3px solid
      rgba(196, 181, 253, 0.42);
    outline-offset: 3px;
  }

  @keyframes sf2-route-travel {
    to {
      stroke-dashoffset: -40;
    }
  }

  @keyframes sf2-orbit-spin {
    to {
      transform:
        translateY(-50%)
        rotate(360deg);
    }
  }

  @keyframes sf2-orbit-spin-reverse {
    to {
      transform:
        translateY(-50%)
        rotate(-360deg);
    }
  }

  @keyframes sf2-status-pulse {
    0% {
      opacity: 0.28;
      transform: scale(1);
    }

    75%,
    100% {
      opacity: 0;
      transform: scale(2.4);
    }
  }

  @media (max-width: 1050px) {
    .sf2-launchpad {
      grid-template-columns:
        minmax(0, 1fr)
        minmax(330px, 0.85fr);
      gap: 25px;
      padding: 35px;
    }

    .sf2-route-board {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .sf2-route-column:last-child {
      grid-column: 1 / -1;
    }

    .sf2-quick-track {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 850px) {
    .sf2-launchpad {
      grid-template-columns: 1fr;
    }

    .sf2-signal-map {
      width: min(560px, 100%);
      min-height: 300px;
      margin: 0 auto;
    }

    .sf2-footer-map {
      grid-template-columns: 1fr;
    }

    .sf2-mission-card {
      padding: 25px;
    }
  }

  @media (max-width: 680px) {
    .sf2-footer {
      padding: 13px 12px 16px;
    }

    .sf2-launchpad {
      min-height: auto;
      padding: 28px 20px;
      border-radius:
        31px 31px 18px 31px;
    }

    .sf2-launchpad h2 {
      font-size:
        clamp(39px, 12vw, 54px);
    }

    .sf2-launchpad-copy > p {
      font-size: 14px;
    }

    .sf2-launchpad-actions {
      align-items: stretch;
      flex-direction: column;
    }

    .sf2-primary-action,
    .sf2-secondary-action {
      width: 100%;
    }

    .sf2-signal-map {
      min-height: 390px;
    }

    .sf2-signal-route {
      inset: 35px 0 0;
      transform: rotate(90deg);
    }

    .sf2-signal-node {
      min-width: 155px;
    }

    .sf2-signal-node--find {
      top: 15px;
      right: auto;
      bottom: auto;
      left: 0;
    }

    .sf2-signal-node--join {
      top: 145px;
      right: 0;
      left: auto;
    }

    .sf2-signal-node--meet {
      top: auto;
      right: auto;
      bottom: 20px;
      left: 0;
    }

    .sf2-signal-core {
      right: 4%;
      bottom: 9%;
      width: 96px;
      height: 96px;
    }

    .sf2-route-board {
      grid-template-columns: 1fr;
      padding: 10px;
      border-radius:
        27px 17px 27px 17px;
    }

    .sf2-route-column:last-child {
      grid-column: auto;
    }

    .sf2-quick-track {
      grid-template-columns: 1fr;
    }

    .sf2-bottom {
      display: flex;
      align-items: flex-start;
      flex-direction: column;
      gap: 9px;
      padding-top: 16px;
    }

    .sf2-bottom > p {
      text-align: left;
    }

    .sf2-bottom-links {
      justify-content: flex-start;
      flex-wrap: wrap;
    }
  }

  @media (max-width: 430px) {
    .sf2-launchpad {
      padding: 25px 17px;
    }

    .sf2-signal-map {
      min-height: 410px;
    }

    .sf2-signal-node--join {
      top: 150px;
    }

    .sf2-signal-core {
      right: 0;
      bottom: 7%;
    }

    .sf2-mission-card {
      padding: 22px 18px;
    }

    .sf2-bottom-links > span {
      display: none;
    }

    .sf2-bottom-links {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .sf2-footer *,
    .sf2-footer *::before,
    .sf2-footer *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }
`;