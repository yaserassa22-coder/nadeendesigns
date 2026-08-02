import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppButton } from "@/components/layout/WhatsAppButton";
import { getSettings } from "@/lib/data/queries";

export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
      <WhatsAppButton whatsapp={settings.whatsapp} />
    </>
  );
}
