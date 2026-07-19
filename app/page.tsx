import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black p-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">QA Agent</h1>
        <p className="text-lg text-muted-foreground max-w-md">
          An autonomous agent that tests websites from plain-English briefs
        </p>
        <Link
          href="/chat"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary text-primary-foreground px-6 text-sm font-medium"
        >
          Start testing
        </Link>
      </div>
    </div>
  );
}
