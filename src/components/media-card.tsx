import { Link } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";
import { CheckCircle2, Clock, Lock, PlayCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type MediaCardStatus = "done" | "in-progress" | "not-started" | "new" | "locked";

export type MediaCardProps = {
  title: string;
  thumbnailUrl: string | null;
  thumbnailUrlHQ?: string | null;
  durationSeconds?: number;
  status: MediaCardStatus;
  /** Extra hint below status, e.g. "45% assistido" or "3/10 aulas". */
  hint?: string;
  linkProps?: LinkProps;
  disabled?: boolean;
  /** When true, forces gradient placeholder even if thumbnailUrl provided. */
  gradientOnly?: boolean;
};

function fmtDuration(s?: number) {
  if (!s) return null;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return sec ? `${m}m ${sec}s` : `${m}m`;
}

function StatusBadge({ status }: { status: MediaCardStatus }) {
  const map: Record<MediaCardStatus, { label: string; icon: React.ReactNode; className: string }> = {
    done: {
      label: "Concluída",
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: "text-[color:var(--color-success)]",
    },
    "in-progress": {
      label: "Em andamento",
      icon: <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-brand)]" />,
      className: "text-[color:var(--color-brand)]",
    },
    "not-started": {
      label: "Não iniciada",
      icon: <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />,
      className: "text-muted-foreground",
    },
    new: {
      label: "Novo",
      icon: <Sparkles className="h-3 w-3" />,
      className: "text-[color:var(--color-brand)]",
    },
    locked: {
      label: "Bloqueada",
      icon: <Lock className="h-3 w-3" />,
      className: "text-muted-foreground",
    },
  };
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 font-medium", s.className)}>
      {s.icon}
      {s.label}
    </span>
  );
}

function Thumbnail({
  title,
  thumbnailUrl,
  thumbnailUrlHQ,
  durationSeconds,
  status,
  gradientOnly,
}: Pick<MediaCardProps, "title" | "thumbnailUrl" | "thumbnailUrlHQ" | "durationSeconds" | "status" | "gradientOnly">) {
  const showImage = !gradientOnly && !!thumbnailUrl;
  const duration = fmtDuration(durationSeconds);
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-brand-gradient">
      {showImage ? (
        <img
          src={thumbnailUrlHQ ?? thumbnailUrl!}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          onError={(e) => {
            const img = e.currentTarget;
            if (thumbnailUrlHQ && img.src === thumbnailUrlHQ && thumbnailUrl) {
              img.src = thumbnailUrl;
              return;
            }
            // final fallback: hide image, gradient shows through
            img.style.display = "none";
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)] p-4 text-center">
          <span className="line-clamp-3 text-sm font-bold text-white/95">{title}</span>
        </div>
      )}

      {/* Overlay for locked */}
      {status === "locked" && (
        <div className="absolute inset-0 grid place-items-center bg-black/40 backdrop-blur-[1px]">
          <Lock className="h-6 w-6 text-white/90" />
        </div>
      )}

      {/* Play hint on hover */}
      {status !== "locked" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-white/95 shadow-lg">
            <PlayCircle className="h-7 w-7 text-[color:var(--color-brand)]" />
          </div>
        </div>
      )}

      {/* Duration badge */}
      {duration && (
        <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur">
          <Clock className="h-3 w-3" />
          {duration}
        </div>
      )}

      {/* Done check top-right */}
      {status === "done" && (
        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[color:var(--color-success)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
          <CheckCircle2 className="h-3 w-3" />
          Concluída
        </div>
      )}
      {status === "new" && (
        <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[color:var(--color-brand)]">
          <Sparkles className="h-3 w-3" />
          Novo
        </div>
      )}
    </div>
  );
}

export function MediaCard(props: MediaCardProps) {
  const { title, durationSeconds, status, hint, linkProps, disabled } = props;
  const duration = fmtDuration(durationSeconds);

  const body = (
    <div className={cn("group block", disabled && "pointer-events-none opacity-60")}>
      <Thumbnail {...props} />
      <div className="mt-2.5 space-y-1">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug">{title}</h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          {duration && <span>{duration}</span>}
          {duration && <span aria-hidden>·</span>}
          <StatusBadge status={status} />
          {hint && (
            <>
              <span aria-hidden>·</span>
              <span>{hint}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (disabled || !linkProps) {
    return <div title={disabled ? "Conclua a aula anterior para desbloquear" : undefined}>{body}</div>;
  }
  return <Link {...linkProps}>{body}</Link>;
}
