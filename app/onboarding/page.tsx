"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  GraduationCap,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import AlertModal from "@/components/AlertModal";
import majors from "@/data/majors.json";
import universities from "@/data/universities.json";
import { isEduEmail } from "@/lib/authRules";
import { containsInappropriateContent } from "@/lib/contentModeration";
import {
  isValidCourseCode,
  normalizeCourseCode,
} from "@/lib/courseValidation";
import { supabase } from "@/lib/supabase";

import styles from "./onboarding.module.css";

type AlertType =
    | "success"
    | "error"
    | "warning"
    | "info";

type AlertConfig = {
  title: string;
  message: string;
  type: AlertType;
};

type Account = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

const YEARS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate",
];

const MAX_COURSES = 10;

function getInitial(
    name: string | null | undefined,
): string {
  return (
      name?.trim().charAt(0).toUpperCase() ||
      "S"
  );
}

function SafeAvatar({
                      src,
                      name,
                    }: {
  src: string | null | undefined;
  name: string | null | undefined;
}) {
  const [imageFailed, setImageFailed] =
      useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const canRenderImage =
      typeof src === "string" &&
      src.trim().length > 0 &&
      !imageFailed;

  if (!canRenderImage) {
    return (
        <span aria-hidden="true">
        {getInitial(name)}
      </span>
    );
  }

  return (
      <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          onError={() =>
              setImageFailed(true)
          }
      />
  );
}

