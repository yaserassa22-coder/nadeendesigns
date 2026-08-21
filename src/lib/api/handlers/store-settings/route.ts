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
    let vatNumber = "";
    try {
      const { getCommerceSettings } = await import("@/lib/commerce/settings");
      const commerce = await getCommerceSettings();
      vatNumber = commerce?.invoicing?.vat_number?.trim() || "";
    } catch {
      /* optional commerce module */
    }

    return NextResponse.json({
      store_name: getStoreDisplayName(settings),
      logo_url: settings.general.logo_url,
      favicon_url: settings.general.favicon_url,
      currency: settings.general.currency,
      language: settings.general.language,
      enabled_locales: settings.general.enabled_locales,
      phone: settings.contact.phone || settings.general.business_phone,
      email: settings.contact.email || settings.general.business_email,
      whatsapp: settings.contact.whatsapp,
      business_address: settings.general.business_address,
      business_address_ar: settings.general.business_address_ar,
      business_address_he: settings.general.business_address_he,
      /** Public tax identity for printable invoices (not a secret). */
      tax: {
        business_id: settings.tax.business_id,
        business_id_type: settings.tax.business_id_type,
        vat_rate: settings.tax.vat_rate,
        prices_include_vat: settings.tax.prices_include_vat,
        default_document_type: settings.tax.default_document_type,
      },
      vat_number: vatNumber || settings.tax.business_id,
      social: settings.social,
      homepage: settings.homepage,
      payments: getVisiblePaymentProviders(settings).map((p) => ({
        id: p.id,
        name: p.name,
        name_ar: p.name_ar,
        name_he: p.name_he || "",
        description: p.description,
        description_ar: p.description_ar,
        description_he: p.description_he || "",
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
      session_timeout_minutes: settings.security.session_timeout_minutes,
      seo: {
        title: settings.seo.title,
        description: settings.seo.description,
        og_image_url: settings.seo.og_image_url,
      },
      legal: {
        require_checkout_acceptance:
          settings.legal.require_checkout_acceptance,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "فشل تحميل إعدادات المتجر" },
      { status: 500 }
    );
  }
}
