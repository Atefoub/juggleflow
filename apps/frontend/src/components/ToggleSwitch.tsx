type ToggleSwitchProps = {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  'aria-label': string;
};

/**
 * Interrupteur pill 44×24px (w-11 h-6) — curseur positionné par `left`, pas par translate,
 * pour éviter que le rond blanc dépasse du track.
 */
export default function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
}: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={[
        'relative h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors duration-200',
        'disabled:opacity-60',
        checked ? 'bg-linear-to-br from-brand to-brand-end' : 'bg-border',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left] duration-200 ease-out',
          checked ? 'left-[1.375rem]' : 'left-0.5',
        ].join(' ')}
      />
    </button>
  );
}
