import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Dress } from "@/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { DressCard } from "@/components/dresses/DressCard";
import { Button } from "@/components/ui/Button";

interface FeaturedDressesProps {
  dresses: Dress[];
}

export function FeaturedDresses({ dresses }: FeaturedDressesProps) {
  if (dresses.length === 0) {
    return (
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 text-center md:px-8">
          <SectionHeading
            subtitle="مجموعتنا المميزة"
            title="فساتين مختارة بعناية"
            description="ستظهر الفساتين المميزة هنا قريبًا"
          />
          <Link href="/wedding-dresses">
            <Button variant="outline" size="lg">
              <ArrowLeft className="h-4 w-4" />
              تصفّحي فساتين الزفاف
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeading
          subtitle="مجموعتنا المميزة"
          title="فساتين مختارة بعناية"
          description="اكتشفي أحدث تصاميمنا الفاخرة المختارة خصيصًا لتمنحك إطلالة لا تُنسى"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dresses.map((dress, i) => (
            <DressCard key={dress.id} dress={dress} index={i} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/wedding-dresses">
            <Button variant="outline" size="lg">
              <ArrowLeft className="h-4 w-4" />
              عرض جميع الفساتين
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
