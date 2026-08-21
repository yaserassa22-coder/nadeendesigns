export default function StorefrontLoading() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center bg-ivory"
      role="status"
      aria-label="Loading"
    >
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-gold/25 border-t-gold" />
    </div>
  );
}