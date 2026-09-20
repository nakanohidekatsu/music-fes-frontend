'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner, ErrorMessage } from '@/components/ui/Spinner';
import { useViewMode } from '@/lib/useViewMode';
import type { FestivalPageResponse, MusicFestival } from '@/types';

const LIMIT = 50;

type SortKey = 'created_at' | 'event_date';
type Order = 'asc' | 'desc';

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

interface CollectResponse {
  started_at: string;
  finished_at: string;
  total_sites: number;
  total_new_festivals: number;
  results: { site_name: string; status: string; collected_count: number; error_message?: string }[];
}

export default function DiscoveredPage() {
  const router = useRouter();
  const [items, setItems] = useState<MusicFestival[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>('event_date');
  const [order, setOrder] = useState<Order>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [collecting, setCollecting] = useState(false);
  const [collectResult, setCollectResult] = useState<CollectResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pageInput, setPageInput] = useState('1');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { isMobile } = useViewMode();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;
    const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
    api
      .get<FestivalPageResponse>(
        `/festivals/discovered?page=${page}&limit=${LIMIT}&sort_by=${sortBy}&order=${order}${searchParam}`,
      )
      .then((res) => {
        if (!cancelled) {
          setItems(res.items);
          setTotal(res.total);
          setLoading(false);
          setSelectedIds(new Set());
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
  }, [page, sortBy, order, debouncedSearch, router]);

  async function handleCollect() {
    setCollecting(true);
    setCollectResult(null);
    setError('');
    try {
      const result = await api.post<CollectResponse>('/collect', {});
      setCollectResult(result);
      // 収集後にリストを再取得
      setPage(1);
      setLoading(true);
      const res = await api.get<FestivalPageResponse>(
        `/festivals/discovered?page=1&limit=${LIMIT}&sort_by=${sortBy}&order=${order}`,
      );
      setItems(res.items);
      setTotal(res.total);
      setLoading(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace('/login');
      } else {
        setError('自動収集に失敗しました');
      }
    } finally {
      setCollecting(false);
    }
  }

  async function toggleManaged(festival: MusicFestival) {
    try {
      const updated = await api.patch<MusicFestival>(`/festivals/${festival.id}/manage`, {
        is_managed: !festival.is_managed,
      });
      setItems((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    } catch {
      setError('更新に失敗しました');
    }
  }

  async function handleDelete(festival: MusicFestival) {
    if (!window.confirm(`「${festival.event_name}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    setError('');
    try {
      await api.delete(`/festivals/${festival.id}`);
      setItems((prev) => prev.filter((f) => f.id !== festival.id));
      setTotal((prev) => prev - 1);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(festival.id);
        return next;
      });
    } catch {
      setError('削除に失敗しました');
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === items.length ? new Set() : new Set(items.map((f) => f.id)),
    );
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`選択した ${selectedIds.size} 件を削除しますか？この操作は取り消せません。`)) {
      return;
    }
    setError('');
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await api.post<{ deleted_count: number }>('/festivals/bulk-delete', { ids });
      setItems((prev) => prev.filter((f) => !selectedIds.has(f.id)));
      setTotal((prev) => prev - ids.length);
      setSelectedIds(new Set());
    } catch {
      setError('一括削除に失敗しました');
    } finally {
      setBulkDeleting(false);
    }
  }

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

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  function handlePageInputSubmit() {
    const next = Number(pageInput);
    if (!Number.isInteger(next) || next < 1 || next > totalPages) {
      setPageInput(String(page));
      return;
    }
    goToPage(next);
  }

  return (
    <div>
      <PageHeader
        title="Crawling"
        count={total}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleCollect}
              disabled={collecting}
              className="flex items-center gap-1.5 rounded bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
            >
              {collecting ? (
                <svg
                  className="h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0114.13-3.36L23 10M1 14l5.36 4.36A9 9 0 0020.49 15" />
                </svg>
              )}
              {collecting ? '収集中...' : '自動収集'}
            </button>
            <Link
              href="/festivals/new"
              className="flex items-center gap-1.5 rounded bg-sky-400 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              手動登録
            </Link>
          </div>
        }
      />

      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="イベント名・都道府県・市町村で検索"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm">
          <span className="font-medium text-red-700">{selectedIds.size} 件選択中</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded px-2 py-1 text-gray-600 hover:bg-white"
            >
              選択解除
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {bulkDeleting ? '削除中...' : '選択項目を削除'}
            </button>
          </div>
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      {collectResult && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="font-medium">収集完了:</span> {collectResult.total_sites} サイト巡回 /{' '}
          {collectResult.total_new_festivals} 件新規登録
          {collectResult.results.some((r) => r.status === 'failure') && (
            <span className="ml-2 text-red-600">
              ({collectResult.results.filter((r) => r.status === 'failure').length} サイト失敗)
            </span>
          )}
        </div>
      )}

      {isMobile ? (
        /* ── スマホ表示: カードビュー ── */
        <div className="flex flex-col gap-3">
          {loading ? (
            <Spinner />
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-gray-400">データがありません</p>
          ) : (
            items.map((f) => (
              <div key={f.id} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-2 flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(f.id)}
                    onChange={() => toggleSelected(f.id)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300"
                  />
                  <div className="text-base font-medium">
                    {f.homepage_url ? (
                      <a href={f.homepage_url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">
                        {f.event_name}
                      </a>
                    ) : (
                      <span className="text-gray-800">{f.event_name}</span>
                    )}
                  </div>
                </div>
                <div className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                  <div><span className="text-xs text-gray-400">収集日</span><br />{f.created_at.slice(0, 10)}</div>
                  <div><span className="text-xs text-gray-400">開催日</span><br />{f.event_date}</div>
                  <div><span className="text-xs text-gray-400">都道府県</span><br />{f.prefecture ?? '—'}</div>
                  <div><span className="text-xs text-gray-400">市町村</span><br />{f.city ?? '—'}</div>
                  <div><span className="text-xs text-gray-400">応募期限</span><br />{f.application_deadline ?? '—'}</div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">管理対象</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleManaged(f)}
                      className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                        f.is_managed
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {f.is_managed ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={() => handleDelete(f)}
                      className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
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
                <th className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left">イベント名</th>
                <SortTh label="収集日" col="created_at" currentSort={sortBy} currentOrder={order} onSort={handleSort} />
                <SortTh label="開催日" col="event_date" currentSort={sortBy} currentOrder={order} onSort={handleSort} />
                <th className="px-4 py-3 text-left">都道府県</th>
                <th className="px-4 py-3 text-left">市町村</th>
                <th className="px-4 py-3 text-left">応募期限</th>
                <th className="px-4 py-3 text-center">管理対象</th>
                <th className="px-4 py-3 text-center">削除</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-6"><Spinner /></td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">データがありません</td></tr>
              ) : (
                items.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(f.id)}
                        onChange={() => toggleSelected(f.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {f.homepage_url ? (
                        <a href={f.homepage_url} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">
                          {f.event_name}
                        </a>
                      ) : (
                        f.event_name
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{f.created_at.slice(0, 10)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{f.event_date}</td>
                    <td className="px-4 py-3 text-gray-600">{f.prefecture ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{f.city ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{f.application_deadline ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleManaged(f)}
                        className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                          f.is_managed
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {f.is_managed ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(f)}
                        className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        削除
                      </button>
                    </td>
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
          <div className="ml-2 flex items-center gap-1.5">
            <label htmlFor="page-jump" className="text-gray-500">
              ページ指定
            </label>
            <input
              id="page-jump"
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePageInputSubmit();
              }}
              className="w-16 rounded border border-gray-300 px-2 py-1 text-center focus:border-sky-400 focus:outline-none"
            />
            <button
              onClick={handlePageInputSubmit}
              className="rounded border border-gray-300 px-2 py-1 hover:bg-gray-50"
            >
              移動
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
