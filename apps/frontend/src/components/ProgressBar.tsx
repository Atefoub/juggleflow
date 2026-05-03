interface ProgressBarProps {
  value: number; // 0-100
  color?: string;
  height?: string;
}

export default function ProgressBar({
  value,
  color = '#8B2BE2',
  height = '6px',
}: ProgressBarProps) {
  return (
    <div
      className="w-full rounded-full overflow-hidden bg-border"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}