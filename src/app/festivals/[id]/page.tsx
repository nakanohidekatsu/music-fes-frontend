'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Spinner, ErrorMessage } from '@/components/ui/Spinner';
import type { ApplicationStatus, MusicFestival, ParticipationStatus, ResultStatus } from '@/types';

interface EditForm {
  // 基本情報
  event_name: string;
  event_date: string;
  prefecture: string;
  city: string;
  application_start_date: string;
  application_deadline: string;
  result_announcement_date: string;
  orientation_date: string;
  homepage_url: string;
  // 参加管理
  application_status: ApplicationStatus;
  result_status: ResultStatus;
  participation_planned_date: string;
  participation_status: ParticipationStatus;
  participated: boolean;
}

export default function FestivalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [festival, setFestival] = useState<MusicFestival | null>(null);
  const [form, setForm] = useState<EditForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    api
      .get<MusicFestival>(`/festivals/${id}`)
      .then((data) => {
        setFestival(data);
        setForm({
          event_name: data.event_name,
          event_date: data.event_date,
          prefecture: data.prefecture ?? '',
          city: data.city ?? '',
          application_start_date: data.application_start_date ?? '',
          application_deadline: data.application_deadline ?? '',
          result_announcement_date: data.result_announcement_date ?? '',
          orientation_date: data.orientation_date ?? '',
          homepage_url: data.homepage_url ?? '',
          application_status: data.application_status,
          result_status: data.result_status,
          participation_planned_date: data.participation_planned_date ?? '',
          participation_status: data.participation_status,
          participated: data.participated,
        });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.replace('/login');
        } else {
          setFetchError('データの取得に失敗しました');
        }
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSave() {
    if (!form) return;
    setSaving(true);
    setSaveError('');
    try {
      await api.put<MusicFestival>(`/festivals/${id}`, {
        event_name: form.event_name,
        event_date: form.event_date,
        prefecture: form.prefecture || null,
        city: form.city || null,
        application_start_date: form.application_start_date || null,
        application_deadline: form.application_deadline || null,
        result_announcement_date: form.result_announcement_date || null,
        orientation_date: form.orientation_date || null,
        homepage_url: form.homepage_url || null,
        application_status: form.application_status,
        result_status: form.result_status,
        participation_planned_date: form.participation_planned_date || null,
        participation_status: form.participation_status,
        participated: form.participated,
      });
      router.push('/festivals/managed');
    } catch (err) {
      if (err instanceof ApiError) {
        setSaveError(err.message);
      } else {
        setSaveError('保存に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;
  if (fetchError) return <ErrorMessage message={fetchError} />;
  if (!festival || !form) return null;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title={festival.event_name}
        actions={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
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
              <polyline points="15 18 9 12 15 6" />
            </svg>
            戻る
          </button>
        }
      />

      {/* 基本情報（編集可能） */}
      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">基本情報</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <TextField
              label="イベント名"
              value={form.event_name}
              onChange={(v) => setForm({ ...form, event_name: v })}
            />
          </div>
          <DateField
            label="開催日"
            value={form.event_date}
            onChange={(v) => setForm({ ...form, event_date: v })}
          />
          <TextField
            label="都道府県"
            value={form.prefecture}
            onChange={(v) => setForm({ ...form, prefecture: v })}
          />
          <TextField
            label="市町村"
            value={form.city}
            onChange={(v) => setForm({ ...form, city: v })}
          />
          <DateField
            label="募集開始日"
            value={form.application_start_date}
            onChange={(v) => setForm({ ...form, application_start_date: v })}
          />
          <DateField
            label="応募期限"
            value={form.application_deadline}
            onChange={(v) => setForm({ ...form, application_deadline: v })}
          />
          <DateField
            label="合格発表日"
            value={form.result_announcement_date}
            onChange={(v) => setForm({ ...form, result_announcement_date: v })}
          />
          <DateField
            label="説明会予定日"
            value={form.orientation_date}
            onChange={(v) => setForm({ ...form, orientation_date: v })}
          />
          <div className="sm:col-span-2">
            <TextField
              label="ホームページ"
              value={form.homepage_url}
              onChange={(v) => setForm({ ...form, homepage_url: v })}
            />
          </div>
        </div>
      </section>

      {/* 参加管理（編集可能） */}
      <section className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">参加管理</h2>

        <div className="mb-5 flex flex-wrap gap-2">
          <Badge value={form.application_status} />
          <Badge value={form.result_status} />
          <Badge value={form.participation_status} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="応募状況"
            value={form.application_status}
            options={['未設定', '応募済', '応募見送り']}
            onChange={(v) => setForm({ ...form, application_status: v as ApplicationStatus })}
          />
          <SelectField
            label="合否"
            value={form.result_status}
            options={['未設定', '合格', '不合格', '保留']}
            onChange={(v) => setForm({ ...form, result_status: v as ResultStatus })}
          />
          <DateField
            label="参加予定日"
            value={form.participation_planned_date}
            onChange={(v) => setForm({ ...form, participation_planned_date: v })}
          />
          <SelectField
            label="参加可否"
            value={form.participation_status}
            options={['未設定', '参加可', '参加不可']}
            onChange={(v) => setForm({ ...form, participation_status: v as ParticipationStatus })}
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.participated}
            onChange={(e) => setForm({ ...form, participated: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="font-medium text-gray-700">参加済み</span>
        </label>

        {saveError && <ErrorMessage message={saveError} />}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded bg-sky-400 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
          >
            {saving ? (
              '保存中...'
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
                保存
              </>
            )}
          </button>
          <button
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
      </section>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
      />
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
