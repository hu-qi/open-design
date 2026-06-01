import type {
  TrackingRunFailureCategory,
  TrackingRunFailureStage,
  TrackingRunFailureUserAction,
} from '@open-design/contracts/analytics';

import { classifyAmrAccountFailure } from './integrations/vela-errors.js';
import { classifyAgentServiceFailure } from './runtimes/auth.js';
import type { RunResult, RunStatusForAnalytics } from './run-result.js';

export interface RunEventForFailureClassification {
  event: string;
  data: unknown;
}

export interface RunFailureClassificationInput {
  result: RunResult;
  status: RunStatusForAnalytics & {
    error?: string | null;
  };
  errorCode?: string;
  agentId?: string | null;
  events?: RunEventForFailureClassification[];
}

export interface RunFailureClassification {
  failure_category: TrackingRunFailureCategory;
  failure_stage: TrackingRunFailureStage;
  retryable: boolean;
  user_action: TrackingRunFailureUserAction;
}

function normalizeCode(value: string | undefined | null): string {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readBool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function eventErrorText(data: unknown): string[] {
  const payload = data && typeof data === 'object'
    ? data as Record<string, unknown>
    : {};
  const nested = payload.error && typeof payload.error === 'object'
    ? payload.error as Record<string, unknown>
    : {};
  return [
    readString(payload.message),
    readString(payload.code),
    readString(nested.message),
    readString(nested.code),
  ].filter((value): value is string => Boolean(value));
}

function latestRetryable(
  events: RunEventForFailureClassification[] = [],
): boolean | undefined {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const data = events[i]?.data;
    const payload = data && typeof data === 'object'
      ? data as Record<string, unknown>
      : {};
    const nested = payload.error && typeof payload.error === 'object'
      ? payload.error as Record<string, unknown>
      : {};
    const retryable = readBool(payload.retryable) ?? readBool(nested.retryable);
    if (retryable !== undefined) return retryable;
  }
  return undefined;
}

function collectFailureText(input: RunFailureClassificationInput): string {
  const parts: string[] = [];
  const statusError = readString(input.status.error);
  if (statusError) parts.push(statusError);
  const code = normalizeCode(input.errorCode ?? input.status.errorCode);
  if (code) parts.push(code);
  const events = input.events ?? [];
  for (let i = events.length - 1; i >= 0 && parts.length < 24; i -= 1) {
    const rec = events[i]!;
    if (rec.event === 'error' || rec.event === 'agent') {
      parts.push(...eventErrorText(rec.data));
    }
  }
  return parts.join('\n');
}

function isHardQuotaText(text: string): boolean {
  return /\b(session limit|usage limit|limit reached|quota|billing (?:hard )?limit|insufficient[ _-]?(?:quota|credit|funds)|exceeded your current quota)\b/i
    .test(text);
}

function isTimeoutText(text: string): boolean {
  return /\b(timed?\s*out|timeout|inactivity|stalled|hung|no new output|without emitting any new output)\b/i
    .test(text);
}

function isEmptyOutputText(text: string): boolean {
  return /\b(empty response|empty output|without producing any output|no visible output|returned an empty response)\b/i
    .test(text);
}

function isToolErrorText(text: string): boolean {
  return /\b(tool|mcp|connector)\b/i.test(text) &&
    /\b(error|failed|failure)\b/i.test(text);
}

function classification(
  failure_category: TrackingRunFailureCategory,
  failure_stage: TrackingRunFailureStage,
  retryable: boolean,
  user_action: TrackingRunFailureUserAction,
): RunFailureClassification {
  return { failure_category, failure_stage, retryable, user_action };
}

export function classifyRunFailure(
  input: RunFailureClassificationInput,
): RunFailureClassification | undefined {
  if (input.result === 'success') return undefined;
  if (input.result === 'cancelled') {
    return classification('user_cancel', 'finalize', false, 'none');
  }

  const errorCode = normalizeCode(input.errorCode ?? input.status.errorCode);
  const text = collectFailureText(input);
  const retryableHint = latestRetryable(input.events);
  const amrFailure = classifyAmrAccountFailure(text);

  if (
    errorCode === 'AMR_INSUFFICIENT_BALANCE' ||
    amrFailure?.code === 'AMR_INSUFFICIENT_BALANCE'
  ) {
    return classification('insufficient_balance', 'session_init', false, 'recharge');
  }

  if (
    errorCode === 'AMR_AUTH_REQUIRED' ||
    errorCode === 'AGENT_AUTH_REQUIRED' ||
    errorCode === 'UNAUTHORIZED' ||
    amrFailure?.code === 'AMR_AUTH_REQUIRED'
  ) {
    return classification('auth', 'session_init', false, 'login');
  }

  if (errorCode === 'AGENT_PROMPT_TOO_LARGE') {
    return classification(
      'prompt_too_large',
      'prompt_send',
      false,
      'reduce_context',
    );
  }

  if (
    errorCode === 'AMR_MODEL_UNAVAILABLE' ||
    /model (?:is )?(?:unavailable|not available|unsupported|not found)/i.test(text)
  ) {
    return classification(
      'model_unavailable',
      'model_select',
      false,
      'switch_model',
    );
  }

  if (errorCode === 'AGENT_UNAVAILABLE') {
    return classification('process_exit', 'spawn', false, 'install_cli');
  }

  const serviceFailure = classifyAgentServiceFailure(text);
  if (serviceFailure === 'AGENT_AUTH_REQUIRED') {
    return classification('auth', 'session_init', false, 'login');
  }

  if (errorCode === 'RATE_LIMITED' || serviceFailure === 'RATE_LIMITED') {
    const retryable = retryableHint ?? !isHardQuotaText(text);
    return classification(
      'rate_limit',
      'session_init',
      retryable,
      retryable ? 'retry' : 'none',
    );
  }

  if (
    errorCode === 'UPSTREAM_UNAVAILABLE' ||
    serviceFailure === 'UPSTREAM_UNAVAILABLE'
  ) {
    return classification(
      'upstream_unavailable',
      'first_token_wait',
      retryableHint ?? true,
      'retry',
    );
  }

  if (isEmptyOutputText(text)) {
    return classification('empty_output', 'first_token_wait', retryableHint ?? true, 'retry');
  }

  if (
    isTimeoutText(text) ||
    errorCode === 'TIMEOUT' ||
    errorCode.startsWith('AGENT_SIGNAL_')
  ) {
    return classification(
      'timeout',
      'first_token_wait',
      retryableHint ?? true,
      'retry',
    );
  }

  if (isToolErrorText(text)) {
    return classification(
      'tool_error',
      'tool_execution',
      retryableHint ?? false,
      retryableHint ? 'retry' : 'none',
    );
  }

  if (
    errorCode.startsWith('AGENT_EXIT_') ||
    errorCode === 'AGENT_TERMINATED_UNKNOWN' ||
    errorCode === 'AGENT_EXECUTION_FAILED'
  ) {
    return classification(
      'process_exit',
      'child_close',
      retryableHint ?? false,
      retryableHint ? 'retry' : 'none',
    );
  }

  return classification(
    'unknown',
    'finalize',
    retryableHint ?? false,
    retryableHint ? 'retry' : 'none',
  );
}
