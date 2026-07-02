import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { useAnalytics } from '../analytics/provider';
import {
  trackStudioOnboardingHintClick,
  trackStudioOnboardingHintSurfaceView,
} from '../analytics/events';
import {
  hasSeenFirstArtifactHint,
  markFirstArtifactHintSeen,
} from '../onboarding/first-artifact-hint';
import { Icon } from './Icon';
import styles from './FirstArtifactHint.module.css';

// One-time, one-line hint shown when a new user's first previewable artifact
// appears in Studio (spec §8.3). Self-contained: it owns its own "seen"
// gating so mounting/unmounting as the parent's eligibility flickers can never
// show it twice. The parent decides *when* it's eligible (a previewable
// artifact exists and the turn has settled); this component decides whether it
// has already been spent. Kept deliberately small and non-modal so it never
// stacks as a second guide against the post-turn NextStepActions card
// (spec §8.5: one main guide at a time) — it sits in the preview corner while
// NextStepActions lives in the chat.
export function FirstArtifactHint() {
  const t = useT();
  const analytics = useAnalytics();
  const [visible, setVisible] = useState(() => !hasSeenFirstArtifactHint());
  const firedRef = useRef(false);

  useEffect(() => {
    if (!visible || firedRef.current) return;
    firedRef.current = true;
    // Spend the one-time budget as soon as it's shown, so a remount can't
    // re-trigger it even before the user dismisses.
    markFirstArtifactHintSeen();
    trackStudioOnboardingHintSurfaceView(analytics.track, {
      page_name: 'chat_panel',
      area: 'onboarding_first_artifact_hint',
      hint_type: 'view_artifact',
    });
  }, [visible, analytics.track]);

  if (!visible) return null;

  function dismiss() {
    trackStudioOnboardingHintClick(analytics.track, {
      page_name: 'chat_panel',
      area: 'onboarding_first_artifact_hint',
      element: 'dismiss',
      hint_type: 'view_artifact',
    });
    setVisible(false);
  }

  return (
    <div className={styles.root} role="status" data-testid="first-artifact-hint">
      <span className={styles.icon} aria-hidden>
        <Icon name="sparkles" size={18} />
      </span>
      <div className={styles.body}>
        <span className={styles.title}>{t('studio.firstArtifactHint.title')}</span>
        <span className={styles.text}>{t('studio.firstArtifactHint.body')}</span>
      </div>
      <button
        type="button"
        className={styles.dismiss}
        onClick={dismiss}
        aria-label={t('studio.firstArtifactHint.dismiss')}
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}
