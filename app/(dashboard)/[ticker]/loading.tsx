import { SiteHeader } from "@/components/SiteHeader";
import { Skeleton } from "@/components/ui/Skeleton";

/** Instant skeleton shell shown while the dashboard route segment loads. */
export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
        <div className="panel p-6">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="mt-3 h-4 w-60" />
          <Skeleton className="mt-5 h-12 w-72" />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_372px]">
          <div className="flex flex-col gap-5">
            <Skeleton className="h-[480px] w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <div className="flex flex-col gap-5">
            <Skeleton className="h-56 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        </div>
      </main>
    </>
  );
}
