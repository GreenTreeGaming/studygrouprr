"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  GraduationCap,
  Mail,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";

import AlertModal from "@/components/AlertModal";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import majors from "@/data/majors.json";
import universities from "@/data/universities.json";
import { containsInappropriateContent } from "@/lib/contentModeration";
import {
  isValidCourseCode,
  normalizeCourseCode,
} from "@/lib/courseValidation";
import { supabase } from "@/lib/supabase";

import styles from "./profile.module.css";

type ProfileField =
    | "name"
    | "university"
    | "major"
    | "year";

type ProfileFormData = Record<
    ProfileField,
    string
>;

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

const EMPTY_PROFILE_FORM: ProfileFormData = {
  name: "",
  university: "",
  major: "",
  year: "",
};

const FIELD_MAX_LENGTHS: Record<
    ProfileField,
    number
> = {
  name: 80,
  university: 180,
  major: 140,
  year: 30,
};

const YEARS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate",
];

function getInitial(
    name: string | null | undefined,
): string {
  return (
      name?.trim().charAt(0).toUpperCase() || "S"
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

  const validSource =
      typeof src === "string" &&
      src.trim().length > 0 &&
      !imageFailed;

  if (!validSource) {
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
          onError={() => setImageFailed(true)}
      />
  );
}

export default function ProfilePage() {
  const {
    profile,
    loading: profileLoading,
  } = useRequireOnboarding();

  const [formData, setFormData] =
      useState<ProfileFormData>(
          EMPTY_PROFILE_FORM,
      );

  const [savedData, setSavedData] =
      useState<ProfileFormData>(
          EMPTY_PROFILE_FORM,
      );

  const [savingProfile, setSavingProfile] =
      useState(false);

  const [courses, setCourses] = useState<
      string[]
  >([]);

  const [coursesLoading, setCoursesLoading] =
      useState(true);

  const [newCourse, setNewCourse] =
      useState("");

  const [addingCourse, setAddingCourse] =
      useState(false);

  const [
    removingCourse,
    setRemovingCourse,
  ] = useState<string | null>(null);

  const [loadError, setLoadError] =
      useState<string | null>(null);

  const [
    universitySuggestionsOpen,
    setUniversitySuggestionsOpen,
  ] = useState(false);

  const [
    majorSuggestionsOpen,
    setMajorSuggestionsOpen,
  ] = useState(false);

  const [alertOpen, setAlertOpen] =
      useState(false);

  const [alertConfig, setAlertConfig] =
      useState<AlertConfig>({
        title: "",
        message: "",
        type: "info",
      });

  const profileId = profile?.id;
  const profileName = profile?.name || "";
  const profileUniversity =
      profile?.university || "";
  const profileMajor = profile?.major || "";
  const profileYear = profile?.year || "";

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

  useEffect(() => {
    if (!profileId) {
      return;
    }

    const nextData: ProfileFormData = {
      name: profileName,
      university: profileUniversity,
      major: profileMajor,
      year: profileYear,
    };

    setFormData(nextData);
    setSavedData(nextData);
  }, [
    profileId,
    profileMajor,
    profileName,
    profileUniversity,
    profileYear,
  ]);

  const loadCourses = useCallback(
      async () => {
        if (!profileId) {
          return;
        }

        setCoursesLoading(true);
        setLoadError(null);

        try {
          const { data, error } =
              await supabase
                  .from("user_courses")
                  .select("course_code")
                  .eq("user_id", profileId)
                  .order("course_code");

          if (error) {
            throw error;
          }

          const courseCodes = Array.from(
              new Set(
                  (data ?? [])
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

          setCourses(courseCodes);
        } catch (error) {
          console.error(
              "Unable to load courses:",
              error,
          );

          setLoadError(
              error instanceof Error
                  ? error.message
                  : "Your courses could not be loaded.",
          );
        } finally {
          setCoursesLoading(false);
        }
      },
      [profileId],
  );

  useEffect(() => {
    if (!profileId) {
      return;
    }

    void loadCourses();
  }, [loadCourses, profileId]);

  const universityResults = useMemo(() => {
    const search =
        formData.university
            .trim()
            .toLowerCase();

    if (!search) {
      return universities.slice(0, 8);
    }

    return universities
        .filter((university) =>
            university.name
                .toLowerCase()
                .includes(search),
        )
        .slice(0, 8);
  }, [formData.university]);

  const majorResults = useMemo(() => {
    const search =
        formData.major
            .trim()
            .toLowerCase();

    if (!search) {
      return majors.slice(0, 8);
    }

    return majors
        .filter((major) =>
            major.major
                .toLowerCase()
                .includes(search),
        )
        .slice(0, 8);
  }, [formData.major]);

  const normalizedCourseDraft =
      useMemo(
          () =>
              normalizeCourseCode(
                  newCourse,
              ),
          [newCourse],
      );

  const courseDraftValid =
      normalizedCourseDraft.length === 0 ||
      isValidCourseCode(
          normalizedCourseDraft,
      );

  const profileHasChanges = useMemo(
      () =>
          (
              Object.keys(
                  formData,
              ) as ProfileField[]
          ).some(
              (field) =>
                  formData[field].trim() !==
                  savedData[field].trim(),
          ),
      [formData, savedData],
  );

  const universityChanged =
      formData.university.trim() !==
      savedData.university.trim();

  const completionChecks = useMemo(
      () => [
        Boolean(formData.name.trim()),
        Boolean(
            formData.university.trim(),
        ),
        Boolean(formData.major.trim()),
        Boolean(formData.year.trim()),
        courses.length > 0,
      ],
      [courses.length, formData],
  );

  const completedChecks =
      completionChecks.filter(Boolean).length;

  const completionPercentage = Math.round(
      (completedChecks /
          completionChecks.length) *
      100,
  );

  const memberSince = useMemo(() => {
    if (!profile?.created_at) {
      return "Unknown";
    }

    const createdAt = new Date(
        profile.created_at,
    );

    if (
        Number.isNaN(
            createdAt.getTime(),
        )
    ) {
      return "Unknown";
    }

    return createdAt.toLocaleDateString(
        [],
        {
          month: "long",
          day: "numeric",
          year: "numeric",
        },
    );
  }, [profile?.created_at]);

  useEffect(() => {
    function preventAccidentalExit(
        event: BeforeUnloadEvent,
    ) {
      if (
          !profileHasChanges ||
          savingProfile
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
        "beforeunload",
        preventAccidentalExit,
    );

    return () => {
      window.removeEventListener(
          "beforeunload",
          preventAccidentalExit,
      );
    };
  }, [
    profileHasChanges,
    savingProfile,
  ]);

  function updateField(
      field: ProfileField,
      value: string,
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetProfileChanges() {
    setFormData(savedData);
    setUniversitySuggestionsOpen(false);
    setMajorSuggestionsOpen(false);
  }

  async function saveProfile(
      event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
        savingProfile ||
        !profileHasChanges
    ) {
      return;
    }

    const cleanedData: ProfileFormData = {
      name: formData.name.trim(),
      university:
          formData.university.trim(),
      major: formData.major.trim(),
      year: formData.year.trim(),
    };

    for (
        const field of Object.keys(
        cleanedData,
    ) as ProfileField[]
        ) {
      if (!cleanedData[field]) {
        showAlert(
            "Missing profile detail",
            "Name, university, major, and academic year are required.",
            "warning",
        );
        return;
      }

      if (
          cleanedData[field].length >
          FIELD_MAX_LENGTHS[field]
      ) {
        showAlert(
            "Profile detail is too long",
            `Keep ${field} under ${FIELD_MAX_LENGTHS[field]} characters.`,
            "warning",
        );
        return;
      }
    }

    const combinedText =
        Object.values(cleanedData).join(
            " ",
        );

    if (
        containsInappropriateContent(
            combinedText,
        )
    ) {
      showAlert(
          "Inappropriate content",
          "Remove inappropriate language before saving.",
          "warning",
      );
      return;
    }

    setSavingProfile(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
            "Your session expired. Please sign in again.",
        );
      }

      const { error } = await supabase
          .from("profiles")
          .update({
            ...cleanedData,
            onboarding_complete: true,
          })
          .eq("id", user.id);

      if (error) {
        throw error;
      }

      setFormData(cleanedData);
      setSavedData(cleanedData);
      setUniversitySuggestionsOpen(false);
      setMajorSuggestionsOpen(false);

      window.dispatchEvent(
          new CustomEvent(
              "profile-updated",
          ),
      );

      showAlert(
          "Profile updated",
          "Your profile details were saved.",
          "success",
      );
    } catch (error) {
      showAlert(
          "Unable to save profile",
          error instanceof Error
              ? error.message
              : "Your changes could not be saved.",
          "error",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function addCourse(
      event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (addingCourse) {
      return;
    }

    const courseCode =
        normalizedCourseDraft;

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
        !isValidCourseCode(courseCode)
    ) {
      showAlert(
          "Invalid course code",
          "Use a course code such as CS400, MATH340, or BIO101.",
          "warning",
      );
      return;
    }

    if (
        courses.some(
            (course) =>
                normalizeCourseCode(
                    course,
                ) === courseCode,
        )
    ) {
      showAlert(
          "Course already added",
          `${courseCode} is already in your semester.`,
          "info",
      );
      return;
    }

    if (!profileId) {
      showAlert(
          "Profile missing",
          "Your profile could not be found.",
          "error",
      );
      return;
    }

    setAddingCourse(true);

    try {
      const { error } = await supabase
          .from("user_courses")
          .insert({
            user_id: profileId,
            course_code: courseCode,
          });

      if (error) {
        if (error.code === "23505") {
          showAlert(
              "Course already added",
              `${courseCode} is already in your semester.`,
              "info",
          );
          return;
        }

        throw error;
      }

      setCourses((current) =>
          [...current, courseCode].sort(),
      );

      setNewCourse("");

      showAlert(
          "Course added",
          `${courseCode} was added to your semester.`,
          "success",
      );
    } catch (error) {
      showAlert(
          "Unable to add course",
          error instanceof Error
              ? error.message
              : "The course could not be added.",
          "error",
      );
    } finally {
      setAddingCourse(false);
    }
  }

  async function removeCourse(
      courseCode: string,
  ) {
    if (
        removingCourse ||
        !profileId
    ) {
      return;
    }

    setRemovingCourse(courseCode);

    try {
      const { error } = await supabase
          .from("user_courses")
          .delete()
          .eq("user_id", profileId)
          .eq(
              "course_code",
              courseCode,
          );

      if (error) {
        throw error;
      }

      setCourses((current) =>
          current.filter(
              (course) =>
                  course !== courseCode,
          ),
      );

      showAlert(
          "Course removed",
          `${courseCode} was removed from your semester.`,
          "success",
      );
    } catch (error) {
      showAlert(
          "Unable to remove course",
          error instanceof Error
              ? error.message
              : "The course could not be removed.",
          "error",
      );
    } finally {
      setRemovingCourse(null);
    }
  }

  if (
      profileLoading ||
      (profile && coursesLoading)
  ) {
    return <ProfileLoading />;
  }

  if (!profile) {
    return (
        <main
            id="studygrouprr-profile"
            className={styles.loadingPage}
        >
          <div className={styles.loadingCard}>
            <strong>
              We could not find your profile.
            </strong>

            <Link href="/login">
              Return to sign in
            </Link>
          </div>
        </main>
    );
  }

  return (
      <>
        <main
            id="studygrouprr-profile"
            className={styles.page}
        >
          <div className={styles.shell}>
            <div className={styles.backRow}>
              <Link href="/dashboard">
                <ArrowLeft size={16} />
                Dashboard
              </Link>

              <Link href="/buddies">
                View buddies
                <ArrowRight size={15} />
              </Link>
            </div>

            {loadError && (
                <div
                    className={styles.errorBanner}
                    role="alert"
                >
                  <div>
                    <strong>
                      Courses could not be loaded
                    </strong>

                    <span>{loadError}</span>
                  </div>

                  <button
                      type="button"
                      onClick={() =>
                          void loadCourses()
                      }
                  >
                    Try again
                  </button>
                </div>
            )}

            <header className={styles.header}>
              <div className={styles.headerCopy}>
                <p>
                  Account and preferences
                </p>

                <h1>Profile</h1>

                <span>
                Keep your campus details and
                current courses accurate.
              </span>
              </div>

              <span className={styles.headerBadge}>
              <ShieldCheck size={15} />
              Student profile
            </span>
            </header>

            <div className={styles.contentGrid}>
              <div className={styles.mainColumn}>
                <form
                    className={styles.profileForm}
                    onSubmit={saveProfile}
                >
                  <div
                      className={styles.cardHeader}
                  >
                    <div>
                      <h2>Profile details</h2>

                      <p>
                        These details help classmates
                        recognize you and improve
                        campus matching.
                      </p>
                    </div>

                    {profileHasChanges && (
                        <span>
                      Unsaved changes
                    </span>
                    )}
                  </div>

                  <div
                      className={styles.profileFields}
                  >
                    <div className={styles.field}>
                      <label htmlFor="profile-name">
                      <span
                          className={
                            styles.fieldIcon
                          }
                      >
                        <User size={16} />
                      </span>

                        <span>
                        <strong>
                          Display name
                        </strong>
                        <small>
                          What classmates call you
                        </small>
                      </span>
                      </label>

                      <input
                          id="profile-name"
                          value={formData.name}
                          maxLength={
                            FIELD_MAX_LENGTHS.name
                          }
                          onChange={(event) =>
                              updateField(
                                  "name",
                                  event.target.value,
                              )
                          }
                          placeholder="Your name"
                          autoComplete="name"
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="profile-year">
                      <span
                          className={
                            styles.fieldIcon
                          }
                      >
                        <CalendarDays size={16} />
                      </span>

                        <span>
                        <strong>
                          Academic year
                        </strong>
                        <small>
                          Where you are in school
                        </small>
                      </span>
                      </label>

                      <select
                          id="profile-year"
                          value={formData.year}
                          onChange={(event) =>
                              updateField(
                                  "year",
                                  event.target.value,
                              )
                          }
                      >
                        <option value="">
                          Select year
                        </option>

                        {YEARS.map((year) => (
                            <option
                                key={year}
                                value={year}
                            >
                              {year}
                            </option>
                        ))}
                      </select>
                    </div>

                    <div
                        className={[
                          styles.field,
                          styles.fieldWide,
                        ].join(" ")}
                    >
                      <label htmlFor="profile-university">
                      <span
                          className={
                            styles.fieldIcon
                          }
                      >
                        <GraduationCap
                            size={16}
                        />
                      </span>

                        <span>
                        <strong>
                          University
                        </strong>
                        <small>
                          Controls your campus
                          network
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
                            id="profile-university"
                            value={
                              formData.university
                            }
                            maxLength={
                              FIELD_MAX_LENGTHS.university
                            }
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
                              updateField(
                                  "university",
                                  event.target.value,
                              );

                              setUniversitySuggestionsOpen(
                                  true,
                              );
                            }}
                            placeholder="Search universities"
                            autoComplete="off"
                        />

                        {formData.university && (
                            <button
                                type="button"
                                aria-label="Clear university"
                                onMouseDown={(event) =>
                                    event.preventDefault()
                                }
                                onClick={() =>
                                    updateField(
                                        "university",
                                        "",
                                    )
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
                                      (university) => (
                                          <button
                                              key={
                                                university.name
                                              }
                                              type="button"
                                              onMouseDown={(
                                                  event,
                                              ) =>
                                                  event.preventDefault()
                                              }
                                              onClick={() => {
                                                updateField(
                                                    "university",
                                                    university.name,
                                                );

                                                setUniversitySuggestionsOpen(
                                                    false,
                                                );
                                              }}
                                          >
                                            {
                                              university.name
                                            }
                                          </button>
                                      ),
                                  )}
                                </div>
                            )}
                      </div>

                      {universityChanged && (
                          <div
                              className={
                                styles.universityWarning
                              }
                          >
                            <ShieldCheck
                                size={15}
                            />

                            <span>
                          Changing university changes
                          which sessions, live
                          students, and buddies you
                          can discover.
                        </span>
                          </div>
                      )}
                    </div>

                    <div
                        className={[
                          styles.field,
                          styles.fieldWide,
                        ].join(" ")}
                    >
                      <label htmlFor="profile-major">
                      <span
                          className={
                            styles.fieldIcon
                          }
                      >
                        <BookOpen size={16} />
                      </span>

                        <span>
                        <strong>Major</strong>
                        <small>
                          Helps find academically
                          similar students
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
                            id="profile-major"
                            value={formData.major}
                            maxLength={
                              FIELD_MAX_LENGTHS.major
                            }
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
                              updateField(
                                  "major",
                                  event.target.value,
                              );

                              setMajorSuggestionsOpen(
                                  true,
                              );
                            }}
                            placeholder="Search or enter a major"
                            autoComplete="off"
                        />

                        {formData.major && (
                            <button
                                type="button"
                                aria-label="Clear major"
                                onMouseDown={(event) =>
                                    event.preventDefault()
                                }
                                onClick={() =>
                                    updateField(
                                        "major",
                                        "",
                                    )
                                }
                            >
                              <X size={14} />
                            </button>
                        )}

                        {majorSuggestionsOpen &&
                            (majorResults.length >
                                0 ||
                                formData.major.trim()) && (
                                <div
                                    className={
                                      styles.suggestions
                                    }
                                >
                                  {majorResults.map(
                                      (major) => (
                                          <button
                                              key={
                                                major.major
                                              }
                                              type="button"
                                              onMouseDown={(
                                                  event,
                                              ) =>
                                                  event.preventDefault()
                                              }
                                              onClick={() => {
                                                updateField(
                                                    "major",
                                                    major.major,
                                                );

                                                setMajorSuggestionsOpen(
                                                    false,
                                                );
                                              }}
                                          >
                                            <strong>
                                              {major.major}
                                            </strong>

                                            <small>
                                              {
                                                major.category
                                              }
                                            </small>
                                          </button>
                                      ),
                                  )}

                                  {formData.major.trim() &&
                                      !majorResults.some(
                                          (major) =>
                                              major.major.toLowerCase() ===
                                              formData.major
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
                                            <strong>
                                              Use “
                                              {
                                                formData.major
                                              }
                                              ”
                                            </strong>

                                            <small>
                                              Custom major
                                            </small>
                                          </button>
                                      )}
                                </div>
                            )}
                      </div>
                    </div>
                  </div>

                  <div
                      className={styles.formActions}
                  >
                    <div>
                      <strong>
                        {profileHasChanges
                            ? "Review and save your changes."
                            : "Your saved profile is up to date."}
                      </strong>

                      <span>
                      Your email and avatar come from
                      your connected Google account.
                    </span>
                    </div>

                    <div
                        className={
                          styles.actionButtons
                        }
                    >
                      {profileHasChanges && (
                          <button
                              type="button"
                              className={
                                styles.cancelButton
                              }
                              disabled={savingProfile}
                              onClick={
                                resetProfileChanges
                              }
                          >
                            Cancel
                          </button>
                      )}

                      <button
                          type="submit"
                          className={
                            styles.saveButton
                          }
                          disabled={
                              savingProfile ||
                              !profileHasChanges
                          }
                      >
                        <Save size={16} />

                        {savingProfile
                            ? "Saving…"
                            : "Save changes"}
                      </button>
                    </div>
                  </div>
                </form>

                <section
                    className={styles.coursesCard}
                >
                  <div
                      className={styles.cardHeader}
                  >
                    <div>
                      <h2>My courses</h2>

                      <p>
                        Current courses improve
                        session and buddy
                        recommendations.
                      </p>
                    </div>

                    <span>
                    {courses.length}{" "}
                      {courses.length === 1
                          ? "course"
                          : "courses"}
                  </span>
                  </div>

                  <form
                      className={styles.courseForm}
                      onSubmit={addCourse}
                  >
                    <label htmlFor="profile-course">
                      <BookOpen size={16} />

                      <input
                          id="profile-course"
                          value={newCourse}
                          maxLength={9}
                          onChange={(event) =>
                              setNewCourse(
                                  normalizeCourseCode(
                                      event.target.value,
                                  ),
                              )
                          }
                          placeholder="Add a course, e.g. CS400"
                          autoComplete="off"
                      />

                      {newCourse && (
                          <button
                              type="button"
                              aria-label="Clear course code"
                              onClick={() =>
                                  setNewCourse("")
                              }
                          >
                            <X size={14} />
                          </button>
                      )}
                    </label>

                    <button
                        type="submit"
                        disabled={
                            addingCourse ||
                            !normalizedCourseDraft ||
                            !courseDraftValid
                        }
                    >
                      <Plus size={16} />

                      {addingCourse
                          ? "Adding…"
                          : "Add course"}
                    </button>
                  </form>

                  {newCourse &&
                      !courseDraftValid && (
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
                      <div className={styles.courseList}>
                        {courses.map((course) => (
                            <article
                                key={course}
                                className={
                                  styles.courseRow
                                }
                            >
                        <span
                            className={
                              styles.courseIcon
                            }
                        >
                          <BookOpen size={16} />
                        </span>

                              <div>
                                <strong>{course}</strong>

                                <span>
                            Course community and
                            matching
                          </span>
                              </div>

                              <Link
                                  href={`/courses/${encodeURIComponent(
                                      course,
                                  )}`}
                              >
                                Open
                                <ChevronRight
                                    size={15}
                                />
                              </Link>

                              <button
                                  type="button"
                                  disabled={
                                      removingCourse ===
                                      course
                                  }
                                  aria-label={`Remove ${course}`}
                                  onClick={() =>
                                      void removeCourse(
                                          course,
                                      )
                                  }
                              >
                                <Trash2 size={15} />
                              </button>
                            </article>
                        ))}
                      </div>
                  ) : (
                      <div
                          className={styles.courseEmpty}
                      >
                        <BookOpen size={22} />

                        <div>
                          <strong>
                            No courses added yet
                          </strong>

                          <span>
                        Add the classes you are
                        taking this semester.
                      </span>
                        </div>
                      </div>
                  )}
                </section>
              </div>

              <aside className={styles.sidebar}>
                <section
                    className={styles.identityCard}
                >
                  <div className={styles.avatar}>
                    <SafeAvatar
                        src={profile.avatar_url}
                        name={formData.name}
                    />
                  </div>

                  <h2>
                    {formData.name ||
                        "Campus student"}
                  </h2>

                  <p>
                    {formData.university ||
                        "University not added"}
                  </p>

                  <div
                      className={styles.identityTags}
                  >
                  <span>
                    <GraduationCap
                        size={14}
                    />
                    {formData.major ||
                        "Major not added"}
                  </span>

                    <span>
                    <CalendarDays size={14} />
                      {formData.year ||
                          "Year not added"}
                  </span>
                  </div>
                </section>

                <section
                    className={
                      styles.completionCard
                    }
                >
                  <div
                      className={
                        styles.completionHeader
                      }
                  >
                    <div>
                      <p>Profile setup</p>
                      <h2>
                        {completedChecks} of{" "}
                        {
                          completionChecks.length
                        }{" "}
                        complete
                      </h2>
                    </div>

                    <strong>
                      {completionPercentage}%
                    </strong>
                  </div>

                  <div
                      className={
                        styles.completionTrack
                      }
                      aria-hidden="true"
                  >
                  <span
                      style={{
                        width: `${completionPercentage}%`,
                      }}
                  />
                  </div>

                  <ul>
                    <li>
                      <Check size={14} />
                      Personal details
                    </li>

                    <li
                        className={
                          courses.length > 0
                              ? undefined
                              : styles.incompleteItem
                        }
                    >
                      {courses.length > 0 ? (
                          <Check size={14} />
                      ) : (
                          <Plus size={14} />
                      )}
                      At least one course
                    </li>
                  </ul>
                </section>

                <section
                    className={styles.accountCard}
                >
                  <div>
                    <Mail size={17} />

                    <span>
                    <small>
                      Connected Google account
                    </small>

                    <strong>
                      {profile.email ||
                          "No email available"}
                    </strong>
                  </span>
                  </div>

                  <div>
                    <CalendarDays size={17} />

                    <span>
                    <small>Member since</small>

                    <strong>
                      {memberSince}
                    </strong>
                  </span>
                  </div>

                  <p>
                    Email and avatar are read-only
                    because they come from Google.
                  </p>
                </section>

                <Link
                    href="/buddies"
                    className={styles.buddiesLink}
                >
                  <Users size={16} />

                  <span>
                  <strong>
                    View study buddies
                  </strong>

                  <small>
                    See classmates you connected
                    with
                  </small>
                </span>

                  <ChevronRight size={17} />
                </Link>
              </aside>
            </div>
          </div>
        </main>

        <AlertModal
            open={alertOpen}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            onClose={() => setAlertOpen(false)}
        />
      </>
  );
}

function ProfileLoading() {
  return (
      <main
          id="studygrouprr-profile"
          className={styles.loadingPage}
          role="status"
          aria-live="polite"
      >
        <div className={styles.loadingCard}>
          <strong>
            Loading your profile…
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
