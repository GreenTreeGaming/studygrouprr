import CreateSessionClient from "./CreateSessionClient";

export default async function Page({
                                       searchParams,
                                   }: {
    searchParams: Promise<{ course?: string }>;
}) {
    const params = await searchParams;

    return (
        <CreateSessionClient
            prefilledCourse={params.course ?? ""}
        />
    );
}