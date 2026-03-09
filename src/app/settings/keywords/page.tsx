'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner, ErrorMessage } from '@/components/ui/Spinner';

interface SearchKeyword {
  id: string;
  keyword: string;
  created_at: string;
}

export default function KeywordsPage() {
  const router = useRouter();
  const [keywords, setKeywords] = useState<SearchKeyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [inputError, setInputError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    api
      .get<SearchKeyword[]>('/search-keywords')
      .then(setKeywords)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login');
        } else {
          setPageError('データの取得に失敗しました');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newKeyword.trim();
    if (!trimmed) {
      setInputError('キーワードを入力してください');
      return;
    }
    if (trimmed.length > 50) {
      setInputError('キーワードは50文字以内で入力してください');
      return;
    }
    if (keywords.some((k) => k.keyword === trimmed)) {
      setInputError('このキーワードはすでに登録されています');
      return;
    }
    setInputError('');
    setSaving(true);
    try {
      const created = await api.post<SearchKeyword>('/search-keywords', { keyword: trimmed });
      setKeywords((prev) => [...prev, created]);
      setNewKeyword('');
    } catch (err) {
      if (err instanceof ApiError) {
        setInputError(err.message);
      } else {
        setInputError('追加に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setPageError('');
    try {
      await api.delete(`/search-keywords/${id}`);
      setKeywords((prev) => prev.filter((k) => k.id !== id));
    } catch {
      setPageError('削除に失敗しました');
    }
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="検索キーワード" />

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="mb-4 text-sm text-gray-600">
          自動収集で使用する検索キーワードを管理します。キーワードは最大50文字です。
        </p>

        {pageError && (
          <div className="mb-4">
            <ErrorMessage message={pageError} />
          </div>
        )}

        {loading ? (
          <Spinner />
        ) : (
          <ul className="mb-6 flex flex-col gap-2">
            {keywords.length === 0 ? (
              <li className="text-sm text-gray-400">
                登録済みのキーワードがありません（デフォルトのキーワードで収集されます）
              </li>
            ) : (
              keywords.map((k) => (
                <li
                  key={k.id}
                  className="flex items-center justify-between rounded border border-gray-100 px-3 py-2 text-sm"
                >
                  <span className="text-gray-800">{k.keyword}</span>
                  <button
                    onClick={() => handleDelete(k.id)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600"
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
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    削除
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        <form onSubmit={handleAdd} noValidate>
          <div className="flex gap-2">
            <input
              type="text"
              value={newKeyword}
              maxLength={50}
              onChange={(e) => {
                setNewKeyword(e.target.value);
                if (inputError) setInputError('');
              }}
              placeholder="追加するキーワード（最大50文字）"
              className={`flex-1 rounded border px-3 py-2 text-sm text-gray-600 focus:outline-none ${
                inputError
                  ? 'border-red-400 focus:border-red-400'
                  : 'border-gray-300 focus:border-sky-400'
              }`}
            />
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded bg-sky-400 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
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
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              追加
            </button>
          </div>
          {inputError && <p className="mt-1 text-xs text-red-600">{inputError}</p>}
        </form>
      </div>
    </div>
  );
}
