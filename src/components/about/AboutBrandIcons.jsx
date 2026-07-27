/** Custom Tiffany line icons for About page — matches DESIGN.md accent */

const ICON_PROPS = {
  width: 28,
  height: 28,
  viewBox: '0 0 28 28',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
};

function IconShell({ children }) {
  return <svg {...ICON_PROPS}>{children}</svg>;
}

export function AboutIconShield() {
  return (
    <IconShell>
      <path
        d="M14 3L5 7v6.5c0 5.25 3.9 10.15 9 11.5 5.1-1.35 9-6.25 9-11.5V7l-9-4Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path d="M10 14l2.5 2.5L18 11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </IconShell>
  );
}

export function AboutIconZap() {
  return (
    <IconShell>
      <path
        d="M15.5 3 9 15h5.5L12.5 25 19 13h-5.5L15.5 3Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </IconShell>
  );
}

export function AboutIconGlobe() {
  return (
    <IconShell>
      <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 14h20M14 4c2.5 2.8 4 6.2 4 10s-1.5 7.2-4 10M14 4c-2.5 2.8-4 6.2-4 10s1.5 7.2 4 10" stroke="currentColor" strokeWidth="1.75" />
    </IconShell>
  );
}

export function AboutIconSpark() {
  return (
    <IconShell>
      <path d="M14 4v4M14 20v4M4 14h4M20 14h4M7.05 7.05l2.83 2.83M18.12 18.12l2.83 2.83M7.05 20.95l2.83-2.83M18.12 9.88l2.83-2.83" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="14" cy="14" r="3.5" stroke="currentColor" strokeWidth="1.75" />
    </IconShell>
  );
}

export function AboutIconSupport() {
  return (
    <IconShell>
      <path d="M6 12v3a2 2 0 0 0 2 2h1.5l2.5 3v-9H8a2 2 0 0 1-2-2v-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M22 12v3a2 2 0 0 1-2 2h-1.5l-2.5 3v-9H20a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </IconShell>
  );
}

export function AboutIconChart() {
  return (
    <IconShell>
      <path d="M5 23V11M11 23V7M17 23v-8M23 23V5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </IconShell>
  );
}

export function AboutIconAuction() {
  return (
    <IconShell>
      <path d="M8 21h12M10 17h8l-6-9 3-4 3 4-6 9Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M6 21h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </IconShell>
  );
}

export function AboutIconBuyNow() {
  return (
    <IconShell>
      <path d="M5 12h18M14 5v14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <rect x="6" y="8" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
    </IconShell>
  );
}

export function AboutIconShares() {
  return (
    <IconShell>
      <circle cx="9" cy="9" r="4" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="19" cy="9" r="4" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="14" cy="19" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path d="M12 11.5 11 16M16 11.5l1 4.5M11.5 12h5" stroke="currentColor" strokeWidth="1.5" />
    </IconShell>
  );
}

export function AboutIconDebts() {
  return (
    <IconShell>
      <rect x="6" y="5" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 10h8M10 14h8M10 18h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </IconShell>
  );
}

export function AboutIconAi() {
  return (
    <IconShell>
      <rect x="5" y="7" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M10 14h8M10 17h5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="11" cy="11" r="1" fill="currentColor" />
      <circle cx="17" cy="11" r="1" fill="currentColor" />
    </IconShell>
  );
}

export function AboutIconMap() {
  return (
    <IconShell>
      <path d="M10 6 4 8.5v14l6-2.5 6 2.5 6-2.5V6l-6 2.5-6-2.5Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M10 6v14M16 8.5v14" stroke="currentColor" strokeWidth="1.75" />
    </IconShell>
  );
}

export function AboutIconDocs() {
  return (
    <IconShell>
      <path d="M9 4h7l5 5v15H9V4Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M16 4v5h5M12 14h8M12 18h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </IconShell>
  );
}

export function AboutIconWallet() {
  return (
    <IconShell>
      <rect x="4" y="8" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M4 12h20M19 16h2" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </IconShell>
  );
}

export function AboutIconVip() {
  return (
    <IconShell>
      <path d="M14 4l2.2 5.5H22l-4.5 3.5 1.7 5.5L14 15.8 10.8 18.5l1.7-5.5L8 9.5h5.8L14 4Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </IconShell>
  );
}

export const ABOUT_ADVANTAGE_ICONS = [
  AboutIconShield,
  AboutIconZap,
  AboutIconGlobe,
  AboutIconSpark,
  AboutIconSupport,
  AboutIconChart,
];

export const ABOUT_TYPE_ICONS = [
  AboutIconAuction,
  AboutIconBuyNow,
  AboutIconShares,
  AboutIconDebts,
];

export const ABOUT_SERVICE_ICONS = [
  AboutIconAi,
  AboutIconMap,
  AboutIconAuction,
  AboutIconDocs,
  AboutIconWallet,
  AboutIconVip,
];
