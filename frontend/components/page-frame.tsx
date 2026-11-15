export function PageFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-forest">{title}</h1>
      <div className="mt-6">{children}</div>
    </div>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-line bg-card px-4 py-3 text-sm leading-6">{children}</p>
  );
}
