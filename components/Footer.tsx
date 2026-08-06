"use client";

import Image from "next/image";
import Link from "next/link";

import styles from "./Footer.module.css";

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className={`sf2-footer ${styles.footer}`}>
            <div className={styles.top}>
                <div className={styles.brandColumn}>
                    <Link
                        href="/"
                        className={styles.brand}
                        aria-label="StudyGrouprr home"
                    >
                        <Image
                            src="/navbar-logo.png"
                            alt=""
                            width={42}
                            height={42}
                            className={styles.logo}
                        />

                        <span className={styles.brandName}>
              <span>Study</span>
              <span>Grouprr</span>
            </span>
                    </Link>

                    <p className={styles.description}>
                        Find classmates studying your course and meet them on
                        campus.
                    </p>
                </div>

                <nav
                    className={styles.links}
                    aria-label="Footer navigation"
                >
                    <div className={styles.linkColumn}>
                        <p>Product</p>

                        <Link href="/#campus-activity">
                            Campus activity
                        </Link>

                        <Link href="/sessions">Sessions</Link>
                        <Link href="/live">Go live</Link>
                        <Link href="/buddies">Study buddies</Link>
                    </div>

                    <div className={styles.linkColumn}>
                        <p>Project</p>

                        <Link href="/#why-it-exists">
                            Why it exists
                        </Link>

                        <Link href="/login">Join campus</Link>

                        <a
                            href="https://github.com/GreenTreeGaming/studygrouprr"
                            target="_blank"
                            rel="noreferrer"
                        >
                            GitHub
                        </a>
                    </div>
                </nav>
            </div>

            <div className={styles.bottom}>
                <span>© {year} StudyGrouprr</span>

                <span>
          Built for students who study better together.
        </span>
            </div>
        </footer>
    );
}
