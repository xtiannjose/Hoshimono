import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { safeNext } from "@/modules/identity";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <section className="wrap py-14 md:py-20">
      <div className="mx-auto grid max-w-md gap-6">
        <div className="grid gap-2">
          <h1 className="type-h1">Sign in</h1>
          <p className="text-muted-foreground">
            We will email you a link. No password to remember.
          </p>
        </div>
        <Suspense fallback={<FormSkeleton />}>
          <Form searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Form({
  searchParams,
}: {
  searchParams: PageProps<"/sign-in">["searchParams"];
}) {
  const { next } = await searchParams;
  return <SignInForm next={safeNext(typeof next === "string" ? next : null)} />;
}

function FormSkeleton() {
  return (
    <div className="grid gap-4" aria-hidden>
      <Skeleton className="h-5 w-16" />
      <Skeleton className="rounded-field h-12" />
      <Skeleton className="rounded-pill h-12" />
    </div>
  );
}
