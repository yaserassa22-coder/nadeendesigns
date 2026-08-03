import { cn } from "@/lib/utils";

interface ProductDescriptionProps {
  text: string | null | undefined;
  className?: string;
}

/** Storefront product description — preserves newlines for AR/EN multiline text. */
export function ProductDescription({
  text,
  className,
}: ProductDescriptionProps) {
  const value = (text ?? "").trim();
  if (!value) return null;

  return (
    <div
      className={cn(
        "mt-6 whitespace-pre-wrap text-base leading-relaxed text-muted",
        className
      )}
    >
      {value}
    </div>
  );
}
