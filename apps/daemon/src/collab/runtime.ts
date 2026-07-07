// Team-collab (C lane) daemon subsystem: bundles the author-side publish
// scheduler and the presence tracker behind one factory so the server wires
// them once. The resource hub itself is E's (沅锡) — this holds only C's
// trigger + presence, talking to the hub through ResourcePublishAdapter.

import {
  CollabPresenceTracker,
  type CollabPresenceTrackerOptions,
  type PresenceMember,
} from './presence-tracker.js';
import {
  CollabPublishScheduler,
  type CollabPublishSchedulerOptions,
  type ResourcePublishAdapter,
} from './publish-scheduler.js';
import { createStubResourcePublishAdapter } from './stub-resource-adapter.js';
import {
  createDevWorkspaceContextProvider,
  type WorkspaceContextProvider,
} from './workspace-context.js';

export interface CollabRuntime {
  presence: CollabPresenceTracker;
  scheduler: CollabPublishScheduler;
  /** Workspace-context provider — the B-integration seam (identity/visibility). */
  workspaceContext: WorkspaceContextProvider;
  /** Last published version for a project (members poll this to know what to pull). */
  publishedVersion(projectId: string): number | null;
  dispose(): void;
}

export interface CreateCollabRuntimeOptions {
  /** Resource hub client. Defaults to the local stub until E's client ships. */
  adapter?: ResourcePublishAdapter;
  /** Workspace-context provider. Defaults to the dev provider until B's client ships. */
  workspaceContext?: WorkspaceContextProvider;
  /** Fired after a project is published so the caller can notify online members. */
  onPublished?: (result: { projectId: string; version: number; reason: string }) => void;
  /** Fired when a project's presence set changes (join/leave). */
  onPresenceChange?: (result: { projectId: string; present: PresenceMember[] }) => void;
  onError?: (result: { projectId: string; error: unknown }) => void;
}

export function createCollabRuntime(options: CreateCollabRuntimeOptions = {}): CollabRuntime {
  const adapter = options.adapter ?? createStubResourcePublishAdapter();
  const published = new Map<string, number>();
  // Always track the published head so members can poll it; also forward to any
  // caller-supplied onPublished. (exactOptionalPropertyTypes forbids assigning an
  // explicit `undefined` to an optional property, hence the conditional onError.)
  const schedulerOptions: CollabPublishSchedulerOptions = {
    adapter,
    onPublished: (result) => {
      published.set(result.projectId, result.version);
      options.onPublished?.(result);
    },
  };
  if (options.onError) schedulerOptions.onError = options.onError;
  const scheduler = new CollabPublishScheduler(schedulerOptions);
  const presenceOptions: CollabPresenceTrackerOptions = {};
  if (options.onPresenceChange) presenceOptions.onChange = options.onPresenceChange;
  const presence = new CollabPresenceTracker(presenceOptions);
  const workspaceContext = options.workspaceContext ?? createDevWorkspaceContextProvider();
  return {
    presence,
    scheduler,
    workspaceContext,
    publishedVersion: (projectId) => published.get(projectId) ?? null,
    dispose() {
      scheduler.dispose();
      presence.dispose();
    },
  };
}
