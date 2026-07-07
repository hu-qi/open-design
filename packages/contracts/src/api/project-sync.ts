// Cross-lane project-sync contract, owned by the C (团队协作 / OPEND-444) lane.
//
// Ownership split (agreed with D 席瑞 and E 韩沅锡):
//   - C owns `ProjectSyncState`, the sync-intent event contract, the trigger
//     orchestration, comments, and presence.
//   - D owns project visibility and emits `project_team_share_requested` to C's
//     orchestration seam when a project flips to team-visible. D exposes
//     `ProjectSyncState` on its read model but does not own it.
//   - E owns the actual mechanism (upload / blob / version / mirror / pull);
//     it sits behind C's orchestration, D never calls E directly.
//
// This file exists so D and E can consume the C-owned types without waiting on
// the rest of the C implementation branch. Keep it dependency-free.

/**
 * The sync state of a project's content, from the actor's point of view.
 * D surfaces this on its project read model; C is the source of truth for it.
 *
 * - `local_only`     — personal / not shared; never uploaded.
 * - `pending_upload` — a team-share was requested; upload not yet confirmed
 *                      visible to other members (see `SPIKE-SYNC-1`).
 * - `synced`         — the published head is uploaded and members can pull it.
 * - `sync_failed`    — the last publish attempt failed; the prior head stands.
 */
export type ProjectSyncState = 'local_only' | 'pending_upload' | 'synced' | 'sync_failed';

/**
 * The sync-intent events D emits to C's orchestration seam. C reacts by
 * triggering the publish (which then drives E's resource mechanism).
 *
 * - `project_visibility_changed`    — visibility flipped in either direction.
 * - `project_team_share_requested`  — a project became team-visible; C should
 *                                     publish its content so members can pull.
 */
export type ProjectSyncIntentEvent = 'project_visibility_changed' | 'project_team_share_requested';

/**
 * Payload D sends to C's orchestration seam. C owns the reaction; D owns the
 * visibility truth that produced the event.
 */
export interface ProjectSyncIntent {
  event: ProjectSyncIntentEvent;
  projectId: string;
  /** The (team) workspace the visibility transition happened in. */
  workspaceId?: string;
}
