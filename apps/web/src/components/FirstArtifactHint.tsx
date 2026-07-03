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
// appears in Studio (spec §8.3). The once-ever budget is spent when the USER
// dismisses it — not on show — so parent-gate flicker (a transient files
// refresh or streaming blip unmounting and remounting this component) can't
// silently burn the hint before anyone reads it. Remounts before dismissal
// simply show it again, which matches the spec: visible until closed or used.
// Kept deliberately small and non-modal so it never stacks as a second guide
// against the post-turn NextStepActions card (spec §8.5: one main guide at a
// time) — it sits in the preview corner while NextStepActions lives in the
// chat.
export function FirstArtifactHint() {
  const t = useT();
  const analytics = useAnalytics();
  const [visible, setVisible] = useState(() => !hasSeenFirstArtifactHint());
  const firedRef = useRef(false);

  useEffect(() => {
    if (!visible || firedRef.current) return;
    firedRef.current = true;
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
    // Spend the once-ever budget on the user's own close action.
    markFirstArtifactHintSeen();
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
