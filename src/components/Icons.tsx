import type { ReactNode, SVGProps } from "react";

function Svg({ children, ...rest }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const SearchIcon = () => (
  <Svg>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Svg>
);
export const SwapIcon = () => (
  <Svg>
    <path d="M4 8h14l-4-4" />
    <path d="M20 16H6l4 4" />
  </Svg>
);
export const CopyIcon = () => (
  <Svg>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a1 1 0 0 1 1-1h10" />
  </Svg>
);
export const CheckIcon = () => (
  <Svg>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const SunIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5" />
  </Svg>
);
export const MoonIcon = () => (
  <Svg>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
  </Svg>
);
export const ChevronDown = () => (
  <Svg>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);
export const ChevronRight = () => (
  <Svg>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
export const CloseIcon = () => (
  <Svg>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const ResetIcon = () => (
  <Svg>
    <path d="M4 12a8 8 0 1 0 3-6.2" />
    <path d="M4 4v5h5" />
  </Svg>
);
export const PinIcon = () => (
  <Svg>
    <path d="M9 3h6l-1 6 3 3H7l3-3z" />
    <path d="M12 12v8" />
  </Svg>
);
