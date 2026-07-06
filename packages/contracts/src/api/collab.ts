import type { OkResponse } from '../common.js';

// Team-edition collaboration (C lane) shared DTOs: presence overlay (在场) and
// the sync trigger. Single source of truth for the daemon routes, the web
// CollabClient, and the `od collab` CLI so no surface re-declares these shapes.

export type CollabMemberRole = 'owner' | 'admin' | 'member';

/** A member present in a shared project (heartbeat identity). */
export interface CollabPresenceMember {
  memberId: string;
  name?: string;
  role?: CollabMemberRole;
}

/** GET /api/projects/:id/presence and the heartbeat response body. */
export interface CollabPresenceResponse {
  present: CollabPresenceMember[];
}

/** POST /api/projects/:id/presence/heartbeat request body. */
export interface CollabPresenceHeartbeatRequest {
  memberId: string;
  name?: string;
  role?: CollabMemberRole;
}

/** POST /api/projects/:id/presence/leave request body. */
export interface CollabPresenceLeaveRequest {
  memberId: string;
}

export interface CollabPresenceLeaveResponse extends OkResponse {
  present: CollabPresenceMember[];
}

/**
 * GET /api/projects/:id/collab/status. `publishedVersion` is the head version
 * members poll to learn when to pull; null before the first publish.
 */
export interface CollabSyncStatusResponse {
  publishedVersion: number | null;
}
