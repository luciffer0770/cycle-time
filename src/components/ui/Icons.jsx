import React from 'react';

// Minimal hand-rolled icon set (stroke-based, no external dep). Inherits
// currentColor so tone classes on the wrapping element drive color.

const Base = ({ children, className = 'w-4 h-4', ...p }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...p}
  >
    {children}
  </svg>
);

export const IconDashboard = (p) => (
  <Base {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="10" width="7" height="11" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
  </Base>
);

export const IconBuilder = (p) => (
  <Base {...p}>
    <path d="M4 6h10" />
    <circle cx="17" cy="6" r="2" />
    <path d="M4 12h6" />
    <circle cx="13" cy="12" r="2" />
    <path d="M4 18h12" />
    <circle cx="19" cy="18" r="2" />
  </Base>
);

export const IconGantt = (p) => (
  <Base {...p}>
    <rect x="3" y="5" width="10" height="3" rx="1" />
    <rect x="8" y="10" width="10" height="3" rx="1" />
    <rect x="5" y="15" width="14" height="3" rx="1" />
    <path d="M3 3v18" opacity="0.5" />
  </Base>
);

export const IconAnalytics = (p) => (
  <Base {...p}>
    <path d="M3 20h18" />
    <path d="M6 16l4-6 3 4 5-8" />
    <circle cx="6" cy="16" r="1.2" />
    <circle cx="10" cy="10" r="1.2" />
    <circle cx="13" cy="14" r="1.2" />
    <circle cx="18" cy="6" r="1.2" />
  </Base>
);

export const IconSimulation = (p) => (
  <Base {...p}>
    <circle cx="7" cy="9" r="2.5" />
    <circle cx="17" cy="15" r="2.5" />
    <path d="M4 9h1M9 9h11M4 15h11M20 15h1" />
  </Base>
);

export const IconReport = (p) => (
  <Base {...p}>
    <path d="M6 3h9l4 4v14a0 0 0 0 1 0 0H6z" />
    <path d="M14 3v5h5" />
    <path d="M9 14h6M9 17h4" />
  </Base>
);

export const IconSettings = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.8a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.5a7 7 0 0 0-2 1.2L5 6l-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.8a7 7 0 0 0 2 1.2L10 21h4l.6-2.5a7 7 0 0 0 2-1.2l2.3.8 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z" />
  </Base>
);

export const IconAlert = (p) => (
  <Base {...p}>
    <path d="M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v5" />
    <circle cx="12" cy="17.5" r="0.9" fill="currentColor" />
  </Base>
);

export const IconBolt = (p) => (
  <Base {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
  </Base>
);

export const IconClock = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Base>
);

export const IconTarget = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" />
  </Base>
);

export const IconPlus = (p) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconTrash = (p) => (
  <Base {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M6 6l1 14h10l1-14" />
  </Base>
);

export const IconCopy = (p) => (
  <Base {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Base>
);

export const IconUpload = (p) => (
  <Base {...p}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M5 20h14" />
  </Base>
);

export const IconDownload = (p) => (
  <Base {...p}>
    <path d="M12 4v12" />
    <path d="m17 11-5 5-5-5" />
    <path d="M5 20h14" />
  </Base>
);

export const IconPlay = (p) => (
  <Base {...p}>
    <path d="M7 5v14l11-7z" />
  </Base>
);

export const IconSave = (p) => (
  <Base {...p}>
    <path d="M5 3h11l3 3v15H5z" />
    <path d="M7 3v5h9V3" />
    <path d="M7 14h10" />
  </Base>
);

export const IconSparkles = (p) => (
  <Base {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />
  </Base>
);

export const IconLink = (p) => (
  <Base {...p}>
    <path d="M10 14a5 5 0 0 1 0-7l2-2a5 5 0 0 1 7 7l-1 1" />
    <path d="M14 10a5 5 0 0 1 0 7l-2 2a5 5 0 0 1-7-7l1-1" />
  </Base>
);

export const IconBox = (p) => (
  <Base {...p}>
    <path d="m3 7 9-4 9 4v10l-9 4-9-4z" />
    <path d="M3 7l9 4 9-4" />
    <path d="M12 11v10" />
  </Base>
);

export const IconLayers = (p) => (
  <Base {...p}>
    <path d="m12 3 9 5-9 5-9-5z" />
    <path d="m3 13 9 5 9-5" />
    <path d="m3 18 9 5 9-5" />
  </Base>
);

export const IconSearch = (p) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Base>
);

export const IconCheck = (p) => (
  <Base {...p}>
    <path d="m5 12 5 5 9-10" />
  </Base>
);

export const IconRefresh = (p) => (
  <Base {...p}>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </Base>
);

export const IconArrowRight = (p) => (
  <Base {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Base>
);

export const IconGrip = (p) => (
  <Base {...p}>
    <circle cx="9" cy="6" r="1" fill="currentColor" />
    <circle cx="15" cy="6" r="1" fill="currentColor" />
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    <circle cx="9" cy="18" r="1" fill="currentColor" />
    <circle cx="15" cy="18" r="1" fill="currentColor" />
  </Base>
);

export const IconFlag = (p) => (
  <Base {...p}>
    <path d="M5 21V4l14 3-3 4 3 4H5" />
  </Base>
);

export const IconBeaker = (p) => (
  <Base {...p}>
    <path d="M9 3h6" />
    <path d="M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" />
    <path d="M8 15h8" />
  </Base>
);
