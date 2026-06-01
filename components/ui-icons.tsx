import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function BaseIcon({ size = 16, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function LightbulbIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M8.5 14.5c-1.2-1-2-2.5-2-4.2A5.5 5.5 0 0 1 12 4.8a5.5 5.5 0 0 1 5.5 5.5c0 1.7-.8 3.2-2 4.2-.7.6-1.1 1.4-1.2 2.3H9.7c-.1-.9-.5-1.7-1.2-2.3Z" />
    </BaseIcon>
  );
}

export function VolumeIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 10v4h4l5 4V6l-5 4H4Z" />
      <path d="M16 9.5a4 4 0 0 1 0 5" />
      <path d="M18.5 7a7.5 7.5 0 0 1 0 10" />
    </BaseIcon>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      <path d="M9 21h6" />
    </BaseIcon>
  );
}

export function KeyboardIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M7 10h.01" />
      <path d="M11 10h.01" />
      <path d="M15 10h.01" />
      <path d="M18 10h.01" />
      <path d="M7 14h10" />
    </BaseIcon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </BaseIcon>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </BaseIcon>
  );
}

export function BookmarkIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </BaseIcon>
  );
}

export function TrashIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </BaseIcon>
  );
}

export function TranslateIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 5h8" />
      <path d="M8 5v2" />
      <path d="M6 11c1.8-1 3.1-2.7 3.8-5" />
      <path d="M5.5 9.5c1 1.3 2.3 2.3 3.8 3" />
      <path d="M14 15h6" />
      <path d="M17 12v6" />
      <path d="m13.5 20 3.5-8 3.5 8" />
    </BaseIcon>
  );
}
