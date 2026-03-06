const colorMap: Record<string, string> = {
  未設定: 'bg-gray-100 text-gray-500',
  応募済: 'bg-blue-100 text-blue-700',
  応募見送り: 'bg-yellow-100 text-yellow-700',
  合格: 'bg-green-100 text-green-700',
  不合格: 'bg-red-100 text-red-700',
  保留: 'bg-orange-100 text-orange-700',
  参加可: 'bg-green-100 text-green-700',
  参加不可: 'bg-red-100 text-red-700',
};

export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colorMap[value] ?? 'bg-gray-100 text-gray-500'}`}
    >
      {value}
    </span>
  );
}
