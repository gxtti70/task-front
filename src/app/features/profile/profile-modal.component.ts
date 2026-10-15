import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ProfileUpdateRequest, SubscriptionTier } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ToastService } from '../../core/services/toast.service';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';

@Component({
  selector: 'app-profile-modal',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule, FocusTrapDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="premium-overlay" (click)="close.emit()">
      <section appFocusTrap class="premium-dialog flex w-full max-w-lg flex-col overflow-hidden" role="dialog" aria-modal="true"
        aria-labelledby="profile-title" (click)="$event.stopPropagation()">
        <header class="premium-dialog-header flex items-center justify-between px-6 py-5">
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white shadow-inner">
              <lucide-icon name="user-round" class="h-5 w-5"></lucide-icon>
            </div>
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Tu cuenta · {{ tierLabel() }}</p>
              <h2 id="profile-title" class="mt-0.5 text-base font-semibold tracking-tight text-white">Editar perfil</h2>
            </div>
          </div>
          <button type="button" (click)="close.emit()" aria-label="Cerrar" class="premium-icon-button">
            <lucide-icon name="x" class="h-4 w-4"></lucide-icon>
          </button>
        </header>

        <form (ngSubmit)="save()" class="flex min-h-0 flex-1 flex-col">
          <div class="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          <div class="flex items-center gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 text-sm font-semibold text-white shadow-lg"
              [style.background]="accentColor || 'linear-gradient(135deg, #818cf8, #7c3aed)'">
              @if (avatarData) { <img [src]="avatarData" alt="Vista previa de foto de perfil" class="h-full w-full object-cover"> }
              @else { {{ initials() }} }
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-white">{{ fullName || 'Tu nombre' }}</p>
              <p class="mt-0.5 truncate text-xs text-zinc-500">{{ auth.currentUser()?.email }}</p>
            </div>
            <span class="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">{{ tierLabel() }}</span>
          </div>

          <label for="profileFullName" class="block text-xs font-medium text-zinc-300">Nombre visible
            <input id="profileFullName" name="fullName" [(ngModel)]="fullName" class="premium-control mt-2 w-full"
              maxlength="100" autocomplete="name" placeholder="¿Cómo te llamamos?" required>
          </label>
          <label class="block text-xs font-medium text-zinc-400">Correo de la cuenta
            <input class="premium-control mt-2 w-full cursor-not-allowed text-zinc-500" [value]="auth.currentUser()?.email || ''" readonly aria-readonly="true">
          </label>
          <p class="-mt-3 text-[11px] leading-relaxed text-zinc-500">El correo es tu identificador de acceso. Para cambiarlo, contacta con soporte.</p>

          @if (tier() !== 'FREE') {
            <section class="space-y-4 rounded-2xl border border-indigo-300/15 bg-indigo-300/[0.035] p-4">
              <div>
                <h3 class="text-xs font-semibold text-white">Perfil Premium</h3>
                <p class="mt-1 text-[10px] leading-relaxed text-zinc-500">Personaliza tu imagen y tus preferencias de trabajo.</p>
              </div>
              <div class="space-y-2">
                <label class="block text-xs font-medium text-zinc-300">Foto de perfil
                  <input type="file" accept="image/png,image/jpeg,image/webp" class="premium-control mt-2 w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-white/15" (change)="selectAvatar($event)">
                </label>
                <div class="flex items-center justify-between gap-3">
                  <p class="text-[10px] text-zinc-500">PNG, JPEG o WebP · máximo 512 KB</p>
                  @if (avatarData) { <button type="button" (click)="avatarData = ''" class="text-[10px] text-zinc-400 underline underline-offset-2 hover:text-white">Quitar foto</button> }
                </div>
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label class="block text-xs font-medium text-zinc-300">Zona horaria
                  <select name="timezone" [(ngModel)]="timezone" class="premium-control mt-2 w-full text-xs">
                    <option value="America/Bogota">Bogotá (UTC−5)</option>
                    <option value="America/Mexico_City">Ciudad de México</option>
                    <option value="America/New_York">Nueva York</option>
                    <option value="Europe/Madrid">Madrid</option>
                    <option value="UTC">UTC</option>
                  </select>
                </label>
                <label class="block text-xs font-medium text-zinc-300">La semana comienza
                  <select name="weekStartsOn" [(ngModel)]="weekStartsOn" class="premium-control mt-2 w-full text-xs">
                    <option [ngValue]="1">Lunes</option>
                    <option [ngValue]="0">Domingo</option>
                  </select>
                </label>
              </div>
            </section>
          } @else {
            <section class="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <lucide-icon name="sparkles" class="mt-0.5 h-4 w-4 shrink-0 text-indigo-300"></lucide-icon>
              <div class="min-w-0 flex-1">
                <h3 class="text-xs font-semibold text-white">Más opciones con Premium</h3>
                <p class="mt-1 text-[10px] leading-relaxed text-zinc-500">Añade una foto de perfil, configura tu zona horaria y el inicio de semana.</p>
              </div>
              <a routerLink="/dashboard/subscription" (click)="close.emit()" class="shrink-0 text-[10px] font-semibold text-indigo-200 hover:text-white">Ver planes</a>
            </section>
          }

          @if (tier() === 'PREMIUM_PLUS') {
            <section class="space-y-4 rounded-2xl border border-violet-300/15 bg-violet-300/[0.035] p-4">
              <div>
                <h3 class="text-xs font-semibold text-white">Perfil ampliado · Premium Plus</h3>
                <p class="mt-1 text-[10px] leading-relaxed text-zinc-500">Añade contexto profesional y un color personal para tu perfil.</p>
              </div>
              <label class="block text-xs font-medium text-zinc-300">Cargo o especialidad
                <input name="jobTitle" [(ngModel)]="jobTitle" class="premium-control mt-2 w-full text-sm" maxlength="100" placeholder="p. ej. Diseñadora de producto">
              </label>
              <label class="block text-xs font-medium text-zinc-300">Biografía
                <textarea name="bio" [(ngModel)]="bio" class="premium-control mt-2 w-full resize-y text-sm" maxlength="500" rows="3" placeholder="Cuéntale al equipo en qué estás trabajando..."></textarea>
              </label>
              <label class="flex items-center justify-between gap-3 text-xs font-medium text-zinc-300">Color de acento
                <span class="flex items-center gap-2">
                  <input name="accentColor" [(ngModel)]="accentColor" type="color" class="h-9 w-12 cursor-pointer rounded-lg border border-white/10 bg-zinc-950 p-1" aria-label="Color de acento del perfil">
                  <span class="font-mono text-[10px] text-zinc-500">{{ accentColor }}</span>
                </span>
              </label>
            </section>
          } @else {
            <section class="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <lucide-icon name="sparkles" class="mt-0.5 h-4 w-4 shrink-0 text-violet-300"></lucide-icon>
              <div class="min-w-0 flex-1">
                <h3 class="text-xs font-semibold text-white">Personalización avanzada</h3>
                <p class="mt-1 text-[10px] leading-relaxed text-zinc-500">Premium Plus añade cargo, biografía y color de acento a tu perfil.</p>
              </div>
              <a routerLink="/dashboard/subscription" (click)="close.emit()" class="shrink-0 text-[10px] font-semibold text-violet-200 hover:text-white">Ver planes</a>
            </section>
          }

          @if (errorMessage()) { <p role="alert" class="text-xs text-red-300">{{ errorMessage() }}</p> }
          </div>
          <div class="flex shrink-0 justify-end gap-2 border-t border-white/[0.07] bg-zinc-950/70 px-6 py-4">
            <button type="button" (click)="close.emit()" class="premium-secondary-button">Cancelar</button>
            <button type="submit" [disabled]="saving() || !fullName.trim()" class="premium-primary-button">
              @if (saving()) { <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black"></span> Guardando... }
              @else { Guardar cambios }
            </button>
          </div>
        </form>
      </section>
    </div>
  `
})
export class ProfileModalComponent {
  close = output<void>();
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly subscriptions = inject(SubscriptionService);
  readonly tier = computed(() => this.subscriptions.tier());
  fullName = this.auth.currentUser()?.fullName || this.auth.currentUser()?.name || '';
  avatarData = this.auth.currentUser()?.avatarData || '';
  timezone = this.auth.currentUser()?.timezone || 'America/Bogota';
  weekStartsOn = this.auth.currentUser()?.weekStartsOn ?? 1;
  jobTitle = this.auth.currentUser()?.jobTitle || '';
  bio = this.auth.currentUser()?.bio || '';
  accentColor = this.auth.currentUser()?.accentColor || '#818CF8';
  saving = signal(false);
  errorMessage = signal('');

  tierLabel(): string {
    const names: Record<SubscriptionTier, string> = {
      FREE: 'Free', PREMIUM: 'Premium', PREMIUM_PLUS: 'Premium Plus'
    };
    return names[this.tier()];
  }

  initials(): string {
    return this.fullName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'U';
  }

  selectAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 512 * 1024) {
      this.errorMessage.set('Elige una imagen PNG, JPEG o WebP de máximo 512 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.avatarData = reader.result;
        this.errorMessage.set('');
      }
    };
    reader.onerror = () => this.errorMessage.set('No se pudo leer la imagen seleccionada.');
    reader.readAsDataURL(file);
  }

  save(): void {
    const fullName = this.fullName.trim();
    if (!fullName || this.saving()) return;
    const profile: ProfileUpdateRequest = { fullName };
    if (this.tier() !== 'FREE') {
      profile.avatarData = this.avatarData;
      profile.timezone = this.timezone;
      profile.weekStartsOn = Number(this.weekStartsOn);
    }
    if (this.tier() === 'PREMIUM_PLUS') {
      profile.jobTitle = this.jobTitle;
      profile.bio = this.bio;
      profile.accentColor = this.accentColor;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    this.auth.updateProfile(profile).subscribe({
      next: () => { this.saving.set(false); this.toast.success('Tu perfil se actualizó.'); this.close.emit(); },
      error: error => {
        this.saving.set(false);
        this.errorMessage.set(error?.status === 402
          ? 'Esta opción requiere un plan superior. Actualiza tu membresía para guardarla.'
          : 'No se pudo actualizar tu perfil. Revisa los datos e inténtalo de nuevo.');
      }
    });
  }
}
