import { Injectable, inject, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'taskmanager-theme';

/** Lee el tema guardado en localStorage, o 'system' por defecto. */
function loadTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const raw = localStorage.getItem(STORAGE_KEY) as Theme | null;
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

/** Resuelve el tema efectivo ('light' o 'dark') considerando 'system'. */
function resolveEffective(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/** Aplica la clase 'dark' al elemento <html>. */
function applyThemeClass(effective: 'light' | 'dark'): void {
  if (typeof document === 'undefined') return;
  if (effective === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storedTheme = loadTheme();

  readonly theme = signal<Theme>(this.storedTheme);
  readonly effective = signal<('light' | 'dark')>(resolveEffective(this.storedTheme));

  constructor() {
    // Sincronizar la clase 'dark' con el tema inicial.
    applyThemeClass(this.effective());

    // Reaccionar a cambios del tema guardado.
    effect(() => {
      const t = this.theme();
      const eff = resolveEffective(t);
      this.effective.set(eff);
      applyThemeClass(eff);
      localStorage.setItem(STORAGE_KEY, t);
    });

    // Escuchar cambios de preferencia del sistema solo si el tema es 'system'.
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.addEventListener('change', () => {
        if (this.theme() === 'system') {
          this.effective.set(resolveEffective('system'));
          applyThemeClass(this.effective());
        }
      });
    }
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  toggleLightDark(): void {
    const current = this.theme();
    const next: Theme = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
    this.setTheme(next);
  }
}
