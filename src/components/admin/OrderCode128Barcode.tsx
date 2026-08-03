"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

type OrderCode128BarcodeProps = {
  /** Public order number, e.g. ND-E36A78A0 */
  value: string;
  className?: string;
};

/**
 * Print-friendly Code-128 barcode (SVG) for shipping slips.
 */
export function OrderCode128Barcode({
  value,
  className,
}: OrderCode128BarcodeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    JsBarcode(svgRef.current, value, {
      format: "CODE128",
      displayValue: false,
      margin: 4,
      height: 52,
      width: 1.8,
      background: "#ffffff",
      lineColor: "#000000",
    });
  }, [value]);

  if (!value) return null;

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label={`باركود رقم الطلب ${value}`}
      className={className ?? "h-auto w-full max-w-[280px]"}
    />
  );
}
