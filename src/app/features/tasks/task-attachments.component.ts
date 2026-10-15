import { ChangeDetectionStrategy, Component, OnInit, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Task, TaskAttachment } from '../../core/models';
import { TaskService } from '../../core/services/task.service';
import { ToastService } from '../../core/services/toast.service';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';

@Component({
  selector: 'app-task-attachments',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FocusTrapDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="premium-overlay" (click)="close.emit()">
      <section appFocusTrap class="premium-dialog flex w-full max-w-lg flex-col overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="attachments-title" (click)="$event.stopPropagation()">
        <header class="premium-dialog-header flex items-center justify-between px-6 py-5">
          <div><h2 id="attachments-title" class="text-sm font-semibold text-white">Adjuntos</h2><p class="mt-1 truncate text-xs text-zinc-500">{{ task().title }}</p></div>
          <button type="button" (click)="close.emit()" aria-label="Cerrar adjuntos" class="premium-icon-button"><lucide-icon name="x" class="h-4 w-4"></lucide-icon></button>
        </header>
        <div class="min-h-0 flex-1 space-y-2 overflow-y-auto p-5">
          @if (loading()) { <p class="text-xs text-zinc-500">Cargando adjuntos...</p> }
          @for (attachment of attachments(); track attachment.id) {
            <div class="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <lucide-icon name="paperclip" class="h-4 w-4 shrink-0 text-zinc-500"></lucide-icon>
              <div class="min-w-0 flex-1"><p class="truncate text-xs text-zinc-200">{{ attachment.filename }}</p><p class="text-[10px] text-zinc-500">{{ attachment.sizeBytes | number }} bytes</p></div>
              <button type="button" (click)="download(attachment)" [attr.aria-label]="'Descargar ' + attachment.filename" class="rounded p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"><lucide-icon name="download" class="h-4 w-4"></lucide-icon></button>
              <button type="button" (click)="remove(attachment)" [attr.aria-label]="'Eliminar ' + attachment.filename" class="rounded p-1.5 text-red-400 hover:bg-red-950/50"><lucide-icon name="trash-2" class="h-4 w-4"></lucide-icon></button>
            </div>
          } @empty {
            @if (!loading()) { <p class="py-6 text-center text-xs text-zinc-500">Esta tarea aún no tiene adjuntos.</p> }
          }
        </div>
        <div class="shrink-0 border-t border-zinc-800 bg-zinc-950/70 p-4">
          <label class="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/[0.025] px-3 py-4 text-xs text-zinc-300 transition hover:border-indigo-300/50 hover:bg-indigo-300/[0.05]" [class.opacity-50]="uploading()">
            <lucide-icon name="upload" class="h-4 w-4"></lucide-icon>
            {{ uploading() ? 'Subiendo...' : 'Seleccionar archivo' }}
            <input type="file" class="sr-only" [disabled]="uploading()" (change)="selectFile($event)">
          </label>
          <p class="mt-2 text-center text-[10px] text-zinc-600">El tamaño y la cantidad máximos dependen de tu plan.</p>
        </div>
      </section>
    </div>
  `
})
export class TaskAttachmentsComponent implements OnInit {
  task = input.required<Task>();
  close = output<void>();
  private taskService = inject(TaskService);
  private toast = inject(ToastService);
  attachments = signal<TaskAttachment[]>([]);
  loading = signal(true);
  uploading = signal(false);

  ngOnInit(): void { this.reload(); }

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploading()) return;
    this.uploading.set(true);
    this.taskService.prepareAttachment(this.task().id, file).subscribe({
      next: prepared => this.taskService.uploadAttachment(this.task().id, prepared, file).subscribe({
        next: () => {
          if (prepared.uploadUrl?.startsWith('/')) {
            this.taskService.getAttachments(this.task().id).subscribe({
              next: items => this.finishUpload(items), error: err => this.failUpload(err)
            });
          } else {
            this.taskService.completeAttachmentUpload(this.task().id, prepared.id).subscribe({
              next: () => this.reloadAfterUpload(), error: err => this.failUpload(err)
            });
          }
        },
        error: err => {
          this.taskService.deleteAttachment(this.task().id, prepared.id).subscribe({ error: () => undefined });
          this.failUpload(err);
        }
      }),
      error: err => this.failUpload(err)
    });
  }

  download(attachment: TaskAttachment): void {
    if (attachment.downloadUrl.startsWith('/')) {
      this.taskService.downloadLocalAttachment(attachment.downloadUrl).subscribe({
        next: blob => this.saveBlob(blob, attachment.filename),
        error: err => this.toast.errorFor(err, 'No se pudo descargar el adjunto.')
      });
      return;
    }
    window.location.assign(attachment.downloadUrl);
  }

  remove(attachment: TaskAttachment): void {
    this.taskService.deleteAttachment(this.task().id, attachment.id).subscribe({
      next: () => {
        this.attachments.update(items => items.filter(item => item.id !== attachment.id));
        this.toast.success('Adjunto eliminado.');
      },
      error: err => this.toast.errorFor(err, 'No se pudo eliminar el adjunto.')
    });
  }

  private reload(): void {
    this.taskService.getAttachments(this.task().id).subscribe({
      next: items => { this.attachments.set(items); this.loading.set(false); },
      error: err => { this.toast.errorFor(err, 'No se pudieron cargar los adjuntos.'); this.loading.set(false); }
    });
  }

  private reloadAfterUpload(): void {
    this.taskService.getAttachments(this.task().id).subscribe({
      next: items => this.finishUpload(items),
      error: err => this.failUpload(err)
    });
  }

  private finishUpload(items: TaskAttachment[]): void {
    this.attachments.set(items);
    this.uploading.set(false);
    this.toast.success('Adjunto cargado.');
  }

  private failUpload(error: unknown): void {
    this.uploading.set(false);
    this.toast.errorFor(error, 'No se pudo cargar el adjunto.');
  }

  private saveBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url));
  }
}
