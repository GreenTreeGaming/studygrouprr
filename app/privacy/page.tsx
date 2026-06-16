export default function PrivacyPage() {
    return (
        <main className="min-h-screen bg-slate-50 px-6 py-16">
            <div className="mx-auto max-w-4xl">
                <div className="mb-12">
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-violet-600">
                        Legal
                    </p>

                    <h1 className="text-4xl font-bold text-[#1B1B3A]">
                        Privacy Policy
                    </h1>

                    <p className="mt-4 text-slate-600">
                        Last updated: June 2026
                    </p>
                </div>

                <div className="space-y-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-[#1B1B3A]">
                            Overview
                        </h2>

                        <p className="leading-7 text-slate-600">
                            StudyGrouprr helps students find classmates,
                            create study sessions, and discover other
                            students studying the same courses.
                        </p>

                        <p className="mt-4 leading-7 text-slate-600">
                            We collect only the information necessary to
                            provide these features and do not sell personal
                            information to advertisers or third parties.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-[#1B1B3A]">
                            Information We Collect
                        </h2>

                        <div className="space-y-4 text-slate-600">
                            <p>
                                When you sign in using Google, we may store:
                            </p>

                            <ul className="list-disc space-y-2 pl-6">
                                <li>Name</li>
                                <li>Email address</li>
                                <li>Profile picture</li>
                            </ul>

                            <p>
                                During onboarding, we may also store:
                            </p>

                            <ul className="list-disc space-y-2 pl-6">
                                <li>University</li>
                                <li>Major</li>
                                <li>Academic year</li>
                            </ul>

                            <p>
                                When using StudyGrouprr, we may store:
                            </p>

                            <ul className="list-disc space-y-2 pl-6">
                                <li>Study sessions you create</li>
                                <li>Sessions you join</li>
                                <li>Live study statuses</li>
                                <li>Locations you choose to share</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-[#1B1B3A]">
                            How We Use Information
                        </h2>

                        <ul className="list-disc space-y-2 pl-6 text-slate-600">
                            <li>Provide StudyGrouprr services</li>
                            <li>Help students discover study partners</li>
                            <li>Show study sessions and live study activity</li>
                            <li>Improve the platform and user experience</li>
                            <li>Maintain safety and prevent abuse</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-[#1B1B3A]">
                            University Visibility
                        </h2>

                        <p className="leading-7 text-slate-600">
                            StudyGrouprr is designed around university
                            communities. Information you share through study
                            sessions and live study statuses may be visible
                            to other students from the same university.
                        </p>

                        <p className="mt-4 leading-7 text-slate-600">
                            We do not intentionally expose your information
                            publicly outside your university community.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-[#1B1B3A]">
                            Data Sharing
                        </h2>

                        <p className="leading-7 text-slate-600">
                            StudyGrouprr does not sell your personal data.
                        </p>

                        <p className="mt-4 leading-7 text-slate-600">
                            We may share information only when required by
                            law, to protect the safety of users, or to
                            operate essential infrastructure providers such
                            as authentication, hosting, analytics, and
                            database services.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-[#1B1B3A]">
                            Data Security
                        </h2>

                        <p className="leading-7 text-slate-600">
                            We take reasonable steps to protect your data
                            using modern security practices and trusted
                            infrastructure providers.
                        </p>

                        <p className="mt-4 leading-7 text-slate-600">
                            However, no internet service can guarantee
                            absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-[#1B1B3A]">
                            Your Choices
                        </h2>

                        <ul className="list-disc space-y-2 pl-6 text-slate-600">
                            <li>Edit your profile information</li>
                            <li>Remove live study statuses</li>
                            <li>Delete study sessions you created</li>
                            <li>Stop using StudyGrouprr at any time</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-[#1B1B3A]">
                            Changes
                        </h2>

                        <p className="leading-7 text-slate-600">
                            This Privacy Policy may be updated as
                            StudyGrouprr evolves. Significant changes will
                            be reflected by updating the date at the top of
                            this page.
                        </p>
                    </section>

                    <section>
                        <h2 className="mb-3 text-xl font-semibold text-[#1B1B3A]">
                            Contact
                        </h2>

                        <p className="leading-7 text-slate-600">
                            Questions about this Privacy Policy can be sent
                            to:
                        </p>

                        <a
                            href="mailto:karunsarvajith@gmail.com"
                            className="mt-3 inline-block font-medium text-violet-600 hover:text-violet-700"
                        >
                            karunsarvajith@gmail.com
                        </a>
                    </section>
                </div>
            </div>
        </main>
    );
}