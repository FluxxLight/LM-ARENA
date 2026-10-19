import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="IDEAForge — início">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 text-base shadow-glow">
        <span aria-hidden>⚒️</span>
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-white">
          IDEA<span className="text-violet-300">Forge</span>
        </span>
      )}
    </Link>
  );
}
