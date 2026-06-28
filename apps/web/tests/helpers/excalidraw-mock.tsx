import { useEffect, type ReactNode } from 'react';

interface ExcalidrawApi {
  getSceneElementsIncludingDeleted: () => unknown[];
  getAppState: () => Record<string, unknown>;
  getFiles: () => Record<string, unknown>;
}

interface ExcalidrawMockProps {
  children?: ReactNode;
  excalidrawAPI?: (api: ExcalidrawApi) => void;
  initialData?: {
    elements?: unknown[];
    appState?: Record<string, unknown>;
    files?: Record<string, unknown>;
  };
  langCode?: string;
  renderTopRightUI?: (isMobile: boolean, appState: Record<string, unknown>) => ReactNode;
  theme?: string;
}

export function Excalidraw({
  children,
  excalidrawAPI,
  initialData,
  langCode,
  renderTopRightUI,
  theme,
}: ExcalidrawMockProps) {
  useEffect(() => {
    excalidrawAPI?.({
      getSceneElementsIncludingDeleted: () => initialData?.elements ?? [],
      getAppState: () => initialData?.appState ?? {},
      getFiles: () => initialData?.files ?? {},
    });
  }, [excalidrawAPI, initialData]);

  return (
    <div data-testid="excalidraw" data-lang={langCode ?? ''} data-theme={theme ?? ''}>
      <canvas />
      {renderTopRightUI?.(false, {})}
      {children}
    </div>
  );
}

export const MainMenu = Object.assign(
  ({ children }: { children?: ReactNode }) => (
    <div data-testid="excalidraw-main-menu">{children}</div>
  ),
  {
    DefaultItems: {
      SearchMenu: () => null,
      Help: () => null,
      ClearCanvas: () => null,
      ChangeCanvasBackground: () => null,
    },
    Separator: () => null,
  },
);

export function convertToExcalidrawElements(elements: unknown[]) {
  return elements.map((element, index) => ({
    id: `mock-element-${index}`,
    isDeleted: false,
    ...(typeof element === 'object' && element !== null ? element : {}),
  }));
}

export function restore(data: {
  elements?: unknown[];
  appState?: Record<string, unknown> | null;
  files?: Record<string, unknown>;
} | null) {
  return {
    elements: data?.elements ?? [],
    appState: data?.appState ?? {},
    files: data?.files ?? {},
  };
}

export async function exportToSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('data-preview', 'excalidraw');
  return svg;
}

export async function exportToBlob() {
  return new Blob(['mock image'], { type: 'image/png' });
}
