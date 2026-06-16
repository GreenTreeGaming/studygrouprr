import {
    Mail,
    GraduationCap,
    MessageCircle,
} from "lucide-react";

export default function ContactPage() {
    return (
        <main className="min-h-screen bg-slate-50 px-6 py-16">
            <div className="mx-auto max-w-4xl">
                <div className="mb-12">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-violet-600">
                        Contact
                    </p>

                    <h1 className="text-4xl font-bold text-[#1B1B3A]">
                        Get in Touch
                    </h1>

                    <p className="mt-4 max-w-2xl text-slate-600">
                        Have feedback, found a bug, or want to suggest a
                        feature? I'd love to hear from you.
                    </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                    <div className="grid gap-8 md:grid-cols-2">
                        {/* Email */}
                        <div className="rounded-2xl border border-slate-200 p-6">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                                <Mail size={22} />
                            </div>

                            <h2 className="mb-2 text-xl font-semibold text-[#1B1B3A]">
                                Email
                            </h2>

                            <p className="mb-4 text-sm leading-6 text-slate-600">
                                For support, bug reports, feedback, or general
                                questions.
                            </p>

                            <a
                                href="mailto:karunsarvajith@gmail.com"
                                className="font-medium text-violet-600 hover:text-violet-700"
                            >
                                karunsarvajith@gmail.com
                            </a>
                        </div>

                        {/* About */}
                        <div className="rounded-2xl border border-slate-200 p-6">
                            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                                <GraduationCap size={22} />
                            </div>

                            <h2 className="mb-2 text-xl font-semibold text-[#1B1B3A]">
                                About StudyGrouprr
                            </h2>

                            <p className="text-sm leading-6 text-slate-600">
                                StudyGrouprr is an independent student project
                                focused on helping college students find study
                                partners, join study sessions, and connect with
                                classmates at their university.
                            </p>
                        </div>
                    </div>

                    {/* Feedback Box */}
                    <div className="mt-8 rounded-2xl bg-violet-50 p-6">
                        <div className="mb-4 flex items-center gap-3">
                            <MessageCircle
                                size={22}
                                className="text-violet-600"
                            />

                            <h2 className="text-lg font-semibold text-[#1B1B3A]">
                                Feedback Welcome
                            </h2>
                        </div>

                        <p className="leading-7 text-slate-700">
                            StudyGrouprr is actively being improved. If you
                            have ideas for new features, discover bugs, or
                            have suggestions that would help students connect
                            more easily, please reach out.
                        </p>
                    </div>

                    {/* Founder */}
                    <div className="mt-8 border-t border-slate-200 pt-8 text-center">
                        <p className="text-sm text-slate-500">
                            Designed and built by
                        </p>

                        <a
                            href="https://sarvajithkarun.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-block text-lg font-semibold text-violet-600 hover:text-violet-700"
                        >
                            Sarvajith Karun
                        </a>
                    </div>
                </div>
            </div>
        </main>
    );
}