function arraysMatch(
    first: string[],
    second: string[],
): boolean {
  if (first.length !== second.length) {
    return false;
  }

  return first.every(
      (value, index) =>
          value === second[index],
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] =
      useState(true);

  const [loadError, setLoadError] =
      useState<string | null>(null);

  const [account, setAccount] =
      useState<Account | null>(null);

  const [university, setUniversity] =
      useState("");

  const [major, setMajor] =
      useState("");

  const [year, setYear] =
      useState("");

  const [courses, setCourses] =
      useState<string[]>([]);

  const [initialCourses, setInitialCourses] =
      useState<string[]>([]);

  const [
    initialUniversity,
    setInitialUniversity,
  ] = useState("");

  const [initialMajor, setInitialMajor] =
      useState("");

  const [initialYear, setInitialYear] =
      useState("");

  const [courseInput, setCourseInput] =
      useState("");

  const [
    universitySuggestionsOpen,
    setUniversitySuggestionsOpen,
  ] = useState(false);

  const [
    majorSuggestionsOpen,
    setMajorSuggestionsOpen,
  ] = useState(false);

  const [saving, setSaving] =
      useState(false);

  const [
    submitAttempted,
    setSubmitAttempted,
  ] = useState(false);

  const [
    pendingRedirect,
    setPendingRedirect,
  ] = useState<string | null>(null);

  const [alertOpen, setAlertOpen] =
      useState(false);

  const [alertConfig, setAlertConfig] =
      useState<AlertConfig>({
        title: "",
        message: "",
        type: "info",
      });

  function showAlert(
      title: string,
      message: string,
      type: AlertType = "info",
  ) {
    setAlertConfig({
      title,
      message,
      type,
    });

    setAlertOpen(true);
  }

  const loadOnboarding =
      useCallback(async () => {
        setCheckingAuth(true);
        setLoadError(null);

        try {
          const {
            data: { user },
            error: userError,
          } =
              await supabase.auth.getUser();

          if (userError) {
            throw userError;
          }

          if (!user) {
            router.replace("/");
            return;
          }

          if (!isEduEmail(user.email)) {
            await supabase.auth.signOut();

            setPendingRedirect("/");

            showAlert(
                "Student email required",
                "StudyGrouprr is currently available to students with a .edu email address.",
                "warning",
            );

            return;
          }

          const [
            profileResult,
            coursesResult,
          ] = await Promise.all([
            supabase
                .from("profiles")
                .select(
                    "name, university, major, year, onboarding_complete",
                )
                .eq("id", user.id)
                .maybeSingle(),

            supabase
                .from("user_courses")
                .select("course_code")
                .eq("user_id", user.id)
                .order("course_code"),
          ]);

          if (profileResult.error) {
            throw profileResult.error;
          }

          if (coursesResult.error) {
            throw coursesResult.error;
          }

          if (
              profileResult.data
                  ?.onboarding_complete
          ) {
            router.replace(
                "/dashboard",
            );
            return;
          }

          const metadata =
              user.user_metadata ?? {};

          const accountName =
              profileResult.data?.name ||
              metadata.full_name ||
              metadata.name ||
              user.email?.split("@")[0] ||
              "Student";

          const avatarUrl =
              metadata.avatar_url ||
              metadata.picture ||
              null;

          const savedCourses =
              Array.from(
                  new Set(
                      (coursesResult.data ?? [])
                          .map((course) =>
                              typeof course.course_code ===
                              "string"
                                  ? normalizeCourseCode(
                                      course.course_code,
                                  )
                                  : "",
                          )
                          .filter(Boolean),
                  ),
              ).sort();

          setAccount({
            id: user.id,
            name: accountName,
            email: user.email || "",
            avatarUrl,
          });

          const savedUniversity =
              profileResult.data
                  ?.university || "";

          const savedMajor =
              profileResult.data?.major ||
              "";

          const savedYear =
              profileResult.data?.year ||
              "";

          setUniversity(savedUniversity);
          setMajor(savedMajor);
          setYear(savedYear);

          setInitialUniversity(
              savedUniversity,
          );

          setInitialMajor(savedMajor);
          setInitialYear(savedYear);

          setCourses(savedCourses);
          setInitialCourses(
              savedCourses,
          );
        } catch (error) {
          console.error(
              "Unable to load onboarding:",
              error,
          );

          setLoadError(
              error instanceof Error
                  ? error.message
                  : "Your onboarding details could not be loaded.",
          );
        } finally {
          setCheckingAuth(false);
        }
      }, [router]);

  useEffect(() => {
    void loadOnboarding();
  }, [loadOnboarding]);

  const universityResults =
      useMemo(() => {
        const search =
            university
                .trim()
                .toLowerCase();

        if (!search) {
          return universities.slice(
              0,
              8,
          );
        }

        return universities
            .filter((school) =>
                school.name
                    .toLowerCase()
                    .includes(search),
            )
            .slice(0, 8);
      }, [university]);

  const majorResults =
      useMemo(() => {
        const search =
            major.trim().toLowerCase();

        if (!search) {
          return majors.slice(0, 8);
        }

        return majors
            .filter((item) =>
                item.major
                    .toLowerCase()
                    .includes(search),
            )
            .slice(0, 8);
      }, [major]);

  const exactUniversity =
      useMemo(
          () =>
              universities.find(
                  (school) =>
                      school.name.toLowerCase() ===
                      university
                          .trim()
                          .toLowerCase(),
              ) ?? null,
          [university],
      );

  const exactMajor = useMemo(
      () =>
          majors.find(
              (item) =>
                  item.major.toLowerCase() ===
                  major.trim().toLowerCase(),
          ) ?? null,
      [major],
  );

  const isCustomMajor =
      major.trim().length > 0 &&
      !exactMajor;

  const normalizedCourseInput =
      useMemo(
          () =>
              normalizeCourseCode(
                  courseInput,
              ),
          [courseInput],
      );

  const courseInputValid =
      normalizedCourseInput.length === 0 ||
      isValidCourseCode(
          normalizedCourseInput,
      );

  const missingFields = useMemo(
      () => {
        const missing: string[] = [];

        if (!exactUniversity) {
          missing.push("university");
        }

        if (major.trim().length < 3) {
          missing.push("major");
        }

        if (!YEARS.includes(year)) {
          missing.push("academic year");
        }

        return missing;
      },
      [
        exactUniversity,
        major,
        year,
      ],
  );

  const canContinue =
      missingFields.length === 0;

  const setupProgress =
      useMemo(() => {
        const checks = [
          Boolean(exactUniversity),
          major.trim().length >= 3,
          YEARS.includes(year),
          courses.length > 0,
        ];

        return {
          completed:
          checks.filter(Boolean)
              .length,
          total: checks.length,
          percentage: Math.round(
              (checks.filter(Boolean)
                      .length /
                  checks.length) *
              100,
          ),
        };
      }, [
        courses.length,
        exactUniversity,
        major,
        year,
      ]);

  const hasChanges =
      Boolean(account) &&
      (university.trim() !==
          initialUniversity.trim() ||
          major.trim() !==
          initialMajor.trim() ||
          year !== initialYear ||
          !arraysMatch(
              courses,
              initialCourses,
          ));

  useEffect(() => {
    function protectDraft(
        event: BeforeUnloadEvent,
    ) {
      if (
          !hasChanges ||
          saving
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
        "beforeunload",
        protectDraft,
    );

    return () => {
      window.removeEventListener(
          "beforeunload",
          protectDraft,
      );
    };
  }, [hasChanges, saving]);

  function addCourse() {
    const courseCode =
        normalizedCourseInput;

    if (!courseCode) {
      return;
    }

    if (
        containsInappropriateContent(
            courseCode,
        )
    ) {
      showAlert(
          "Invalid course",
          "Remove inappropriate language from the course code.",
          "warning",
      );
      return;
    }

    if (
        !isValidCourseCode(
            courseCode,
        )
    ) {
      showAlert(
          "Invalid course code",
          "Use a course code such as CS400, MATH340, or BIO101.",
          "warning",
      );
      return;
    }

    if (
        courses.includes(
            courseCode,
        )
    ) {
      showAlert(
          "Course already added",
          `${courseCode} is already in your semester.`,
          "info",
      );
      return;
    }

    if (
        courses.length >=
        MAX_COURSES
    ) {
      showAlert(
          "Course limit reached",
          `Add up to ${MAX_COURSES} courses during onboarding. You can manage them later from Profile.`,
          "warning",
      );
      return;
    }

    setCourses((current) =>
        [...current, courseCode].sort(),
    );

    setCourseInput("");
  }

  async function completeOnboarding(
      event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setSubmitAttempted(true);

    if (!canContinue) {
      showAlert(
          "Complete the required details",
          `Add your ${missingFields.join(
              ", ",
          )} before continuing.`,
          "warning",
      );
      return;
    }

    const cleanedMajor =
        major.trim();

    if (
        !exactMajor &&
        containsInappropriateContent(
            cleanedMajor,
        )
    ) {
      showAlert(
          "Invalid major",
          "Remove inappropriate language from your major.",
          "warning",
      );
      return;
    }

    if (
        !exactMajor &&
        !/^[a-zA-Z\s&\-()]+$/.test(
            cleanedMajor,
        )
    ) {
      showAlert(
          "Invalid major",
          "Use letters, spaces, ampersands, hyphens, or parentheses.",
          "warning",
      );
      return;
    }

    if (
        cleanedMajor.length < 3 ||
        cleanedMajor.length > 100
    ) {
      showAlert(
          "Invalid major",
          "Your major must be between 3 and 100 characters.",
          "warning",
      );
      return;
    }

    if (!account) {
      showAlert(
          "Account unavailable",
          "Your Google account could not be loaded. Refresh the page and try again.",
          "error",
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } =
          await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
            "Your session expired. Please sign in again.",
        );
      }

      const { error: profileError } =
          await supabase
              .from("profiles")
              .update({
                university:
                exactUniversity!.name,
                major: cleanedMajor,
                major_is_custom:
                isCustomMajor,
                year,
                onboarding_complete:
                    true,
              })
              .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      let courseError:
          Error | null = null;

      if (courses.length > 0) {
        const { error } =
            await supabase
                .from("user_courses")
                .upsert(
                    courses.map(
                        (courseCode) => ({
                          user_id: user.id,
                          course_code:
                          courseCode,
                        }),
                    ),
                    {
                      onConflict:
                          "user_id,course_code",
                    },
                );

        if (error) {
          courseError = new Error(
              error.message,
          );
        }
      }

      window.dispatchEvent(
          new CustomEvent(
              "profile-updated",
          ),
      );

      if (courseError) {
        setPendingRedirect(
            "/dashboard",
        );

        showAlert(
            "Profile saved",
            "Your account is ready, but some courses could not be saved. You can add them later from Profile.",
            "warning",
        );

        return;
      }

      router.replace(
          "/dashboard",
      );
    } catch (error) {
      showAlert(
          "Unable to finish setup",
          error instanceof Error
              ? error.message
              : "Your profile could not be saved.",
          "error",
      );
    } finally {
      setSaving(false);
    }
  }

  if (
      checkingAuth &&
      !alertOpen
  ) {
    return <OnboardingLoading />;
  }

  if (
      loadError &&
      !account
  ) {
    return (
        <main
            id="studygrouprr-onboarding"
            className={styles.loadingPage}
        >
          <div className={styles.errorCard}>
          <span
              className={styles.errorIcon}
          >
            <ShieldCheck size={24} />
          </span>

            <h1>
              Setup could not be loaded
            </h1>

            <p>{loadError}</p>

            <button
                type="button"
                onClick={() =>
                    void loadOnboarding()
                }
            >
              Try again
            </button>
          </div>
        </main>
    );
  }

  return (
      <>
        <main
            id="studygrouprr-onboarding"
            className={styles.page}
        >
          <div className={styles.shell}>
            <section
                className={styles.introPanel}
            >
              <div>
              <span
                  className={styles.brandMark}
              >
                <Users size={20} />
              </span>

                <p
                    className={styles.eyebrow}
                >
                  Welcome to StudyGrouprr
                </p>

                <h1>
                  Set up your campus profile
                </h1>

                <p
                    className={styles.introText}
                >
                  These details help show you
                  relevant sessions, courses, and
                  students at your university.
                </p>
              </div>

              {account && (
                  <div
                      className={
                        styles.accountCard
                      }
                  >
                    <div
                        className={styles.avatar}
                    >
                      <SafeAvatar
                          src={account.avatarUrl}
                          name={account.name}
                      />
                    </div>

                    <div>
                      <small>
                        Connected Google account
                      </small>

                      <strong>
                        {account.name}
                      </strong>

                      <span>
                    <Mail size={13} />
                        {account.email}
                  </span>
                    </div>

                    <Check size={18} />
                  </div>
              )}

              <div
                  className={styles.benefits}
              >
                <Benefit
                    icon={
                      <GraduationCap
                          size={17}
                      />
                    }
                    title="Your campus"
                    description="Only see relevant activity from students at your university."
                />

                <Benefit
                    icon={<BookOpen size={17} />}
                    title="Your courses"
                    description="Prioritize sessions and classmates studying the same subjects."
                />

                <Benefit
                    icon={<Users size={17} />}
                    title="Better matches"
                    description="Use your major and year to improve buddy recommendations."
                />
              </div>

              <div
                  className={styles.progressCard}
              >
                <div>
                  <span>Setup progress</span>

                  <strong>
                    {setupProgress.completed} of{" "}
                    {setupProgress.total}
                  </strong>
                </div>

                <div
                    className={
                      styles.progressTrack
                    }
                    aria-hidden="true"
                >
                <span
                    style={{
                      width: `${setupProgress.percentage}%`,
                    }}
                />
                </div>

                <small>
                  Courses are optional, but adding at
                  least one improves recommendations.
                </small>
              </div>
            </section>

            <section
                className={styles.formPanel}
            >
              <div
                  className={styles.formHeader}
              >
                <div>
                  <p>Account setup</p>

                  <h2>
                    Tell us about your studies
                  </h2>
                </div>

                <span>
                About 1 minute
              </span>
              </div>

              <form
                  className={styles.form}
                  onSubmit={
                    completeOnboarding
                  }
                  noValidate
              >
                <div className={styles.field}>
                  <label htmlFor="onboarding-university">
                  <span
                      className={styles.fieldIcon}
                  >
                    <GraduationCap
                        size={17}
                    />
                  </span>

                    <span>
                    <strong>
                      University
                    </strong>

                    <small>
                      Required · controls your
                      campus network
                    </small>
                  </span>
                  </label>

                  <div
                      className={
                        styles.autocomplete
                      }
                  >
                    <Search size={15} />

                    <input
                        id="onboarding-university"
                        value={university}
                        onFocus={() =>
                            setUniversitySuggestionsOpen(
                                true,
                            )
                        }
                        onBlur={() => {
                          window.setTimeout(
                              () =>
                                  setUniversitySuggestionsOpen(
                                      false,
                                  ),
                              120,
                          );
                        }}
                        onChange={(event) => {
                          setUniversity(
                              event.target.value,
                          );

                          setUniversitySuggestionsOpen(
                              true,
                          );
                        }}
                        placeholder="Search for your university"
                        autoComplete="off"
                        aria-invalid={Boolean(
                            submitAttempted &&
                            !exactUniversity,
                        )}
                    />

                    {university && (
                        <button
                            type="button"
                            aria-label="Clear university"
                            onMouseDown={(event) =>
                                event.preventDefault()
                            }
                            onClick={() =>
                                setUniversity("")
                            }
                        >
                          <X size={14} />
                        </button>
                    )}

                    {universitySuggestionsOpen &&
                        universityResults.length >
                        0 && (
                            <div
                                className={
                                  styles.suggestions
                                }
                            >
                              {universityResults.map(
                                  (school) => (
                                      <button
                                          key={
                                            school.name
                                          }
                                          type="button"
                                          onMouseDown={(
                                              event,
                                          ) =>
                                              event.preventDefault()
                                          }
                                          onClick={() => {
                                            setUniversity(
                                                school.name,
                                            );

                                            setUniversitySuggestionsOpen(
                                                false,
                                            );
                                          }}
                                      >
                                        <GraduationCap
                                            size={14}
                                        />

                                        <span>
                                {
                                  school.name
                                }
                              </span>
                                      </button>
                                  ),
                              )}
                            </div>
                        )}
                  </div>

                  {submitAttempted &&
                      !exactUniversity && (
                          <p
                              className={
                                styles.fieldError
                              }
                          >
                            Select a university from the
                            provided list.
                          </p>
                      )}
                </div>

                <div
                    className={
                      styles.twoColumnFields
                    }
                >
                  <div className={styles.field}>
                    <label htmlFor="onboarding-major">
                    <span
                        className={
                          styles.fieldIcon
                        }
                    >
                      <BookOpen size={17} />
                    </span>

                      <span>
                      <strong>Major</strong>

                      <small>Required</small>
                    </span>
                    </label>

                    <div
                        className={
                          styles.autocomplete
                        }
                    >
                      <Search size={15} />

                      <input
                          id="onboarding-major"
                          value={major}
                          maxLength={100}
                          onFocus={() =>
                              setMajorSuggestionsOpen(
                                  true,
                              )
                          }
                          onBlur={() => {
                            window.setTimeout(
                                () =>
                                    setMajorSuggestionsOpen(
                                        false,
                                    ),
                                120,
                            );
                          }}
                          onChange={(event) => {
                            setMajor(
                                event.target.value,
                            );

                            setMajorSuggestionsOpen(
                                true,
                            );
                          }}
                          placeholder="Search or enter a major"
                          autoComplete="off"
                          aria-invalid={Boolean(
                              submitAttempted &&
                              major.trim().length <
                              3,
                          )}
                      />

                      {major && (
                          <button
                              type="button"
                              aria-label="Clear major"
                              onMouseDown={(event) =>
                                  event.preventDefault()
                              }
                              onClick={() =>
                                  setMajor("")
                              }
                          >
                            <X size={14} />
                          </button>
                      )}

                      {majorSuggestionsOpen &&
                          (majorResults.length >
                              0 ||
                              major.trim()) && (
                              <div
                                  className={
                                    styles.suggestions
                                  }
                              >
                                {majorResults.map(
                                    (item) => (
                                        <button
                                            key={
                                              item.major
                                            }
                                            type="button"
                                            onMouseDown={(
                                                event,
                                            ) =>
                                                event.preventDefault()
                                            }
                                            onClick={() => {
                                              setMajor(
                                                  item.major,
                                              );

                                              setMajorSuggestionsOpen(
                                                  false,
                                              );
                                            }}
                                        >
                                          <BookOpen
                                              size={14}
                                          />

                                          <span>
                                  <strong>
                                    {
                                      item.major
                                    }
                                  </strong>

                                  <small>
                                    {
                                      item.category
                                    }
                                  </small>
                                </span>
                                        </button>
                                    ),
                                )}

                                {major.trim() &&
                                    !majorResults.some(
                                        (item) =>
                                            item.major.toLowerCase() ===
                                            major
                                                .trim()
                                                .toLowerCase(),
                                    ) && (
                                        <button
                                            type="button"
                                            onMouseDown={(
                                                event,
                                            ) =>
                                                event.preventDefault()
                                            }
                                            onClick={() =>
                                                setMajorSuggestionsOpen(
                                                    false,
                                                )
                                            }
                                        >
                                          <Plus
                                              size={14}
                                          />

                                          <span>
                                  <strong>
                                    Use “
                                    {major.trim()}
                                    ”
                                  </strong>

                                  <small>
                                    Custom major
                                  </small>
                                </span>
                                        </button>
                                    )}
                              </div>
                          )}
                    </div>

                    {submitAttempted &&
                        major.trim().length <
                        3 && (
                            <p
                                className={
                                  styles.fieldError
                                }
                            >
                              Enter a major with at least
                              three characters.
                            </p>
                        )}
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="onboarding-year">
                    <span
                        className={
                          styles.fieldIcon
                        }
                    >
                      <User size={17} />
                    </span>

                      <span>
                      <strong>
                        Academic year
                      </strong>

                      <small>Required</small>
                    </span>
                    </label>

                    <select
                        id="onboarding-year"
                        value={year}
                        onChange={(event) =>
                            setYear(
                                event.target.value,
                            )
                        }
                        aria-invalid={Boolean(
                            submitAttempted &&
                            !YEARS.includes(
                                year,
                            ),
                        )}
                    >
                      <option value="">
                        Select year
                      </option>

                      {YEARS.map(
                          (yearOption) => (
                              <option
                                  key={yearOption}
                                  value={yearOption}
                              >
                                {yearOption}
                              </option>
                          ),
                      )}
                    </select>

                    {submitAttempted &&
                        !YEARS.includes(
                            year,
                        ) && (
                            <p
                                className={
                                  styles.fieldError
                                }
                            >
                              Select your academic year.
                            </p>
                        )}
                  </div>
                </div>

                <div className={styles.courseSection}>
                  <div
                      className={
                        styles.courseHeading
                      }
                  >
                    <div>
                    <span
                        className={
                          styles.fieldIcon
                        }
                    >
                      <Sparkles size={17} />
                    </span>

                      <div>
                        <strong>
                          Current courses
                        </strong>

                        <small>
                          Optional · improves session
                          and buddy matching
                        </small>
                      </div>
                    </div>

                    <span>
                    {courses.length}/
                      {MAX_COURSES}
                  </span>
                  </div>

                  <div
                      className={styles.courseForm}
                  >
                    <label htmlFor="onboarding-course">
                      <BookOpen size={15} />

                      <input
                          id="onboarding-course"
                          value={courseInput}
                          maxLength={9}
                          onChange={(event) =>
                              setCourseInput(
                                  normalizeCourseCode(
                                      event.target.value,
                                  ),
                              )
                          }
                          onKeyDown={(event) => {
                            if (
                                event.key === "Enter"
                            ) {
                              event.preventDefault();
                              addCourse();
                            }
                          }}
                          placeholder="Add a course, e.g. CS400"
                          autoComplete="off"
                      />

                      {courseInput && (
                          <button
                              type="button"
                              aria-label="Clear course code"
                              onClick={() =>
                                  setCourseInput("")
                              }
                          >
                            <X size={14} />
                          </button>
                      )}
                    </label>

                    <button
                        type="button"
                        onClick={addCourse}
                        disabled={
                            !normalizedCourseInput ||
                            !courseInputValid ||
                            courses.length >=
                            MAX_COURSES
                        }
                    >
                      <Plus size={16} />
                      Add
                    </button>
                  </div>

                  {courseInput &&
                      !courseInputValid && (
                          <p
                              className={
                                styles.courseError
                              }
                          >
                            Use a code such as CS400,
                            MATH340, or BIO101.
                          </p>
                      )}

                  {courses.length > 0 ? (
                      <div
                          className={
                            styles.courseChips
                          }
                      >
                        {courses.map(
                            (course) => (
                                <span key={course}>
                          {course}

                                  <button
                                      type="button"
                                      aria-label={`Remove ${course}`}
                                      onClick={() =>
                                          setCourses(
                                              (current) =>
                                                  current.filter(
                                                      (
                                                          savedCourse,
                                                      ) =>
                                                          savedCourse !==
                                                          course,
                                                  ),
                                          )
                                      }
                                  >
                            <X size={13} />
                          </button>
                        </span>
                            ),
                        )}
                      </div>
                  ) : (
                      <p
                          className={
                            styles.courseHint
                          }
                      >
                        You can skip this and add
                        courses later from Profile.
                      </p>
                  )}
                </div>

                <div
                    className={
                      styles.submitSection
                    }
                >
                  <div>
                    <strong>
                      {canContinue
                          ? "Your profile is ready."
                          : `Still needed: ${missingFields.join(
                              ", ",
                          )}.`}
                    </strong>

                    <span>
                    You can update all of this later
                    from Profile.
                  </span>
                  </div>

                  <button
                      type="submit"
                      disabled={
                          saving ||
                          !canContinue
                      }
                  >
                    {saving
                        ? "Saving…"
                        : "Continue to dashboard"}

                    <ArrowRight size={17} />
                  </button>
                </div>
              </form>
            </section>
          </div>
        </main>

        <AlertModal
            open={alertOpen}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            onClose={() => {
              setAlertOpen(false);

              if (pendingRedirect) {
                const destination =
                    pendingRedirect;

                setPendingRedirect(null);

                router.push(destination);
              }
            }}
        />
      </>
  );
}

function Benefit({
                   icon,
                   title,
                   description,
                 }: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
      <div className={styles.benefit}>
        <span>{icon}</span>

        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      </div>
  );
}

function OnboardingLoading() {
  return (
      <main
          id="studygrouprr-onboarding"
          className={styles.loadingPage}
          role="status"
          aria-live="polite"
      >
        <div className={styles.loadingCard}>
          <strong>
            Preparing your account…
          </strong>

          <div
              className={styles.loadingRows}
              aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
        </div>
      </main>
  );
}
