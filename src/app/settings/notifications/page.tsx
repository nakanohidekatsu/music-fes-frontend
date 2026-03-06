'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner, ErrorMessage } from '@/components/ui/Spinner';
import type { NotificationSetting } from '@/types';

function validateEmail(email: string, existing: NotificationSetting[]): string {
  const trimmed = email.trim();
  if (!trimmed) return 'メールアドレスを入力してください';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return '正しいメールアドレス形式で入力してください';
  if (existing.some((s) => s.email === trimmed)) return 'このメールアドレスはすでに登録されています';
  return '';
}

export default function NotificationsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    api
      .get<NotificationSetting[]>('/notification-settings')
      .then(setSettings)
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
    const err = validateEmail(newEmail, settings);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError('');
    setSaving(true);
    try {
      const created = await api.post<NotificationSetting>('/notification-settings', {
        email: newEmail.trim(),
      });
      setSettings((prev) => [...prev, created]);
      setNewEmail('');
    } catch {
      setEmailError('追加に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(setting: NotificationSetting) {
    try {
      const updated = await api.put<NotificationSetting>(
        `/notification-settings/${setting.id}`,
        { is_active: !setting.is_active },
      );
      setSettings((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      setPageError('更新に失敗しました');
    }
  }

  async function handleDelete(id: string) {
    setPageError('');
    try {
      await api.delete(`/notification-settings/${id}`);
      setSettings((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setPageError('削除に失敗しました');
    }
  }

  return (
    <div className="max-w-lg">
      <PageHeader title="通知設定" />

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="mb-4 text-sm text-gray-600">
          新着フェス・応募期限リマインダーを受け取るメールアドレスを管理します。
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
            {settings.length === 0 ? (
              <li className="text-sm text-gray-400">登録済みのメールアドレスがありません</li>
            ) : (
              settings.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded border border-gray-100 px-3 py-2 text-sm"
                >
                  <span className={s.is_active ? 'text-gray-800' : 'text-gray-400 line-through'}>
                    {s.email}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleActive(s)}
                      className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                        s.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {s.is_active ? '有効' : '無効'}
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
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
                  </div>
                </li>
              ))
            )}
          </ul>
        )}

        <form onSubmit={handleAdd} noValidate>
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              placeholder="追加するメールアドレス"
              className={`flex-1 rounded border px-3 py-2 text-sm focus:outline-none ${
                emailError
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
          {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
        </form>
      </div>
    </div>
  );
}
