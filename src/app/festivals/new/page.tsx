'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorMessage } from '@/components/ui/Spinner';
import type { MusicFestival } from '@/types';

interface FormState {
  event_name: string;
  event_date: string;
  homepage_url: string;
  application_start_date: string;
  application_deadline: string;
  result_announcement_date: string;
  prefecture: string;
  city: string;
  orientation_date: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const INITIAL: FormState = {
  event_name: '',
  event_date: '',
  homepage_url: '',
  application_start_date: '',
  application_deadline: '',
  result_announcement_date: '',
  prefecture: '',
  city: '',
  orientation_date: '',
};

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const today = new Date().toISOString().slice(0, 10);
  const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  if (!form.event_name.trim()) {
    errors.event_name = 'イベント名を入力してください';
  } else if (form.event_name.trim().length > 255) {
    errors.event_name = 'イベント名は255文字以内で入力してください';
  }

  if (!form.event_date) {
    errors.event_date = '開催日を入力してください';
  } else if (form.event_date < today) {
    errors.event_date = '開催日は今日以降の日付を入力してください';
  } else if (form.event_date > oneYearLater) {
    errors.event_date = '開催日は1年以内の日付を入力してください';
  }

  if (form.homepage_url && !/^https?:\/\/.+/.test(form.homepage_url.trim())) {
    errors.homepage_url = '正しいURL形式（http:// または https://）で入力してください';
  }

  if (
    form.application_deadline &&
    form.application_start_date &&
    form.application_deadline < form.application_start_date
  ) {
    errors.application_deadline = '応募期限は募集開始日以降の日付を入力してください';
  }

  if (
    form.result_announcement_date &&
    form.application_deadline &&
    form.result_announcement_date < form.application_deadline
  ) {
    errors.result_announcement_date = '合格発表日は応募期限以降の日付を入力してください';
  }

  return errors;
}

export default function NewFestivalPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    setSubmitError('');
    try {
      await api.post<MusicFestival>('/festivals', {
        event_name: form.event_name.trim(),
        event_date: form.event_date,
        homepage_url: form.homepage_url.trim() || null,
        application_start_date: form.application_start_date || null,
        application_deadline: form.application_deadline || null,
        result_announcement_date: form.result_announcement_date || null,
        prefecture: form.prefecture.trim() || null,
        city: form.city.trim() || null,
        orientation_date: form.orientation_date || null,
      });
      router.push('/festivals/discovered');
    } catch {
      setSubmitError('登録に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="フェスを手動登録" />

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Field label="イベント名 *" error={errors.event_name}>
            <input
              type="text"
              value={form.event_name}
              onChange={(e) => set('event_name', e.target.value)}
              placeholder="例: ROCK IN JAPAN FESTIVAL 2026"
              className={inputCls(!!errors.event_name)}
            />
          </Field>

          <Field label="開催日 *" error={errors.event_date}>
            <input
              type="date"
              value={form.event_date}
              onChange={(e) => set('event_date', e.target.value)}
              className={inputCls(!!errors.event_date)}
            />
          </Field>

          <Field label="ホームページ URL" error={errors.homepage_url}>
            <input
              type="text"
              value={form.homepage_url}
              onChange={(e) => set('homepage_url', e.target.value)}
              placeholder="https://..."
              className={inputCls(!!errors.homepage_url)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="都道府県">
              <input
                type="text"
                value={form.prefecture}
                onChange={(e) => set('prefecture', e.target.value)}
                placeholder="例: 千葉"
                className={inputCls(false)}
              />
            </Field>
            <Field label="市町村">
              <input
                type="text"
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                placeholder="例: 千葉市"
                className={inputCls(false)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="募集開始日">
              <input
                type="date"
                value={form.application_start_date}
                onChange={(e) => set('application_start_date', e.target.value)}
                className={inputCls(false)}
              />
            </Field>
            <Field label="応募期限" error={errors.application_deadline}>
              <input
                type="date"
                value={form.application_deadline}
                onChange={(e) => set('application_deadline', e.target.value)}
                className={inputCls(!!errors.application_deadline)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="合格発表日" error={errors.result_announcement_date}>
              <input
                type="date"
                value={form.result_announcement_date}
                onChange={(e) => set('result_announcement_date', e.target.value)}
                className={inputCls(!!errors.result_announcement_date)}
              />
            </Field>
            <Field label="説明会予定日">
              <input
                type="date"
                value={form.orientation_date}
                onChange={(e) => set('orientation_date', e.target.value)}
                className={inputCls(false)}
              />
            </Field>
          </div>

          {submitError && <ErrorMessage message={submitError} />}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded bg-sky-400 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            >
              {saving ? (
                '登録中...'
              ) : (
                <>
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
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  登録
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center gap-1.5 rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded border px-3 py-2 text-sm focus:outline-none ${
    hasError ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-sky-400'
  }`;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
