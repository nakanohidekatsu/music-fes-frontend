export function PageHeader({
  title,
  count,
  actions,
}: {
  title: string;
  count?: number;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-gray-800">
        {title}
        {count !== undefined && (
          <span className="ml-2 text-sm font-normal text-gray-500">{count}件</span>
        )}
      </h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
