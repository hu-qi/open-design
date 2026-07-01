// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InviteAcceptanceFlow } from '../../src/components/InviteAcceptanceFlow';
import type { InviteRole } from '../../src/components/DemoControlBar';

afterEach(cleanup);

// Drive the invite flow to completion and return the onJoined spy. Each step
// exposes a single primary action; clicking through them reaches "开始协作",
// which must hand the invited role's scenario back to the host.
function acceptInviteAs(role: InviteRole): ReturnType<typeof vi.fn> {
  const onJoined = vi.fn();
  render(
    <InviteAcceptanceFlow
      open
      role={role}
      onClose={() => {}}
      onJoined={onJoined}
      onDeclined={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: '接受邀请' }));
  fireEvent.click(screen.getByRole('button', { name: '登录并继续' }));
  fireEvent.click(screen.getByRole('button', { name: '确定加入' }));
  fireEvent.click(screen.getByRole('button', { name: '开始协作' }));
  return onJoined;
}

describe('InviteAcceptanceFlow', () => {
  it('lands a viewer join in the viewer scenario', () => {
    // Regression: the host used to ignore the returned scenario and reset to a
    // default owner-like home, so a viewer regained edit/manage affordances.
    expect(acceptInviteAs('viewer')).toHaveBeenCalledWith('invite-viewer');
  });

  it('lands an admin join in the admin scenario', () => {
    expect(acceptInviteAs('admin')).toHaveBeenCalledWith('invite-admin');
  });

  it('lands an editor join in the editor scenario', () => {
    expect(acceptInviteAs('editor')).toHaveBeenCalledWith('invite-editor');
  });
});
