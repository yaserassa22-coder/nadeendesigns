import type { Metadata } from "next";
import { getStoreDisplayName, getStoreSettings } from "@/lib/store/settings";
import { getDictionary, localeDir } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";

export const dynamic = "force-dynamic";

const LOCALES: Locale[] = ["ar", "he", "en"];

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Nadeen Designs",
    robots: { index: false, follow: false },
  };
}

export default async function MaintenancePage() {
  const store = await getStoreSettings(true);
  const storeName = getStoreDisplayName(store);
  const cms = {
    ar: store.security.maintenance_message_ar.trim(),
    he: store.security.maintenance_message_he.trim(),
    en: store.security.maintenance_message_en.trim(),
  };

  const blocks = LOCALES.map((locale) => {
    const ui = getDictionary(locale).maintenanceUi;
    return {
      locale,
      dir: localeDir(locale),
      title: ui.title,
      message: cms[locale] || ui.defaultMessage,
    };
  });

  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center bg-ivory px-6 py-16 text-center">
      <p className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.28em] text-gold uppercase">
        {storeName}
      </p>

      <div className="mt-10 flex w-full max-w-xl flex-col items-center gap-10">
        {blocks.map((block, index) => (
          <section key={block.locale} dir={block.dir} className="w-full">
            {index > 0 ? (
              <div className="mx-auto mb-10 h-px w-16 bg-gold/50" aria-hidden />
            ) : null}
            <h1 className="font-[family-name:var(--font-cormorant)] text-3xl font-semibold text-charcoal md:text-4xl">
              {block.title}
            </h1>
            <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">
              {block.message}
            </p>
          </section>
        ))}
      </div>
    </main>
  );
}
