export type ApplicationStatus = '未設定' | '応募済' | '応募見送り';
export type ResultStatus = '未設定' | '合格' | '不合格' | '保留';
export type ParticipationStatus = '未設定' | '参加可' | '参加不可';
export type ParticipationResultStatus = '未定' | '参加済み' | '未開催';
export type SourceType = 'auto' | 'manual';

export interface MusicFestival {
  id: string;
  event_name: string;
  event_date: string;
  homepage_url: string | null;
  application_start_date: string | null;
  application_deadline: string | null;
  result_announcement_date: string | null;
  prefecture: string | null;
  city: string | null;
  orientation_date: string | null;
  is_managed: boolean;
  application_status: ApplicationStatus;
  result_status: ResultStatus;
  participation_planned_date: string | null;
  participation_status: ParticipationStatus;
  participation_result_status: ParticipationResultStatus;
  // 参加詳細（participation_status = '参加可' のフェスで入力）
  participation_date: string | null;
  performance_time: string | null;
  play_duration: string | null;
  stage_name: string | null;
  venue_address: string | null;
  participation_fee: number | null;
  fee_paid: boolean;
  music_stand_required: boolean;
  notes: string | null;
  source_type: SourceType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MusicFestivalListResponse {
  items: MusicFestival[];
  total: number;
  skip: number;
  limit: number;
}

export interface FestivalPageResponse {
  items: MusicFestival[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationSetting {
  id: string;
  user_id: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}
