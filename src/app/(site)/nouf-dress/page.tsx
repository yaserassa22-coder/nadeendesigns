import { redirect } from "next/navigation";

/** Legacy URL — فساتين نوف lives at /nouf-dresses */
export default function LegacyNoufDressRedirect() {
  redirect("/nouf-dresses");
}
