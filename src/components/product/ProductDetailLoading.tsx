export function ProductDetailLoading() {
  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24" aria-busy="true">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2 md:gap-14 md:px-8">
        <div className="aspect-[3/4] animate-pulse rounded-sm bg-beige" />
        <div className="space-y-5 pt-2">
          <div className="h-3 w-28 animate-pulse rounded-full bg-beige" />
          <div className="h-9 w-3/4 animate-pulse rounded-full bg-beige" />
          <div className="h-6 w-32 animate-pulse rounded-full bg-beige" />
          <div className="h-12 w-full max-w-xs animate-pulse rounded-full bg-beige" />
          <div className="space-y-2 pt-4">
            <div className="h-3 w-full animate-pulse rounded-full bg-beige" />
            <div className="h-3 w-5/6 animate-pulse rounded-full bg-beige" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-beige" />
          </div>
        </div>
      </div>
    </section>
  );
}
