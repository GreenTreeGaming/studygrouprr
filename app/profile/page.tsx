"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Fingerprint,
  GraduationCap,
  Mail,
  Plus,
  ShieldCheck,
  Sparkles,
  User,
  X,
  Zap,
} from "lucide-react";

import AlertModal from "@/components/AlertModal";
import EditableField from "@/components/profile/EditableField";
import EditableMajor from "@/components/profile/EditableMajor";
import EditableUniversity from "@/components/profile/EditableUniversity";
import EditableYear from "@/components/profile/EditableYear";
import { useRequireOnboarding } from "@/hooks/useRequiredOnboarding";
import { containsInappropriateContent } from "@/lib/contentModeration";
import {
  isValidCourseCode,
  normalizeCourseCode,
} from "@/lib/courseValidation";
import { supabase } from "@/lib/supabase";

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

type SafeAvatarProps = {
  src: string | null | undefined;
  name: string | null | undefined;
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
                    }: SafeAvatarProps) {
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
          alt={`${name || "Student"} avatar`}
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

  const rootRef = useRef<HTMLElement>(null);

  const [editingField, setEditingField] =
      useState<ProfileField | null>(null);

  const [savingField, setSavingField] =
      useState<ProfileField | null>(null);

  const [formData, setFormData] =
      useState<ProfileFormData>(
          EMPTY_PROFILE_FORM,
      );

  const [savedData, setSavedData] =
      useState<ProfileFormData>(
          EMPTY_PROFILE_FORM,
      );

  const [courses, setCourses] = useState<
      string[]
  >([]);

  const [coursesLoading, setCoursesLoading] =
      useState(true);

  const [newCourse, setNewCourse] =
      useState("");

  const [addingCourse, setAddingCourse] =
      useState(false);

  const [removingCourse, setRemovingCourse] =
      useState<string | null>(null);

  const [loadError, setLoadError] =
      useState<string | null>(null);

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

  useEffect(() => {
    if (!profile) {
      return;
    }

    const nextData: ProfileFormData = {
      name: profile.name || "",
      university:
          profile.university || "",
      major: profile.major || "",
      year: profile.year || "",
    };

    setFormData(nextData);
    setSavedData(nextData);
  }, [profile]);

  const loadCourses = useCallback(
      async () => {
        if (!profile?.id) {
          return;
        }

        setCoursesLoading(true);
        setLoadError(null);

        try {
          const { data, error } =
              await supabase
                  .from("user_courses")
                  .select("course_code")
                  .eq("user_id", profile.id)
                  .order("course_code");

          if (error) {
            throw error;
          }

          const courseCodes = (
              data ?? []
          )
              .map(
                  (course) =>
                      course.course_code,
              )
              .filter(
                  (
                      courseCode,
                  ): courseCode is string =>
                      typeof courseCode ===
                      "string" &&
                      courseCode.trim().length >
                      0,
              );

          setCourses(
              Array.from(
                  new Set(courseCodes),
              ).sort(),
          );
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
      [profile?.id],
  );

  useEffect(() => {
    if (!profile?.id) {
      return;
    }

    void loadCourses();
  }, [loadCourses, profile?.id]);

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

  const profileChecks = useMemo(
      () => [
        {
          label: "Name added",
          complete:
              formData.name.trim().length >
              0,
        },
        {
          label: "University added",
          complete:
              formData.university
                  .trim().length > 0,
        },
        {
          label: "Major added",
          complete:
              formData.major.trim().length >
              0,
        },
        {
          label: "Academic year added",
          complete:
              formData.year.trim().length >
              0,
        },
        {
          label: "At least one course",
          complete: courses.length > 0,
        },
      ],
      [courses.length, formData],
  );

  const completedChecks =
      profileChecks.filter(
          (item) => item.complete,
      ).length;

  const completionPercentage =
      Math.round(
          (completedChecks /
              profileChecks.length) *
          100,
      );

  const firstName =
      formData.name
          .trim()
          .split(/\s+/)[0] ||
      "Student";

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

  const passportNumber =
      profile?.id
          ?.replaceAll("-", "")
          .slice(0, 10)
          .toUpperCase() || "STUDENT";

  function cancelEditing(
      field: ProfileField,
  ) {
    setFormData((current) => ({
      ...current,
      [field]: savedData[field],
    }));

    setEditingField(null);
  }

  async function saveField(
      field: ProfileField,
      value: string,
  ) {
    if (savingField) {
      return;
    }

    const cleanedValue =
        value.trim();

    if (!cleanedValue) {
      showAlert(
          "Invalid Value",
          "This field cannot be empty.",
          "warning",
      );
      return;
    }

    if (
        cleanedValue.length >
        FIELD_MAX_LENGTHS[field]
    ) {
      showAlert(
          "Value Too Long",
          `Keep this field under ${FIELD_MAX_LENGTHS[field]} characters.`,
          "warning",
      );
      return;
    }

    if (
        containsInappropriateContent(
            cleanedValue,
        )
    ) {
      showAlert(
          "Inappropriate Content",
          "Please remove inappropriate language.",
          "warning",
      );
      return;
    }

    if (
        cleanedValue ===
        savedData[field]
    ) {
      setFormData((current) => ({
        ...current,
        [field]: cleanedValue,
      }));

      setEditingField(null);
      return;
    }

    setSavingField(field);

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
            [field]: cleanedValue,
          })
          .eq("id", user.id);

      if (error) {
        throw error;
      }

      setFormData((current) => ({
        ...current,
        [field]: cleanedValue,
      }));

      setSavedData((current) => ({
        ...current,
        [field]: cleanedValue,
      }));

      setEditingField(null);

      window.dispatchEvent(
          new CustomEvent(
              "profile-updated",
          ),
      );

      const fieldName =
          field.charAt(0).toUpperCase() +
          field.slice(1);

      showAlert(
          "Profile Updated",
          `${fieldName} was updated successfully.`,
          "success",
      );
    } catch (error) {
      showAlert(
          "Save Failed",
          error instanceof Error
              ? error.message
              : "Your profile could not be updated.",
          "error",
      );
    } finally {
      setSavingField(null);
    }
  }

  async function addCourse(
      event?: FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault();

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
          "Invalid Course",
          "Please remove inappropriate language from the course code.",
          "warning",
      );
      return;
    }

    if (
        !isValidCourseCode(courseCode)
    ) {
      showAlert(
          "Invalid Course Code",
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
          "Already Added",
          `${courseCode} is already in your semester.`,
          "info",
      );
      return;
    }

    if (!profile?.id) {
      showAlert(
          "Profile Missing",
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
            user_id: profile.id,
            course_code: courseCode,
          });

      if (error) {
        if (error.code === "23505") {
          showAlert(
              "Already Added",
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
          "Course Added",
          `${courseCode} was added to your semester.`,
          "success",
      );
    } catch (error) {
      showAlert(
          "Unable to Add Course",
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
        !profile?.id
    ) {
      return;
    }

    setRemovingCourse(courseCode);

    try {
      const { error } = await supabase
          .from("user_courses")
          .delete()
          .eq("user_id", profile.id)
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
          "Course Removed",
          `${courseCode} was removed from your semester.`,
          "success",
      );
    } catch (error) {
      showAlert(
          "Unable to Remove Course",
          error instanceof Error
              ? error.message
              : "The course could not be removed.",
          "error",
      );
    } finally {
      setRemovingCourse(null);
    }
  }

  useEffect(() => {
    if (
        profileLoading ||
        coursesLoading ||
        !profile ||
        !rootRef.current
    ) {
      return;
    }

    const prefersReducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const context = gsap.context(() => {
      gsap.from(".pr-reveal", {
        opacity: 0,
        y: 27,
        duration: 0.7,
        stagger: 0.08,
        ease: "power3.out",
      });

      gsap.from(".pr-passport-chip", {
        opacity: 0,
        scale: 0.82,
        y: 10,
        duration: 0.5,
        stagger: 0.08,
        delay: 0.18,
        ease: "back.out(1.4)",
      });

      gsap.from(".pr-course-card", {
        opacity: 0,
        y: 18,
        rotate: -1,
        duration: 0.55,
        stagger: 0.06,
        delay: 0.2,
        ease: "power3.out",
      });
    }, rootRef);

    return () => {
      context.revert();
    };
  }, [
    courses.length,
    coursesLoading,
    profile,
    profileLoading,
  ]);

  if (
      profileLoading ||
      (profile && coursesLoading)
  ) {
    return (
        <>
          <style>{profileStyles}</style>

          <main className="pr-loading">
            <div
                className="pr-loading-passport"
                aria-hidden="true"
            >
              <span className="pr-loading-ring pr-loading-ring--one" />
              <span className="pr-loading-ring pr-loading-ring--two" />

              <User size={29} />
            </div>

            <p>
              Preparing your campus passport…
            </p>
          </main>
        </>
    );
  }

  if (!profile) {
    return (
        <>
          <style>{profileStyles}</style>

          <main className="pr-loading">
            <p>
              We could not find your
              StudyGrouprr profile.
            </p>

            <Link
                href="/login"
                className="pr-loading-link"
            >
              Return to login
            </Link>
          </main>
        </>
    );
  }

  return (
      <>
        <style>{profileStyles}</style>

        <main
            ref={rootRef}
            className="pr-root"
        >
          <div
              className="pr-background-grid"
              aria-hidden="true"
          />

          <div className="pr-glow pr-glow--one" />
          <div className="pr-glow pr-glow--two" />

          <div className="pr-canvas">
            {loadError && (
                <div
                    className="pr-error-banner"
                    role="alert"
                >
                  <div>
                    <strong>
                      Profile connection interrupted
                    </strong>

                    <span>
                  {loadError}
                </span>
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

            <section className="pr-top-layout">
              <article className="pr-passport pr-reveal">
                <div
                    className="pr-passport-grid"
                    aria-hidden="true"
                />

                <span className="pr-passport-orbit pr-passport-orbit--one" />
                <span className="pr-passport-orbit pr-passport-orbit--two" />
                <span className="pr-passport-orbit pr-passport-orbit--three" />

                <div className="pr-passport-top">
                <span className="pr-passport-label">
                  <Sparkles size={15} />
                  Campus passport
                </span>

                  <span className="pr-verified-badge">
                  <ShieldCheck
                      size={15}
                  />
                  Student
                </span>
                </div>

                <div className="pr-passport-identity">
                  <div className="pr-passport-avatar">
                    <SafeAvatar
                        src={
                          profile.avatar_url
                        }
                        name={formData.name}
                    />

                    <span className="pr-avatar-status" />
                  </div>

                  <div className="pr-passport-name">
                  <span>
                    StudyGrouprr member
                  </span>

                    <h1>
                      {formData.name ||
                          "Student"}
                    </h1>

                    <p>
                      {formData.university ||
                          "University not added"}
                    </p>
                  </div>
                </div>

                <div className="pr-passport-tags">
                <span className="pr-passport-chip pr-passport-chip--violet">
                  <GraduationCap
                      size={15}
                  />
                  {formData.major ||
                      "Major not added"}
                </span>

                  <span className="pr-passport-chip pr-passport-chip--green">
                  <CalendarDays
                      size={15}
                  />
                    {formData.year ||
                        "Year not added"}
                </span>

                  <span className="pr-passport-chip pr-passport-chip--amber">
                  <BookOpen size={15} />
                    {courses.length} course
                    {courses.length === 1
                        ? ""
                        : "s"}
                </span>
                </div>

                <div className="pr-passport-message">
                  <Zap size={18} />

                  <span>
                  <strong>
                    Your profile powers your
                    matches.
                  </strong>

                  <small>
                    Courses and campus details
                    determine who and what you
                    discover.
                  </small>
                </span>
                </div>

                <div className="pr-passport-footer">
                <span>
                  <small>
                    Passport number
                  </small>

                  <strong>
                    {passportNumber}
                  </strong>
                </span>

                  <span>
                  <small>
                    Member since
                  </small>

                  <strong>
                    {memberSince}
                  </strong>
                </span>
                </div>
              </article>

              <section className="pr-identity-studio pr-reveal">
                <div className="pr-studio-heading">
                  <div>
                  <span className="pr-section-kicker">
                    <User size={15} />
                    Identity studio
                  </span>

                    <h2>
                      Make your profile feel like
                      you.
                    </h2>

                    <p>
                      These details help classmates
                      recognize you and improve your
                      study matches.
                    </p>
                  </div>

                  <div
                      className="pr-strength-dial"
                      style={
                        {
                          "--pr-strength-angle": `${completionPercentage * 3.6}deg`,
                        } as CSSProperties
                      }
                      aria-label={`Profile ${completionPercentage}% complete`}
                  >
                  <span>
                    <strong>
                      {completionPercentage}%
                    </strong>

                    <small>
                      complete
                    </small>
                  </span>
                  </div>
                </div>

                <div className="pr-field-grid">
                  <article
                      className={`pr-field-card ${
                          editingField === "name"
                              ? "pr-field-card--active"
                              : ""
                      }`}
                      aria-busy={
                          savingField === "name"
                      }
                  >
                    <div className="pr-field-heading">
                    <span className="pr-field-number">
                      01
                    </span>

                      <span>
                      <strong>
                        Display name
                      </strong>

                      <small>
                        What classmates call you
                      </small>
                    </span>
                    </div>

                    <div className="pr-editable-slot">
                      <EditableField
                          label="Name"
                          value={formData.name}
                          editing={
                              editingField ===
                              "name"
                          }
                          onEdit={() =>
                              setEditingField(
                                  "name",
                              )
                          }
                          onCancel={() =>
                              cancelEditing("name")
                          }
                          onSave={() =>
                              void saveField(
                                  "name",
                                  formData.name,
                              )
                          }
                          onChange={(value) =>
                              setFormData(
                                  (current) => ({
                                    ...current,
                                    name: value,
                                  }),
                              )
                          }
                      />

                      {savingField ===
                          "name" && (
                              <span className="pr-saving-label">
                        Saving…
                      </span>
                          )}
                    </div>
                  </article>

                  <article
                      className={`pr-field-card ${
                          editingField === "year"
                              ? "pr-field-card--active"
                              : ""
                      }`}
                      aria-busy={
                          savingField === "year"
                      }
                  >
                    <div className="pr-field-heading">
                    <span className="pr-field-number pr-field-number--green">
                      02
                    </span>

                      <span>
                      <strong>
                        Academic year
                      </strong>

                      <small>
                        Where you are in school
                      </small>
                    </span>
                    </div>

                    <div className="pr-editable-slot">
                      <EditableYear
                          value={formData.year}
                          editing={
                              editingField ===
                              "year"
                          }
                          onEdit={() =>
                              setEditingField(
                                  "year",
                              )
                          }
                          onCancel={() =>
                              cancelEditing("year")
                          }
                          onSave={(value) =>
                              void saveField(
                                  "year",
                                  value,
                              )
                          }
                      />

                      {savingField ===
                          "year" && (
                              <span className="pr-saving-label">
                        Saving…
                      </span>
                          )}
                    </div>
                  </article>

                  <article
                      className={`pr-field-card pr-field-card--wide ${
                          editingField ===
                          "university"
                              ? "pr-field-card--active"
                              : ""
                      }`}
                      aria-busy={
                          savingField ===
                          "university"
                      }
                  >
                    <div className="pr-field-heading">
                    <span className="pr-field-number pr-field-number--amber">
                      03
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
                    </div>

                    <div className="pr-editable-slot">
                      <EditableUniversity
                          value={
                            formData.university
                          }
                          editing={
                              editingField ===
                              "university"
                          }
                          onEdit={() =>
                              setEditingField(
                                  "university",
                              )
                          }
                          onCancel={() =>
                              cancelEditing(
                                  "university",
                              )
                          }
                          onSave={(value) =>
                              void saveField(
                                  "university",
                                  value,
                              )
                          }
                      />

                      {savingField ===
                          "university" && (
                              <span className="pr-saving-label">
                        Saving…
                      </span>
                          )}
                    </div>
                  </article>

                  <article
                      className={`pr-field-card pr-field-card--wide ${
                          editingField === "major"
                              ? "pr-field-card--active"
                              : ""
                      }`}
                      aria-busy={
                          savingField === "major"
                      }
                  >
                    <div className="pr-field-heading">
                    <span className="pr-field-number pr-field-number--blue">
                      04
                    </span>

                      <span>
                      <strong>
                        Major
                      </strong>

                      <small>
                        Helps find academically
                        similar students
                      </small>
                    </span>
                    </div>

                    <div className="pr-editable-slot">
                      <EditableMajor
                          value={
                            formData.major
                          }
                          editing={
                              editingField ===
                              "major"
                          }
                          onEdit={() =>
                              setEditingField(
                                  "major",
                              )
                          }
                          onCancel={() =>
                              cancelEditing(
                                  "major",
                              )
                          }
                          onSave={(value) =>
                              void saveField(
                                  "major",
                                  value,
                              )
                          }
                      />

                      {savingField ===
                          "major" && (
                              <span className="pr-saving-label">
                        Saving…
                      </span>
                          )}
                    </div>
                  </article>
                </div>

                <div className="pr-account-strip">
                <span className="pr-account-icon">
                  <Mail size={18} />
                </span>

                  <span>
                  <small>
                    Connected Google account
                  </small>

                  <strong>
                    {profile.email ||
                        "No email available"}
                  </strong>
                </span>

                  <span className="pr-read-only-badge">
                  Read only
                </span>
                </div>
              </section>
            </section>

            <section className="pr-course-runway pr-reveal">
              <div className="pr-course-builder">
              <span className="pr-section-kicker">
                <BookOpen size={15} />
                Your semester
              </span>

                <h2>
                  Build your course runway.
                </h2>

                <p>
                  Courses power recommendations,
                  course communities, and relevant
                  study sessions across the app.
                </p>

                <form
                    className="pr-course-form"
                    onSubmit={(event) =>
                        void addCourse(event)
                    }
                >
                  <label
                      htmlFor="profile-course"
                      className="pr-course-input-wrap"
                  >
                    <BookOpen size={18} />

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
                        placeholder="CS400"
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
                          <X size={15} />
                        </button>
                    )}
                  </label>

                  <button
                      type="submit"
                      className="pr-add-course-button"
                      disabled={
                          addingCourse ||
                          !normalizedCourseDraft ||
                          !courseDraftValid
                      }
                  >
                    <Plus size={18} />

                    {addingCourse
                        ? "Adding…"
                        : "Add course"}
                  </button>
                </form>

                {newCourse &&
                    !courseDraftValid && (
                        <p className="pr-course-warning">
                          Use a code such as CS400,
                          MATH340, or BIO101.
                        </p>
                    )}

                <div className="pr-course-tip">
                  <Sparkles size={17} />

                  <span>
                  <strong>
                    Keep this current.
                  </strong>

                  <small>
                    Remove old courses each
                    semester so your matches stay
                    useful.
                  </small>
                </span>
                </div>
              </div>

              <div className="pr-course-display">
                <div className="pr-course-display-heading">
                  <div>
                  <span>
                    Current course deck
                  </span>

                    <strong>
                      {courses.length} course
                      {courses.length === 1
                          ? ""
                          : "s"}
                    </strong>
                  </div>

                  {courses.length > 0 && (
                      <Link href="/sessions">
                        Find sessions
                        <ArrowRight size={16} />
                      </Link>
                  )}
                </div>

                {courses.length > 0 ? (
                    <div className="pr-course-deck">
                      {courses.map(
                          (course, index) => (
                              <article
                                  key={course}
                                  className={`pr-course-card pr-course-card--${
                                      (index % 4) + 1
                                  }`}
                              >
                        <span className="pr-course-index">
                          {String(
                              index + 1,
                          ).padStart(
                              2,
                              "0",
                          )}
                        </span>

                                <span className="pr-course-icon">
                          <BookOpen
                              size={21}
                          />
                        </span>

                                <strong>
                                  {course}
                                </strong>

                                <Link
                                    href={`/courses/${encodeURIComponent(
                                        course,
                                    )}`}
                                >
                                  Open community
                                  <ChevronRight
                                      size={15}
                                  />
                                </Link>

                                <button
                                    type="button"
                                    className="pr-remove-course"
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
                                  <X size={15} />
                                </button>
                              </article>
                          ),
                      )}
                    </div>
                ) : (
                    <div className="pr-course-empty">
                      <div className="pr-course-empty-orbit">
                        <BookOpen size={32} />

                        <span />
                        <span />
                      </div>

                      <h3>
                        Your course deck is empty.
                      </h3>

                      <p>
                        Add the classes you are
                        taking so StudyGrouprr can
                        connect you with the right
                        people.
                      </p>
                    </div>
                )}
              </div>
            </section>

            <section className="pr-bottom-layout">
              <article className="pr-completion-board pr-reveal">
                <div className="pr-completion-heading">
                  <div>
                  <span className="pr-section-kicker">
                    <Zap size={15} />
                    Profile strength
                  </span>

                    <h2>
                      {completionPercentage ===
                      100
                          ? "Your signal is fully tuned."
                          : "A few details make a stronger signal."}
                    </h2>
                  </div>

                  <span className="pr-completion-number">
                  {completionPercentage}%
                </span>
                </div>

                <div className="pr-progress-track">
                <span
                    style={{
                      width: `${completionPercentage}%`,
                    }}
                />
                </div>

                <div className="pr-check-grid">
                  {profileChecks.map(
                      (item) => (
                          <div
                              key={item.label}
                              className={
                                item.complete
                                    ? "pr-check-item pr-check-item--complete"
                                    : "pr-check-item"
                              }
                          >
                            {item.complete ? (
                                <CheckCircle2
                                    size={18}
                                />
                            ) : (
                                <Circle size={18} />
                            )}

                            <span>
                        {item.label}
                      </span>
                          </div>
                      ),
                  )}
                </div>
              </article>

              <article className="pr-account-record pr-reveal">
              <span className="pr-section-kicker pr-section-kicker--light">
                <ShieldCheck size={15} />
                Account record
              </span>

                <h2>
                  The behind-the-scenes stuff.
                </h2>

                <div className="pr-record-list">
                  <div>
                  <span className="pr-record-icon">
                    <Mail size={17} />
                  </span>

                    <span>
                    <small>Email</small>

                    <strong>
                      {profile.email ||
                          "Unavailable"}
                    </strong>
                  </span>
                  </div>

                  <div>
                  <span className="pr-record-icon">
                    <CalendarDays
                        size={17}
                    />
                  </span>

                    <span>
                    <small>
                      Member since
                    </small>

                    <strong>
                      {memberSince}
                    </strong>
                  </span>
                  </div>

                  <div>
                  <span className="pr-record-icon">
                    <Fingerprint
                        size={17}
                    />
                  </span>

                    <span>
                    <small>
                      Account ID
                    </small>

                    <strong className="pr-record-mono">
                      {profile.id}
                    </strong>
                  </span>
                  </div>

                  <div>
                  <span className="pr-record-icon">
                    <CheckCircle2
                        size={17}
                    />
                  </span>

                    <span>
                    <small>
                      Onboarding
                    </small>

                    <strong>
                      {profile.onboarding_complete
                          ? "Completed"
                          : "Incomplete"}
                    </strong>
                  </span>
                  </div>
                </div>
              </article>
            </section>
          </div>
        </main>

        <AlertModal
            open={alertOpen}
            title={alertConfig.title}
            message={alertConfig.message}
            type={alertConfig.type}
            onClose={() =>
                setAlertOpen(false)
            }
        />
      </>
  );
}

