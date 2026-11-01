import Link from "@/components/link";
import { SearchForm } from "@/components/shell/search-form";
import { buttonVariants } from "@/components/ui/button";
import { MESSAGES } from "@/i18n/messages";
import { getLang } from "@/i18n/server";

// A Server Component, so no page ships its code. Under /admin, which reuses
// it, there is no language in the address and getLang() gives English.
export default async function NotFound() {
  const lang = await getLang();
  const t = MESSAGES[lang].notFound;
  return (
    <section className="wrap py-20">
      <div className="mx-auto grid max-w-md gap-5">
        <h1 className="type-h2">{t.title}</h1>
        <p className="text-muted-foreground">{t.body}</p>
        <SearchForm id="q-not-found" lang={lang} />
        <div>
          <Link href="/" className={buttonVariants({ variant: "secondary" })}>
            {t.home}
          </Link>
        </div>
      </div>
    </section>
  );
}
