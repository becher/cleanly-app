// Types centraux pour toutes les plateformes

export type Platform =
  | 'discord'
  | 'twitter'
  | 'reddit'
  | 'bluesky'
  | 'mastodon'
  | 'threads'
  | 'youtube'
  | 'teams'
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'tiktok'
  | 'slack';

export type ContentType =
  | 'message'
  | 'post'
  | 'tweet'
  | 'comment'
  | 'like'
  | 'repost'
  | 'video'
  | 'story';

export type DeletionStatus = 'pending' | 'processing' | 'done' | 'error' | 'skipped';

export interface PlatformAccount {
  id: string;
  platform: Platform;
  username: string;
  displayName: string;
  avatar?: string;
  token: string;
  tokenExpiry?: number;
  connectedAt: number;
}

export interface ContentItem {
  id: string;
  platform: Platform;
  accountId: string;
  contentType: ContentType;
  text?: string;
  createdAt: number;
  url?: string;
  metadata?: Record<string, unknown>;
}

export interface DeletionTask {
  id: number;
  platform: Platform;
  accountId: string;
  contentId: string;
  contentType: ContentType;
  status: DeletionStatus;
  retryCount: number;
  nextRetryAt?: number;
  createdAt: number;
  errorMessage?: string;
}

export interface DeletionStats {
  platform: Platform;
  total: number;
  done: number;
  error: number;
  pending: number;
}

export interface PlatformConfig {
  id: Platform;
  name: string;
  color: string;
  icon: string;
  authType: 'oauth2' | 'token' | 'app-password';
  tier: 1 | 2;
  phase: 1 | 2;
}
