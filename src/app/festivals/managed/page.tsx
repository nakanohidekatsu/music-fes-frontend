'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner, ErrorMessage } from '@/components/ui/Spinner';
import { useViewMode } from '@/lib/useViewMode';
import type { FestivalPageResponse, MusicFestival } from '@/types';

const LIMIT = 50;

type SortKey = 'event_date' | 'application_deadline' | 'event_name';
type Order = 'asc' | 'desc';

function isWithinLastTwoWeeks(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  return date >= twoWeeksAgo;
}

type NewsItem = {
  festival: MusicFestival;
  type: 'new' | 'updated';
  date: string;
};

function NewsSection({ newsItems, onFestivalClick }: { newsItems: NewsItem[]; onFestivalClick: (id: string) => void }) {
  const [collapsed, setCollapsed] = useState(true);

  if (newsItems.length === 0) return null;

  return (
    <div className="mb-5 rounded-lg border border-sky-200 bg-sky-50">
      {/* ヘッダー */}
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
            <path d="M18 14h-8" />
            <path d="M15 18h-5" />
            <path d="M10 6h8v4h-8V6Z" />
          </svg>
          <span className="text-sm font-semibold text-sky-700">News</span>
          <span className="rounded-full bg-sky-500 px-2 py-0.5 text-xs font-medium text-white">
            {newsItems.length}
          </span>
          <span className="text-xs text-sky-500">直近2週間の更新情報</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-sky-400 transition-transform ${collapsed ? '-rotate-90' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {!collapsed && (
        <ul className="divide-y divide-sky-100 border-t border-sky-200">
          {newsItems.map((item) => {
            const f = item.festival;
            return (
              <li
                key={`${f.id}-${item.type}`}
                className="cursor-pointer px-4 py-2.5 hover:bg-sky-100"
                onClick={() => onFestivalClick(f.id)}
              >
                {/* 1行目: バッジ + イベント名 + 日付 */}
                <div className="flex items-center gap-2">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                      item.type === 'new'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {item.type === 'new' ? '新着' : '更新'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">{f.event_name}</span>
                  <span className="shrink-0 text-xs text-gray-400">{item.date.slice(0, 10)}</span>
                </div>
                {/* 2行目: ステータスバッジ（未設定以外のみ） */}
                {(f.application_status !== '未設定' || f.result_status !== '未設定' || f.participation_status !== '未設定' || f.participated) && (
                  <div className="mt-1 flex flex-wrap items-center gap-1 pl-1">
                    {f.application_status !== '未設定' && <Badge value={f.application_status} />}
                    {f.result_status !== '未設定' && <Badge value={f.result_status} />}
                    {f.participation_status !== '未設定' && <Badge value={f.participation_status} />}
                    {f.participated && <span className="text-xs font-medium text-green-600">✓参加済</span>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

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
  const { isMobile } = useViewMode();
  const [items, setItems] = useState<MusicFestival[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>('event_date');
  const [order, setOrder] = useState<Order>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  // Newsセクション用: 直近1ヶ月の更新情報を一度だけ取得
  useEffect(() => {
    let cancelled = false;
    api
      .get<FestivalPageResponse>(`/festivals/managed?page=1&limit=200&sort_by=event_date&order=asc`)
      .then((res) => {
        if (!cancelled) {
          const news: NewsItem[] = [];
          for (const f of res.items) {
            const isNew = isWithinLastTwoWeeks(f.created_at);
            const isUpdated =
              !isNew && isWithinLastTwoWeeks(f.updated_at) && f.updated_at !== f.created_at;
            if (isNew) {
              news.push({ festival: f, type: 'new', date: f.created_at });
            } else if (isUpdated) {
              news.push({ festival: f, type: 'updated', date: f.updated_at });
            }
          }
          // 新しい順に並べる
          news.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setNewsItems(news);
        }
      })
      .catch(() => {
        // Newsの取得失敗はサイレントに無視
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      <PageHeader title="Scope" count={total} />

      <NewsSection newsItems={newsItems} onFestivalClick={(id) => router.push(`/festivals/${id}`)} />

      {error && <ErrorMessage message={error} />}

      {isMobile ? (
        /* ── スマホ表示: カードビュー ── */
        <div className="flex flex-col gap-3">
          {loading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-gray-400">Scopeのフェスがありません</p>
          ) : (
            items.map((f) => (
              <div
                key={f.id}
                className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 hover:bg-blue-50"
                onClick={() => router.push(`/festivals/${f.id}`)}
              >
                <div className="mb-2 text-base font-medium">
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
                    <span className="text-gray-800">{f.event_name}</span>
                  )}
                </div>
                <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                  <div><span className="text-xs text-gray-400">開催日</span><br />{f.event_date}</div>
                  <div><span className="text-xs text-gray-400">都道府県</span><br />{f.prefecture ?? '—'}</div>
                  <div><span className="text-xs text-gray-400">募集開始日</span><br />{f.application_start_date ?? '—'}</div>
                  <div><span className="text-xs text-gray-400">応募期限</span><br />{f.application_deadline ?? '—'}</div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge value={f.application_status} />
                  <Badge value={f.result_status} />
                  <Badge value={f.participation_status} />
                  {f.participated && <span className="text-xs font-medium text-green-600">✓ 参加済み</span>}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ── PC表示: テーブルビュー ── */
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
              <tr>
                <SortTh label="イベント名" col="event_name" currentSort={sortBy} currentOrder={order} onSort={handleSort} />
                <SortTh label="開催日" col="event_date" currentSort={sortBy} currentOrder={order} onSort={handleSort} />
                <th className="px-4 py-3 text-left">都道府県</th>
                <th className="px-4 py-3 text-left">募集開始日</th>
                <SortTh label="応募期限" col="application_deadline" currentSort={sortBy} currentOrder={order} onSort={handleSort} />
                <th className="px-4 py-3 text-left">応募状況</th>
                <th className="px-4 py-3 text-left">合否</th>
                <th className="px-4 py-3 text-left">参加状況</th>
                <th className="px-4 py-3 text-center">参加済み</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-6"><Spinner /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Scopeのフェスがありません</td></tr>
              ) : (
                items.map((f) => (
                  <tr key={f.id} className="cursor-pointer hover:bg-blue-50" onClick={() => router.push(`/festivals/${f.id}`)}>
                    <td className="px-4 py-3 text-gray-600">
                      {f.homepage_url ? (
                        <a href={f.homepage_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-sky-600 hover:underline">
                          {f.event_name}
                        </a>
                      ) : (
                        f.event_name
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{f.event_date}</td>
                    <td className="px-4 py-3 text-gray-600">{f.prefecture ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{f.application_start_date ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{f.application_deadline ?? '—'}</td>
                    <td className="px-4 py-3"><Badge value={f.application_status} /></td>
                    <td className="px-4 py-3"><Badge value={f.result_status} /></td>
                    <td className="px-4 py-3"><Badge value={f.participation_status} /></td>
                    <td className="px-4 py-3 text-center text-gray-500">{f.participated ? '✓' : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

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
