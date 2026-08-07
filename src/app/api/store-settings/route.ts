import { NextResponse } from "next/server";
import {
  getStoreDisplayName,
  getStoreSettings,
  getVisiblePaymentProviders,
} from "@/lib/store/settings";

/**
 * Public (anon-readable) store branding + visible payment methods.
 * No secrets. Used by checkout and any client that needs live store config.
 * Coming-soon methods are included with coming_soon: true for قريباً UI.
 */
export async function GET() {
  try {
    const settings = await getStoreSettings(true);
    return NextResponse.json({
      store_name: getStoreDisplayName(settings),
      logo_url: settings.general.logo_url,
      favicon_url: settings.general.favicon_url,
      currency: settings.general.currency,
      language: settings.general.language,
      phone: settings.contact.phone || settings.general.business_phone,
      email: settings.contact.email || settings.general.business_email,
      whatsapp: settings.contact.whatsapp,
      social: settings.social,
      homepage: settings.homepage,
      payments: getVisiblePaymentProviders(settings).map((p) => ({
        id: p.id,
        name: p.name,
        name_ar: p.name_ar,
        description_ar: p.description_ar,
        icon: p.icon,
        sort_order: p.sort_order,
        coming_soon: p.coming_soon,
        configured: p.configured,
      })),
      order_options: settings.order_options,
      extra_services: {
        services: settings.extra_services.services.filter((s) => s.enabled),
      },
      maintenance_mode: settings.security.maintenance_mode,
      seo: {
        title: settings.seo.title,
        description: settings.seo.description,
        og_image_url: settings.seo.og_image_url,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "فشل تحميل إعدادات المتجر" },
      { status: 500 }
    );
  }
}
