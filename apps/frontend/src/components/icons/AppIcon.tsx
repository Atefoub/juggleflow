import type { SVGProps } from 'react';
import { ICON_COLOR_CLASS } from './iconBrand';
import { ICONS, type IconName } from './iconRegistry';

function mergeClassNames(...parts: (string | undefined)[]): string | undefined {
  const merged = parts.filter(Boolean).join(' ').trim();
  return merged || undefined;
}

export interface AppIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Taille en px (carré). Défaut 24. */
  size?: number;
  /** Libellé accessible ; si absent, `aria-hidden`. */
  label?: string;
}

export default function AppIcon({
  name,
  size = 24,
  className,
  label,
  ...rest
}: AppIconProps) {
  const Svg = ICONS[name];
  const defaultColor = ICON_COLOR_CLASS[name];
  return (
    <Svg
      width={size}
      height={size}
      className={mergeClassNames(defaultColor, className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable={false}
      {...rest}
    />
  );
}
