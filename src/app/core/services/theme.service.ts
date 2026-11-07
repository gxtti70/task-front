import { Injectable, inject, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'blue';

const STORAGE_KEY = 'taskmanager-theme';

function loadTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const raw = localStorage.getItem(STORAGE_KEY) as Theme | null;
  return raw === 'light' || raw === 'dark' || raw === 'blue' ? raw : 'dark';
}

function applyThemeClass(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('light', 'dark', 'blue');
  document.documentElement.classList.add(theme);
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storedTheme = loadTheme();

  readonly theme = signal<Theme>(this.storedTheme);
  constructor() {
    effect(() => {
      const t = this.theme();
      applyThemeClass(t);
      localStorage.setItem(STORAGE_KEY, t);
    });
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
  }

  toggleLightDark(): void {
    const current = this.theme();
    const next: Theme = current === 'light' ? 'dark' : current === 'dark' ? 'blue' : 'light';
    this.setTheme(next);
  }
}
