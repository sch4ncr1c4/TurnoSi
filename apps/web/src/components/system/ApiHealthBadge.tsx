import { useEffect, useState } from "react";

import { getApiHealth } from "../../lib/api";

type ApiHealthState = "checking" | "online" | "offline";

const toneByState: Record<ApiHealthState, string> = {
  checking: "border-white/16 bg-white/8 text-white/72",
  online: "border-emerald-400/30 bg-emerald-400/12 text-emerald-100",
  offline: "border-rose-400/30 bg-rose-400/12 text-rose-100"
};

export function ApiHealthBadge() {
  const [state, setState] = useState<ApiHealthState>("checking");

  useEffect(() => {
    let cancelled = false;

    getApiHealth()
      .then(() => {
        if (!cancelled) {
          setState("online");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState("offline");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    state === "checking"
      ? "Conectando reservas"
      : state === "online"
        ? "Reservas online"
        : "Reservas sin conexión";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium ${toneByState[state]}`}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
      {label}
    </span>
  );
}
