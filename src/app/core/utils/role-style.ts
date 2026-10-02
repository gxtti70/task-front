const ROLE_BADGE_CLASSES: Record<string, string> = {
  ADMIN: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  MANAGER: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
  SCRUM: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
  DEVELOPER: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

export function roleBadgeClasses(role: string | null | undefined): string {
  return ROLE_BADGE_CLASSES[role?.trim().toUpperCase() ?? ''] ?? ROLE_BADGE_CLASSES['DEVELOPER'];
}
