'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner, ErrorMessage } from '@/components/ui/Spinner';
import type { FestivalPageResponse, MusicFestival } from '@/types';

const LIMIT = 50;

type SortKey = 'event_date' | 'application_deadline' | 'event_name';
type Order = 'asc' | 'desc';

// コンポーネント外で定義してレンダリング中の再生成を防ぐ
function SortTh({
  label,
  col,
  currentSort,
  currentOrder,
  onSort,
}: {
  label: string;
  col: SortKey;
  currentSort: SortKey;
  currentOrder: Order;
  onSort: (col: SortKey) => void;
}) {
  const active = currentSort === col;
  return (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left hover:text-gray-700"
      onClick={() => onSort(col)}
    >
      {label}
      {active && <span className="ml-1">{currentOrder === 'asc' ? '↑' : '↓'}</span>}
    </th>
  );
}

export default function ManagedPage() {
  const router = useRouter();
  const [items, setItems] = useState<MusicFestival[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>('event_date');
  const [order, setOrder] = useState<Order>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api
      .get<FestivalPageResponse>(
        `/festivals/managed?page=${page}&limit=${LIMIT}&sort_by=${sortBy}&order=${order}`,
      )
      .then((res) => {
        if (!cancelled) {
          setItems(res.items);
          setTotal(res.total);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 401) {
            router.replace('/login');
          } else {
            setError('データの取得に失敗しました');
            setLoading(false);
          }
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page, sortBy, order, router]);

  function handleSort(key: SortKey) {
    setLoading(true);
    setError('');
    if (sortBy === key) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setOrder('asc');
    }
    setPage(1);
  }

  function goToPage(next: number) {
    setLoading(true);
    setError('');
    setPage(next);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <PageHeader title="管理対象フェス一覧" count={total} />

      {error && <ErrorMessage message={error} />}

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
            <tr>
              <SortTh
                label="イベント名"
                col="event_name"
                currentSort={sortBy}
                currentOrder={order}
                onSort={handleSort}
              />
              <SortTh
                label="開催日"
                col="event_date"
                currentSort={sortBy}
                currentOrder={order}
                onSort={handleSort}
              />
              <th className="px-4 py-3 text-left">都道府県</th>
              <SortTh
                label="応募期限"
                col="application_deadline"
                currentSort={sortBy}
                currentOrder={order}
                onSort={handleSort}
              />
              <th className="px-4 py-3 text-left">応募状況</th>
              <th className="px-4 py-3 text-left">合否</th>
              <th className="px-4 py-3 text-left">参加状況</th>
              <th className="px-4 py-3 text-center">参加済み</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-6">
                  <Spinner />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  管理対象のフェスがありません
                </td>
              </tr>
            ) : (
              items.map((f) => (
                <tr
                  key={f.id}
                  className="cursor-pointer hover:bg-blue-50"
                  onClick={() => router.push(`/festivals/${f.id}`)}
                >
                  <td className="px-4 py-3 text-gray-600">
                    {f.homepage_url ? (
                      <a
                        href={f.homepage_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-sky-600 hover:underline"
                      >
                        {f.event_name}
                      </a>
                    ) : (
                      f.event_name
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">{f.event_date}</td>
                  <td className="px-4 py-3 text-gray-600">{f.prefecture ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                    {f.application_deadline ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={f.application_status} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={f.result_status} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge value={f.participation_status} />
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {f.participated ? '✓' : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <button
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            前へ
          </button>
          <span className="text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => goToPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-40"
          >
            次へ
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
