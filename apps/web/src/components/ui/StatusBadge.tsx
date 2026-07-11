type StatusBadgeProps = {
  enabled: boolean;
  status: string;
};

export function StatusBadge({ enabled, status }: StatusBadgeProps) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        enabled ? "bg-[#e3f3e5] text-[#347a43]" : "bg-[#fde8e5] text-[#b42318]"
      }`}
    >
      {status}
    </span>
  );
}
