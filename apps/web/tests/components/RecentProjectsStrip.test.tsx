// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RecentProjectsStrip } from '../../src/components/RecentProjectsStrip';
import type { Project } from '../../src/types';

vi.mock('../../src/providers/registry', () => ({
  fetchProjectFileText: vi.fn(async (projectId: string, name: string) => {
    if (projectId === 'project-ds' && name === 'brand.json') {
      return JSON.stringify({
        logo: { primary: 'logos/favicon-1.png' },
        imagery: { samples: [{ file: 'imagery/cover-0.png', kind: 'cover' }] },
      });
    }
    if (projectId === 'project-ds-fallback' && name === 'brand.json') {
      return JSON.stringify({
        logo: {
          primary: 'logos/favicon-1.png',
          alternates: ['logos/wordmark.svg'],
        },
      });
    }
    return null;
  }),
  fetchProjectFiles: vi.fn(async (projectId: string) => {
    if (projectId === 'project-ds') {
      return [
        { name: 'favicon-1.png', path: 'logos/favicon-1.png', kind: 'image', mtime: 4 },
        { name: 'cover-0.png', path: 'imagery/cover-0.png', kind: 'image', mtime: 3 },
      ];
    }
    if (projectId === 'project-ds-fallback') {
      return [
        { name: 'favicon-1.png', path: 'logos/favicon-1.png', kind: 'image', mtime: 4 },
        { name: 'wordmark.svg', path: 'logos/wordmark.svg', kind: 'image', mtime: 3 },
      ];
    }
    if (projectId === 'project-html') {
      return [{ name: 'index.html', kind: 'html', mtime: 2 }];
    }
    if (projectId === 'project-deck') {
      return [{ name: 'index.html', kind: 'html', mtime: 2 }];
    }
    return [];
  }),
  projectFileUrl: (projectId: string, fileName: string) =>
    `/api/projects/${projectId}/files/${fileName}`,
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function project(overrides: Partial<Project>): Project {
  return {
    id: 'project-1',
    name: 'Project',
    skillId: null,
    designSystemId: null,
    createdAt: 1,
    updatedAt: 2,
    status: { value: 'not_started' },
    ...overrides,
  };
}

function projects(count: number): Project[] {
  return Array.from({ length: count }, (_, index) =>
    project({
      id: `project-${index + 1}`,
      name: `Project ${index + 1}`,
      updatedAt: count - index,
    }),
  );
}

describe('RecentProjectsStrip', () => {
  it('keeps six projects when the row is below the wide-card threshold', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect(this: HTMLElement) {
      return {
        x: 0,
        y: 0,
        width: this.classList.contains('recent-projects__row') ? 1331 : 180,
        height: 100,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        toJSON: () => ({}),
      };
    });

    const { container } = render(
      <RecentProjectsStrip
        projects={projects(8)}
        onOpen={() => {}}
        onViewAll={() => {}}
      />,
    );

    expect(container.querySelectorAll('.recent-projects__card')).toHaveLength(6);
  });

  it('renders only the real projects by default and pads only when demo-seeded', () => {
    const { container, rerender } = render(
      <RecentProjectsStrip projects={projects(2)} onOpen={() => {}} onViewAll={() => {}} />,
    );
    // No demo seeding: exactly the two daemon-backed projects, no phantom rows
    // that rename/delete/open could act on.
    expect(container.querySelectorAll('.recent-projects__card')).toHaveLength(2);
    expect(container.querySelector('[data-project-id^="demo-"]')).toBeNull();

    rerender(
      <RecentProjectsStrip projects={projects(2)} seedDemoContent onOpen={() => {}} onViewAll={() => {}} />,
    );
    // Demo seeding pads the short list up to the limit for a full review grid.
    expect(container.querySelectorAll('.recent-projects__card').length).toBeGreaterThan(2);
  });

  it('keeps a project card when its bulk delete fails', async () => {
    // Backend delete returned false → the project still exists on disk, so the
    // card must NOT be optimistically removed (it would otherwise reappear on
    // the next refresh and read as data loss).
    const onDelete = vi.fn(async () => false);
    render(
      <RecentProjectsStrip
        projects={projects(2)}
        space="drafts"
        onOpen={() => {}}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '多选' }));
    fireEvent.click(screen.getByLabelText('选择 Project 1'));
    fireEvent.click(screen.getByRole('button', { name: /批量删除/ }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('project-1'));
    expect(screen.getByText('Project 1')).toBeTruthy();
  });

  it('remeasures when projects arrive after the initial empty render', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1400,
    });

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect(this: HTMLElement) {
      return {
        x: 0,
        y: 0,
        width: this.classList.contains('recent-projects__row') ? 1331 : 180,
        height: 100,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        toJSON: () => ({}),
      };
    });

    const { container, rerender } = render(
      <RecentProjectsStrip
        projects={[]}
        onOpen={() => {}}
        onViewAll={() => {}}
      />,
    );

    rerender(
      <RecentProjectsStrip
        projects={projects(8)}
        onOpen={() => {}}
        onViewAll={() => {}}
      />,
    );

    expect(container.querySelectorAll('.recent-projects__card')).toHaveLength(6);
  });

  it('matches project cards with previews and design-system tags', async () => {
    const { container } = render(
      <RecentProjectsStrip
        projects={[
          project({
            id: 'project-ds',
            name: 'Acme Design System',
            updatedAt: 4,
            metadata: {
              kind: 'other',
              importedFrom: 'design-system',
            },
          }),
          project({
            id: 'project-html',
            name: 'Web Prototype',
            updatedAt: 3,
          }),
        ]}
        onOpen={() => {}}
        onViewAll={() => {}}
      />,
    );

    expect(screen.getByText('Design System')).toBeTruthy();
    expect(screen.getAllByText('Prototype').length).toBeGreaterThan(0);
    const designSystemCard = container.querySelector('.recent-projects__card.is-design-system-project');
    expect(designSystemCard).toBeTruthy();
    expect(designSystemCard?.querySelectorAll('.design-card-tag')).toHaveLength(1);

    await waitFor(() => {
      expect(designSystemCard?.querySelector('.recent-projects__card-thumb-image img')).toBeTruthy();
      expect(designSystemCard?.querySelector('img')?.getAttribute('src')).toBe(
        '/api/projects/project-ds/files/imagery/cover-0.png',
      );
      expect(container.querySelector('.recent-projects__card-thumb-html iframe')).toBeTruthy();
    });
  });

  it('uses non-favicon design-system logo alternates when no cover exists', async () => {
    const { container } = render(
      <RecentProjectsStrip
        projects={[
          project({
            id: 'project-ds-fallback',
            name: 'Acme Design System',
            updatedAt: 4,
            metadata: {
              kind: 'other',
              importedFrom: 'design-system',
            },
          }),
        ]}
        onOpen={() => {}}
        onViewAll={() => {}}
      />,
    );

    const designSystemCard = container.querySelector('.recent-projects__card.is-design-system-project');

    await waitFor(() => {
      expect(designSystemCard?.querySelector('.recent-projects__card-thumb-logo img')).toBeTruthy();
      expect(designSystemCard?.querySelector('img')?.getAttribute('src')).toBe(
        '/api/projects/project-ds-fallback/files/logos/wordmark.svg',
      );
    });
  });

  it('renders deck project covers without deck navigation controls', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => `
          <!doctype html>
          <html>
            <head><title>Deck</title></head>
            <body>
              <section class="slide active">First slide</section>
              <section class="slide">Second slide</section>
              <div class="deck-counter"><button id="deck-prev">‹</button><span>1 / 10</span><button id="deck-next">›</button></div>
              <nav class="page-flip-controls" aria-label="Pagination">01 / 10</nav>
            </body>
          </html>
        `,
      })),
    );

    const { container } = render(
      <RecentProjectsStrip
        projects={[
          project({
            id: 'project-deck',
            name: 'Simple Deck',
            updatedAt: 4,
            metadata: { kind: 'deck' },
          }),
          project({
            id: 'project-html',
            name: 'Web Prototype',
            updatedAt: 3,
          }),
        ]}
        onOpen={() => {}}
        onViewAll={() => {}}
      />,
    );

    const deckCard = container.querySelector('[data-project-id="project-deck"]');
    const htmlCard = container.querySelector('[data-project-id="project-html"]');

    await waitFor(() => {
      const deckIframe = deckCard?.querySelector('iframe') as HTMLIFrameElement | null;
      expect(deckIframe?.getAttribute('srcdoc')).toContain('First slide');
      expect(deckIframe?.getAttribute('srcdoc')).toContain('od-recent-deck-real-preview');
      expect(deckIframe?.getAttribute('srcdoc')).toContain('.page-flip-controls');
      expect(deckIframe?.getAttribute('srcdoc')).toContain('[aria-label="Pagination"]');
      expect(deckIframe?.getAttribute('srcdoc')).not.toContain('<script');
      expect(deckIframe?.getAttribute('src')).toBeNull();
      expect(htmlCard?.querySelector('iframe')?.getAttribute('src')).toBe(
        '/api/projects/project-html/files/index.html',
      );
    });
  });

  it('lets recent design-system cards move out of and back into team space', async () => {
    const { container } = render(
      <RecentProjectsStrip
        projects={[
          project({
            id: 'project-ds',
            name: 'Baidu Design System',
            updatedAt: 4,
            metadata: {
              kind: 'other',
              importedFrom: 'design-system',
            },
          }),
        ]}
        onOpen={() => {}}
        onRename={() => {}}
      />,
    );

    const card = container.querySelector('[data-project-id="project-ds"]');
    expect(card).toBeTruthy();
    expect(card?.textContent).toContain('共享');

    fireEvent.click(card!.querySelector('.recent-projects__card-more') as HTMLButtonElement);
    fireEvent.click(screen.getByRole('menuitem', { name: /移出团队空间/ }));
    expect(screen.getByRole('heading', { name: '移出团队空间' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '确认移出' }));

    expect(card?.textContent).not.toContain('共享');
    fireEvent.click(card!.querySelector('.recent-projects__card-more') as HTMLButtonElement);
    expect(screen.getByRole('menuitem', { name: /转入团队空间/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('menuitem', { name: /转入团队空间/ }));
    expect(screen.getByRole('heading', { name: '转入团队空间' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '确认转入' }));

    expect(card?.textContent).toContain('共享');
  });

  it('hides shared badges in the team projects space', () => {
    const { container } = render(
      <RecentProjectsStrip
        projects={[
          project({
            id: 'project-team',
            name: 'Team Workspace Overview',
            updatedAt: 4,
          }),
        ]}
        space="team"
        onOpen={() => {}}
        onRename={() => {}}
      />,
    );

    const card = container.querySelector('[data-project-id="project-team"]');
    expect(card).toBeTruthy();
    expect(card?.querySelector('.recent-projects__card-badge--shared')).toBeNull();
    expect(card?.textContent).not.toContain('共享');
  });
});
