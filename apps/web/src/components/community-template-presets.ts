import type { ProjectMetadata } from '../types';

export type CommunityTemplatePreset = {
  id: string;
  projectName: string;
  prompt: string;
  metadata: ProjectMetadata & { demoPresetId: string };
  html: string;
};

// Human titles for the remixable community cards, kept in sync with
// COMMUNITY_TEMPLATES in CommunityView.tsx. The resolver names each remixed
// project from this map so every Remix opens a distinct starter that matches
// the card the user clicked — no card ever remaps onto a differently-named
// template.
const COMMUNITY_TEMPLATE_TITLES: Record<string, string> = {
  'electric-studio': 'Open Design Landing',
  'launch-landing': 'Kanban Board',
  'founder-memo': 'Social Carousel',
  'growth-dashboard': 'Blog Post',
  'portfolio-case-study': 'Pitch Deck',
  'design-system-docs': 'Design System Slides',
  'ai-product-site': 'Wireframe Sketch',
  'commerce-home': 'Wireframe Greybox',
  'mobile-app-launch': 'Mobile Flow',
  'fintech-dashboard': 'Analytics Console',
  'healthcare-intake': 'Intake Prototype',
  'developer-docs': 'API Docs',
  'pricing-test': 'Pricing Experiment',
  'admin-console': 'Admin Console',
  'education-course': 'Course Landing',
  'restaurant-booking': 'Booking Flow',
  'real-estate-listing': 'Listing Page',
  'support-center': 'Support Center',
  'roadmap-board': 'Scene Timeline',
  'app-settings': 'Interactive Story',
};

function titleCaseTemplateId(templateId: string): string {
  return templateId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function genericTemplateHtml(title: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0b0b0f; color:#f8fafc; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    main { width:min(760px,88vw); padding:56px; border-radius:24px; background:linear-gradient(160deg,#151521,#0f0f17); box-shadow:0 24px 80px rgba(0,0,0,.4); }
    .eyebrow { color:#818cf8; font-size:12px; font-weight:800; letter-spacing:.32em; text-transform:uppercase; }
    h1 { margin:14px 0 0; font-size:44px; line-height:1.05; letter-spacing:-.03em; }
    p { margin:16px 0 0; max-width:52ch; color:#a1a1aa; line-height:1.6; }
  </style>
</head>
<body>
  <main>
    <div class="eyebrow">Community remix</div>
    <h1>${title}</h1>
    <p>Editable starter remixed from the Community gallery. Replace this canvas with your own layout and content.</p>
  </main>
</body>
</html>`;
}

// Resolve a community template id to a remixable project preset. Every id
// generates its own distinct project named after the card, so Remix never
// opens a different template than the card the user clicked.
export function resolveCommunityTemplatePreset(templateId: string): CommunityTemplatePreset {
  const projectName = COMMUNITY_TEMPLATE_TITLES[templateId] ?? titleCaseTemplateId(templateId);
  return {
    id: templateId,
    projectName,
    prompt: `Template remix: open ${projectName} as editable project files, without starting a chat.`,
    metadata: {
      kind: 'prototype',
      entryFile: 'index.html',
      nameSource: 'user',
      demoPresetId: templateId,
    },
    html: genericTemplateHtml(projectName),
  };
}
