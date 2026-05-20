import type { SVGProps } from 'react';
import { ICONS, type IconName } from './iconRegistry';

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
  return (
    <Svg
      width={size}
      height={size}
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
      focusable={false}
      {...rest}
    />
  );
}