const profileStyles = `
  .pr-root,
  .pr-root *,
  .pr-loading,
  .pr-loading * {
    box-sizing: border-box;
  }

  .pr-root,
  .pr-loading {
    --pr-indigo: #1B1B3A;
    --pr-indigo-soft: #292953;
    --pr-violet: #7C3AED;
    --pr-violet-dark: #5B21B6;
    --pr-violet-light: #EDE9FE;
    --pr-violet-faint: #F5F3FF;
    --pr-lilac: #C4B5FD;
    --pr-green: #10B981;
    --pr-green-dark: #047857;
    --pr-green-light: #D1FAE5;
    --pr-amber: #F59E0B;
    --pr-amber-dark: #B45309;
    --pr-amber-light: #FEF3C7;
    --pr-red: #EF4444;
    --pr-red-light: #FEE2E2;
    --pr-blue: #0EA5E9;
    --pr-blue-light: #E0F2FE;
    --pr-cream: #FFF9E8;
    --pr-background: #F5F4FB;
    --pr-surface: #FFFFFF;
    --pr-border: #E4E2F0;
    --pr-text: #1B1B3A;
    --pr-muted: #64748B;
    --pr-faint: #94A3B8;
  }

  .pr-root {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    isolation: isolate;
    padding: 20px 20px 100px;
    color: var(--pr-text);
    background:
      radial-gradient(
        circle at 50% -9%,
        rgba(124, 58, 237, 0.2),
        transparent 31rem
      ),
      var(--pr-background);
  }

  .pr-background-grid {
    position: absolute;
    inset: 0;
    z-index: -5;
    opacity: 0.3;
    pointer-events: none;
    background-image:
      radial-gradient(
        circle,
        rgba(27, 27, 58, 0.17) 1px,
        transparent 1px
      );
    background-size: 27px 27px;
    mask-image:
      linear-gradient(
        to bottom,
        transparent,
        black 7%,
        black 92%,
        transparent
      );
  }

  .pr-glow {
    position: absolute;
    z-index: -4;
    border-radius: 999px;
    pointer-events: none;
    filter: blur(6px);
  }

  .pr-glow--one {
    top: 650px;
    right: -230px;
    width: 460px;
    height: 460px;
    background: rgba(16, 185, 129, 0.1);
  }

  .pr-glow--two {
    top: 1220px;
    left: -280px;
    width: 520px;
    height: 520px;
    background: rgba(124, 58, 237, 0.1);
  }

  .pr-canvas {
    position: relative;
    z-index: 1;
    width: min(1180px, 100%);
    margin: 0 auto;
  }

  .pr-error-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 18px;
    padding: 15px 18px;
    color: #991B1B;
    background: var(--pr-red-light);
    border: 1px solid #FCA5A5;
    border-radius: 17px;
  }

  .pr-error-banner > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .pr-error-banner strong {
    font-size: 14px;
  }

  .pr-error-banner span {
    font-size: 13px;
  }

  .pr-error-banner button {
    flex-shrink: 0;
    padding: 9px 13px;
    color: white;
    background: var(--pr-red);
    border: 0;
    border-radius: 10px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .pr-top-layout {
    display: grid;
    grid-template-columns:
      minmax(330px, 0.72fr)
      minmax(0, 1.28fr);
    gap: 21px;
    align-items: stretch;
  }

  .pr-passport {
    position: relative;
    min-height: 570px;
    overflow: hidden;
    padding: 28px;
    color: white;
    background:
      radial-gradient(
        circle at 50% 42%,
        rgba(124, 58, 237, 0.5),
        transparent 34%
      ),
      linear-gradient(
        145deg,
        #17172E,
        var(--pr-indigo-soft)
      );
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 26px 47px 26px 47px;
    box-shadow:
      0 28px 70px rgba(27, 27, 58, 0.23),
      inset 0 1px rgba(255, 255, 255, 0.07);
  }

  .pr-passport-grid {
    position: absolute;
    inset: 0;
    opacity: 0.13;
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
    background-size: 34px 34px;
    mask-image:
      radial-gradient(
        circle at 50% 42%,
        black,
        transparent 75%
      );
  }

  .pr-passport-orbit {
    position: absolute;
    top: 43%;
    left: 50%;
    border: 1px solid rgba(196, 181, 253, 0.18);
    border-radius: 999px;
    pointer-events: none;
    transform: translate(-50%, -50%);
  }

  .pr-passport-orbit--one {
    width: 360px;
    height: 360px;
    border-style: dashed;
    animation: pr-orbit-spin 38s linear infinite;
  }

  .pr-passport-orbit--two {
    width: 270px;
    height: 270px;
    animation: pr-orbit-spin-reverse 31s linear infinite;
  }

  .pr-passport-orbit--three {
    width: 180px;
    height: 180px;
  }

  .pr-passport-top,
  .pr-passport-identity,
  .pr-passport-tags,
  .pr-passport-message,
  .pr-passport-footer {
    position: relative;
    z-index: 3;
  }

  .pr-passport-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 13px;
  }

  .pr-passport-label,
  .pr-section-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 13px;
    color: var(--pr-violet);
    font-size: 12px;
    font-weight: 850;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .pr-passport-label {
    margin: 0;
    color: var(--pr-lilac);
  }

  .pr-verified-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    color: #A7F3D0;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(110, 231, 183, 0.22);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
  }

  .pr-passport-identity {
    display: flex;
    align-items: center;
    flex-direction: column;
    margin-top: 48px;
    text-align: center;
  }

  .pr-passport-avatar {
    position: relative;
    display: grid;
    width: 142px;
    height: 142px;
    overflow: visible;
    place-items: center;
    color: white;
    background:
      linear-gradient(
        145deg,
        #A78BFA,
        var(--pr-violet)
      );
    border: 8px solid rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    box-shadow:
      0 0 0 14px rgba(124, 58, 237, 0.09),
      0 24px 55px rgba(0, 0, 0, 0.34);
  }

  .pr-passport-avatar > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
  }

  .pr-passport-avatar > span:not(.pr-avatar-status) {
    font-size: 40px;
    font-weight: 850;
  }

  .pr-avatar-status {
    position: absolute;
    right: 4px;
    bottom: 8px;
    width: 25px;
    height: 25px;
    border: 5px solid var(--pr-indigo);
    border-radius: 999px;
    background: var(--pr-green);
  }

  .pr-passport-name {
    margin-top: 25px;
  }

  .pr-passport-name > span {
    color: var(--pr-lilac);
    font-size: 11px;
    font-weight: 850;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .pr-passport-name h1 {
    margin: 7px 0 0;
    font-size: clamp(29px, 4vw, 42px);
    letter-spacing: -0.055em;
    line-height: 1;
  }

  .pr-passport-name p {
    margin: 9px 0 0;
    color: rgba(255, 255, 255, 0.57);
    font-size: 14px;
    line-height: 1.5;
  }

  .pr-passport-tags {
    display: flex;
    justify-content: center;
    gap: 7px;
    margin-top: 25px;
    flex-wrap: wrap;
  }

  .pr-passport-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 750;
  }

  .pr-passport-chip--violet {
    color: #DDD6FE;
    background: rgba(124, 58, 237, 0.18);
    border: 1px solid rgba(196, 181, 253, 0.2);
  }

  .pr-passport-chip--green {
    color: #A7F3D0;
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(110, 231, 183, 0.18);
  }

  .pr-passport-chip--amber {
    color: #FDE68A;
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(253, 230, 138, 0.18);
  }

  .pr-passport-message {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 25px;
    padding: 14px;
    color: var(--pr-text);
    background: var(--pr-cream);
    border: 1px solid #FDE68A;
    border-radius: 8px 15px 15px 15px;
    box-shadow: 0 13px 29px rgba(0, 0, 0, 0.22);
    transform: rotate(-0.8deg);
  }

  .pr-passport-message > svg {
    flex-shrink: 0;
    color: var(--pr-amber-dark);
  }

  .pr-passport-message > span {
    display: flex;
    flex-direction: column;
  }

  .pr-passport-message strong {
    font-size: 13px;
  }

  .pr-passport-message small {
    margin-top: 4px;
    color: #78520B;
    font-size: 11px;
    line-height: 1.5;
  }

  .pr-passport-footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 25px;
    padding-top: 20px;
    border-top: 1px dashed rgba(255, 255, 255, 0.14);
  }

  .pr-passport-footer > span {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .pr-passport-footer small {
    color: rgba(255, 255, 255, 0.38);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .pr-passport-footer strong {
    overflow: hidden;
    margin-top: 4px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pr-identity-studio {
    position: relative;
    overflow: visible;
    padding: 30px;
    background: rgba(255, 255, 255, 0.95);
    border: 1px solid var(--pr-border);
    border-radius: 43px 23px 43px 23px;
    box-shadow: 0 22px 55px rgba(27, 27, 58, 0.1);
    backdrop-filter: blur(14px);
  }

  .pr-studio-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 23px;
  }

  .pr-studio-heading h2,
  .pr-course-builder h2,
  .pr-completion-heading h2,
  .pr-account-record h2 {
    margin: 0;
    font-size: clamp(28px, 3.4vw, 40px);
    letter-spacing: -0.052em;
    line-height: 1.05;
  }

  .pr-studio-heading p,
  .pr-course-builder > p {
    max-width: 520px;
    margin: 9px 0 0;
    color: var(--pr-muted);
    font-size: 14px;
    line-height: 1.65;
  }

  .pr-strength-dial {
    --pr-strength-angle: 0deg;

    display: grid;
    width: 82px;
    height: 82px;
    flex-shrink: 0;
    padding: 5px;
    place-items: center;
    background:
      conic-gradient(
        var(--pr-violet)
          var(--pr-strength-angle),
        var(--pr-violet-light)
          var(--pr-strength-angle)
      );
    border-radius: 999px;
  }

  .pr-strength-dial > span {
    display: grid;
    width: 100%;
    height: 100%;
    place-items: center;
    align-content: center;
    background: white;
    border-radius: inherit;
  }

  .pr-strength-dial strong {
    font-size: 18px;
    line-height: 1;
  }

  .pr-strength-dial small {
    margin-top: 3px;
    color: var(--pr-muted);
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
  }

  .pr-field-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .pr-field-card {
    position: relative;
    z-index: 1;
    display: flex;
    min-width: 0;
    min-height: 120px;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    padding: 16px;
    background: var(--pr-background);
    border: 1px solid var(--pr-border);
    border-radius: 16px;
    transition:
      border-color 160ms ease,
      background 160ms ease,
      box-shadow 160ms ease;
  }

  .pr-field-card--wide {
    grid-column: 1 / -1;
  }

  .pr-field-card--active {
    z-index: 30;
    background: white;
    border-color: var(--pr-lilac);
    box-shadow:
      0 0 0 4px rgba(124, 58, 237, 0.07),
      0 14px 30px rgba(27, 27, 58, 0.09);
  }

  .pr-field-heading {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 10px;
  }

  .pr-field-number {
    display: grid;
    width: 37px;
    height: 37px;
    flex-shrink: 0;
    place-items: center;
    color: var(--pr-violet);
    background: var(--pr-violet-light);
    border-radius: 11px;
    font-size: 11px;
    font-weight: 900;
  }

  .pr-field-number--green {
    color: var(--pr-green-dark);
    background: var(--pr-green-light);
  }

  .pr-field-number--amber {
    color: var(--pr-amber-dark);
    background: var(--pr-amber-light);
  }

  .pr-field-number--blue {
    color: #0369A1;
    background: var(--pr-blue-light);
  }

  .pr-field-heading > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .pr-field-heading strong {
    font-size: 14px;
  }

  .pr-field-heading small {
    margin-top: 3px;
    color: var(--pr-muted);
    font-size: 11px;
    line-height: 1.4;
  }

  .pr-editable-slot {
    display: flex;
    min-width: 170px;
    align-items: flex-end;
    flex-direction: column;
    gap: 5px;
    text-align: right;
  }

  .pr-saving-label {
    color: var(--pr-violet);
    font-size: 11px;
    font-weight: 750;
  }

  .pr-root .ef-row,
  .pr-root .eu-row,
  .pr-root .em-row,
  .pr-root .ey-row {
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .pr-root .ef-value,
  .pr-root .eu-value,
  .pr-root .em-value,
  .pr-root .ey-value {
    font-size: 15px;
    line-height: 1.45;
  }

  .pr-root .ef-input,
  .pr-root .eu-input,
  .pr-root .em-input,
  .pr-root .ey-select {
    min-width: 210px;
    font-size: 14px;
  }

  .pr-root .eu-wrap,
  .pr-root .em-wrapper,
  .pr-root .ey-wrap {
    width: 100%;
    min-width: 0;
  }

  .pr-root .eu-dropdown {
    width: 100%;
  }

  .pr-root .em-dropdown {
    width: min(
      420px,
      calc(100vw - 70px)
    );
  }

  .pr-account-strip {
    display: grid;
    grid-template-columns:
      auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 11px;
    margin-top: 14px;
    padding: 14px;
    background: var(--pr-violet-faint);
    border: 1px solid #DDD6FE;
    border-radius: 14px;
  }

  .pr-account-icon {
    display: grid;
    width: 39px;
    height: 39px;
    place-items: center;
    color: var(--pr-violet);
    background: white;
    border-radius: 12px;
  }

  .pr-account-strip > span:nth-child(2) {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .pr-account-strip small {
    color: var(--pr-muted);
    font-size: 11px;
  }

  .pr-account-strip strong {
    overflow: hidden;
    margin-top: 3px;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pr-read-only-badge {
    padding: 6px 9px;
    color: var(--pr-muted);
    background: white;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 800;
  }

  .pr-course-runway {
    display: grid;
    grid-template-columns:
      minmax(270px, 0.62fr)
      minmax(0, 1.38fr);
    gap: 22px;
    margin-top: 24px;
    padding: 29px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid var(--pr-border);
    border-radius: 24px 45px 24px 45px;
    box-shadow: 0 20px 50px rgba(27, 27, 58, 0.09);
    backdrop-filter: blur(13px);
  }

  .pr-course-builder {
    position: relative;
    padding: 7px 4px;
  }

  .pr-course-builder h2 {
    font-size: 32px;
  }

  .pr-course-form {
    display: flex;
    gap: 9px;
    margin-top: 22px;
  }

  .pr-course-input-wrap {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: var(--pr-background);
    border: 1px solid var(--pr-border);
    border-radius: 13px;
    transition:
      border-color 150ms ease,
      box-shadow 150ms ease;
  }

  .pr-course-input-wrap:focus-within {
    border-color: var(--pr-lilac);
    box-shadow:
      0 0 0 4px rgba(124, 58, 237, 0.08);
  }

  .pr-course-input-wrap > svg {
    flex-shrink: 0;
    color: var(--pr-violet);
  }

  .pr-course-input-wrap input {
    width: 100%;
    min-width: 0;
    color: var(--pr-text);
    background: transparent;
    border: 0;
    outline: none;
    font: inherit;
    font-size: 14px;
    font-weight: 750;
    text-transform: uppercase;
  }

  .pr-course-input-wrap input::placeholder {
    color: var(--pr-faint);
  }

  .pr-course-input-wrap button {
    display: grid;
    flex-shrink: 0;
    padding: 3px;
    place-items: center;
    color: var(--pr-muted);
    background: transparent;
    border: 0;
    cursor: pointer;
  }

  .pr-add-course-button {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 11px 14px;
    color: white;
    background: var(--pr-violet);
    border: 0;
    border-radius: 13px;
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    transition:
      transform 150ms ease,
      background 150ms ease;
  }

  .pr-add-course-button:hover:not(:disabled) {
    background: var(--pr-violet-dark);
    transform: translateY(-2px);
  }

  .pr-add-course-button:disabled {
    opacity: 0.48;
    cursor: not-allowed;
  }

  .pr-course-warning {
    margin: 9px 0 0;
    color: var(--pr-amber-dark);
    font-size: 12px;
    line-height: 1.5;
  }

  .pr-course-tip {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-top: 18px;
    padding: 13px;
    color: #78520B;
    background: var(--pr-amber-light);
    border: 1px solid #FDE68A;
    border-radius: 8px 14px 14px 14px;
    transform: rotate(-0.5deg);
  }

  .pr-course-tip > svg {
    flex-shrink: 0;
    color: var(--pr-amber-dark);
  }

  .pr-course-tip > span {
    display: flex;
    flex-direction: column;
  }

  .pr-course-tip strong {
    font-size: 12px;
  }

  .pr-course-tip small {
    margin-top: 3px;
    font-size: 11px;
    line-height: 1.45;
  }

  .pr-course-display {
    min-width: 0;
    padding-left: 22px;
    border-left: 1px dashed var(--pr-border);
  }

  .pr-course-display-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 17px;
  }

  .pr-course-display-heading > div {
    display: flex;
    flex-direction: column;
  }

  .pr-course-display-heading span {
    color: var(--pr-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .pr-course-display-heading strong {
    margin-top: 4px;
    font-size: 18px;
  }

  .pr-course-display-heading > a {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    padding: 9px 11px;
    color: var(--pr-violet);
    background: var(--pr-violet-light);
    border-radius: 11px;
    font-size: 11px;
    font-weight: 800;
    text-decoration: none;
  }

  .pr-course-deck {
    display: grid;
    grid-template-columns:
      repeat(3, minmax(0, 1fr));
    gap: 11px;
  }

  .pr-course-card {
    position: relative;
    display: flex;
    min-width: 0;
    min-height: 155px;
    overflow: hidden;
    flex-direction: column;
    padding: 16px;
    background: var(--pr-violet-faint);
    border: 1px solid #DDD6FE;
    border-radius: 16px;
    transition:
      transform 160ms ease,
      box-shadow 160ms ease;
  }

  .pr-course-card--1 {
    transform: rotate(-0.6deg);
  }

  .pr-course-card--2 {
    background: var(--pr-green-light);
    border-color: #A7F3D0;
    transform: rotate(0.7deg);
  }

  .pr-course-card--3 {
    background: var(--pr-cream);
    border-color: #FDE68A;
    transform: rotate(-0.4deg);
  }

  .pr-course-card--4 {
    background: var(--pr-blue-light);
    border-color: #BAE6FD;
    transform: rotate(0.5deg);
  }

  .pr-course-card:hover {
    z-index: 2;
    box-shadow: 0 18px 36px rgba(27, 27, 58, 0.13);
    transform: translateY(-5px) rotate(0deg);
  }

  .pr-course-index {
    position: absolute;
    top: 7px;
    right: 10px;
    color: rgba(27, 27, 58, 0.1);
    font-size: 31px;
    font-weight: 900;
    letter-spacing: -0.08em;
  }

  .pr-course-icon {
    display: grid;
    width: 40px;
    height: 40px;
    place-items: center;
    color: var(--pr-violet);
    background: white;
    border-radius: 12px;
    box-shadow: 0 6px 15px rgba(27, 27, 58, 0.08);
  }

  .pr-course-card > strong {
    margin-top: 15px;
    font-size: 17px;
    letter-spacing: -0.025em;
  }

  .pr-course-card > a {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: auto;
    padding-top: 15px;
    color: var(--pr-muted);
    font-size: 10px;
    font-weight: 800;
    text-decoration: none;
    text-transform: uppercase;
  }

  .pr-remove-course {
    position: absolute;
    top: 10px;
    left: 10px;
    display: grid;
    width: 27px;
    height: 27px;
    place-items: center;
    color: var(--pr-muted);
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid rgba(228, 226, 240, 0.9);
    border-radius: 9px;
    cursor: pointer;
    opacity: 0;
    transform: translateY(-4px);
    transition:
      opacity 150ms ease,
      transform 150ms ease,
      color 150ms ease,
      background 150ms ease;
  }

  .pr-course-card:hover .pr-remove-course,
  .pr-remove-course:focus-visible {
    opacity: 1;
    transform: translateY(0);
  }

  .pr-remove-course:hover:not(:disabled) {
    color: #B91C1C;
    background: var(--pr-red-light);
  }

  .pr-remove-course:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .pr-course-empty {
    display: flex;
    min-height: 235px;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    padding: 25px;
    background: var(--pr-violet-faint);
    border: 2px dashed #DDD6FE;
    border-radius: 19px;
    text-align: center;
  }

  .pr-course-empty-orbit {
    position: relative;
    display: grid;
    width: 77px;
    height: 77px;
    place-items: center;
    color: var(--pr-violet);
    border: 1px dashed var(--pr-lilac);
    border-radius: 999px;
  }

  .pr-course-empty-orbit span {
    position: absolute;
    border: 1px solid rgba(124, 58, 237, 0.13);
    border-radius: inherit;
  }

  .pr-course-empty-orbit span:nth-child(2) {
    inset: -12px;
  }

  .pr-course-empty-orbit span:nth-child(3) {
    inset: -25px;
  }

  .pr-course-empty h3 {
    margin: 25px 0 7px;
    font-size: 20px;
    letter-spacing: -0.035em;
  }

  .pr-course-empty p {
    max-width: 390px;
    margin: 0;
    color: var(--pr-muted);
    font-size: 13px;
    line-height: 1.6;
  }

  .pr-bottom-layout {
    display: grid;
    grid-template-columns:
      minmax(0, 1.25fr)
      minmax(300px, 0.75fr);
    gap: 21px;
    margin-top: 24px;
  }

  .pr-completion-board {
    padding: 29px;
    background: rgba(255, 255, 255, 0.94);
    border: 1px solid var(--pr-border);
    border-radius: 38px 21px 38px 21px;
    box-shadow: 0 18px 45px rgba(27, 27, 58, 0.09);
    backdrop-filter: blur(13px);
  }

  .pr-completion-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
  }

  .pr-completion-heading h2 {
    max-width: 650px;
    font-size: 31px;
  }

  .pr-completion-number {
    display: grid;
    width: 60px;
    height: 60px;
    flex-shrink: 0;
    place-items: center;
    color: var(--pr-violet);
    background: var(--pr-violet-light);
    border-radius: 17px;
    font-size: 17px;
    font-weight: 850;
    transform: rotate(4deg);
  }

  .pr-progress-track {
    height: 9px;
    overflow: hidden;
    margin-top: 22px;
    background: var(--pr-violet-light);
    border-radius: 999px;
  }

  .pr-progress-track > span {
    display: block;
    height: 100%;
    background:
      linear-gradient(
        90deg,
        var(--pr-violet),
        var(--pr-green)
      );
    border-radius: inherit;
    transition: width 350ms ease;
  }

  .pr-check-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 9px;
    margin-top: 20px;
  }

  .pr-check-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px;
    color: var(--pr-muted);
    background: var(--pr-background);
    border: 1px solid var(--pr-border);
    border-radius: 11px;
    font-size: 12px;
    font-weight: 700;
  }

  .pr-check-item > svg {
    flex-shrink: 0;
    color: var(--pr-faint);
  }

  .pr-check-item--complete {
    color: var(--pr-green-dark);
    background: var(--pr-green-light);
    border-color: #A7F3D0;
  }

  .pr-check-item--complete > svg {
    color: var(--pr-green);
  }

  .pr-account-record {
    position: relative;
    overflow: hidden;
    padding: 28px;
    color: white;
    background:
      radial-gradient(
        circle at 85% 15%,
        rgba(124, 58, 237, 0.4),
        transparent 29%
      ),
      linear-gradient(
        145deg,
        #17172E,
        var(--pr-indigo-soft)
      );
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 21px 42px 21px 42px;
    box-shadow: 0 20px 48px rgba(27, 27, 58, 0.19);
  }

  .pr-section-kicker--light,
  .pr-account-record .pr-section-kicker {
    color: var(--pr-lilac);
  }

  .pr-account-record h2 {
    font-size: 27px;
  }

  .pr-record-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 21px;
  }

  .pr-record-list > div {
    display: grid;
    grid-template-columns:
      auto minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 11px;
    background: rgba(255, 255, 255, 0.075);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
  }

  .pr-record-icon {
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    color: var(--pr-lilac);
    background: rgba(255, 255, 255, 0.08);
    border-radius: 11px;
  }

  .pr-record-list > div > span:last-child {
    display: flex;
    min-width: 0;
    flex-direction: column;
  }

  .pr-record-list small {
    color: rgba(255, 255, 255, 0.43);
    font-size: 10px;
    font-weight: 750;
    text-transform: uppercase;
  }

  .pr-record-list strong {
    overflow: hidden;
    margin-top: 3px;
    color: rgba(255, 255, 255, 0.82);
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pr-record-mono {
    font-family:
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      monospace;
  }

  .pr-loading {
    display: flex;
    min-height: 75vh;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 20px;
    color: var(--pr-muted);
    background: var(--pr-background);
    font-size: 14px;
  }

  .pr-loading-passport {
    position: relative;
    display: grid;
    width: 88px;
    height: 88px;
    place-items: center;
    color: var(--pr-violet);
    background: var(--pr-violet-faint);
    border-radius: 999px;
  }

  .pr-loading-ring {
    position: absolute;
    border: 1px solid var(--pr-lilac);
    border-radius: inherit;
    animation:
      pr-loading-wave 1.8s ease-out infinite;
  }

  .pr-loading-ring--one {
    inset: 8px;
  }

  .pr-loading-ring--two {
    inset: -13px;
    animation-delay: 0.6s;
  }

  .pr-loading-link {
    color: var(--pr-violet);
    font-weight: 800;
    text-decoration: none;
  }

  .pr-root a:focus-visible,
  .pr-root button:focus-visible,
  .pr-root input:focus-visible,
  .pr-loading a:focus-visible {
    outline: 3px solid rgba(124, 58, 237, 0.35);
    outline-offset: 3px;
  }

  @keyframes pr-orbit-spin {
    to {
      transform:
        translate(-50%, -50%)
        rotate(360deg);
    }
  }

  @keyframes pr-orbit-spin-reverse {
    to {
      transform:
        translate(-50%, -50%)
        rotate(-360deg);
    }
  }

  @keyframes pr-loading-wave {
    0% {
      opacity: 0.6;
      transform: scale(0.75);
    }

    100% {
      opacity: 0;
      transform: scale(1.25);
    }
  }

  @media (max-width: 1050px) {
    .pr-top-layout {
      grid-template-columns:
        340px minmax(0, 1fr);
    }

    .pr-course-deck {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 880px) {
    .pr-top-layout {
      grid-template-columns: 1fr;
    }

    .pr-passport {
      min-height: auto;
    }

    .pr-passport-identity {
      margin-top: 32px;
    }

    .pr-passport-orbit--one {
      width: 430px;
      height: 430px;
    }

    .pr-course-runway,
    .pr-bottom-layout {
      grid-template-columns: 1fr;
    }

    .pr-course-display {
      padding-top: 23px;
      padding-left: 0;
      border-top: 1px dashed var(--pr-border);
      border-left: 0;
    }
  }

  @media (max-width: 680px) {
    .pr-root {
      padding: 10px 12px 70px;
    }

    .pr-passport,
    .pr-identity-studio,
    .pr-course-runway,
    .pr-completion-board,
    .pr-account-record {
      padding: 23px 17px;
    }

    .pr-passport {
      border-radius: 30px 30px 18px 30px;
    }

    .pr-passport-avatar {
      width: 122px;
      height: 122px;
    }

    .pr-studio-heading {
      flex-direction: column;
    }

    .pr-strength-dial {
      align-self: flex-start;
    }

    .pr-field-grid {
      grid-template-columns: 1fr;
    }

    .pr-field-card--wide {
      grid-column: auto;
    }

    .pr-field-card {
      flex-direction: column;
    }

    .pr-editable-slot {
      width: 100%;
      min-width: 0;
      align-items: flex-start;
      text-align: left;
    }

    .pr-root .ef-row,
    .pr-root .eu-row,
    .pr-root .em-row,
    .pr-root .ey-row {
      width: 100%;
      justify-content: flex-start;
    }

    .pr-root .ef-input,
    .pr-root .eu-input,
    .pr-root .em-input,
    .pr-root .ey-select {
      width: 100%;
      min-width: 0;
    }

    .pr-account-strip {
      grid-template-columns:
        auto minmax(0, 1fr);
    }

    .pr-read-only-badge {
      grid-column: 2;
      justify-self: flex-start;
    }

    .pr-course-form {
      flex-direction: column;
    }

    .pr-add-course-button {
      min-height: 45px;
    }

    .pr-course-deck {
      grid-template-columns: 1fr;
    }

    .pr-remove-course {
      opacity: 1;
      transform: none;
    }

    .pr-completion-heading {
      flex-direction: column;
    }

    .pr-completion-number {
      transform: none;
    }

    .pr-check-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 430px) {
    .pr-passport-top {
      align-items: flex-start;
      flex-direction: column;
    }

    .pr-passport-footer {
      grid-template-columns: 1fr;
    }

    .pr-course-display-heading {
      align-items: flex-start;
      flex-direction: column;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .pr-root *,
    .pr-loading * {
      scroll-behavior: auto !important;
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
    }
  }
`;