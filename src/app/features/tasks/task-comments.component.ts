import { Component, OnInit, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Task, TaskComment } from '../../core/models';
import { TaskService } from '../../core/services/task.service';
import { ToastService } from '../../core/services/toast.service';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';

@Component({
  selector: 'app-task-comments',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FocusTrapDirective],
  template: `
    <div class="premium-overlay" (click)="close.emit()">
      <section appFocusTrap class="premium-dialog flex w-full max-w-lg flex-col overflow-hidden" role="dialog" aria-modal="true" aria-labelledby="comments-title" (click)="$event.stopPropagation()">
        <header class="premium-dialog-header flex items-center justify-between px-6 py-5">
          <div><h2 id="comments-title" class="text-sm font-semibold text-white">Comentarios</h2><p class="mt-1 truncate text-xs text-zinc-500">{{ task().title }}</p></div>
          <button type="button" (click)="close.emit()" aria-label="Cerrar comentarios" class="premium-icon-button"><lucide-icon name="x" class="h-4 w-4"></lucide-icon></button>
        </header>
        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          @if (loading()) { <p class="text-xs text-zinc-500">Cargando comentarios...</p> }
          @for (comment of comments(); track comment.id) {
            <article class="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <div class="flex items-center justify-between gap-3"><strong class="text-xs text-zinc-200">{{ comment.authorName }}</strong><time class="text-[10px] text-zinc-500">{{ comment.createdAt | date:'short' }}</time></div>
              <p class="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-300">{{ comment.body }}</p>
            </article>
          } @empty {
            @if (!loading()) { <p class="py-6 text-center text-xs text-zinc-500">Aún no hay comentarios.</p> }
          }
        </div>
        <form (ngSubmit)="submit()" class="shrink-0 border-t border-zinc-800 bg-zinc-950/70 p-4">
          <label class="sr-only" for="commentBody">Nuevo comentario</label>
          <textarea id="commentBody" name="commentBody" [(ngModel)]="body" maxlength="2000" rows="3" required placeholder="Escribe un comentario..."
            class="premium-control w-full resize-none text-xs"></textarea>
          <div class="mt-3 flex justify-end"><button type="submit" [disabled]="!body.trim() || saving()" class="premium-primary-button">{{ saving() ? 'Enviando...' : 'Comentar' }}</button></div>
        </form>
      </section>
    </div>
  `
})
export class TaskCommentsComponent implements OnInit {
  task = input.required<Task>();
  close = output<void>();
  private taskService = inject(TaskService);
  private toast = inject(ToastService);
  comments = signal<TaskComment[]>([]);
  loading = signal(true);
  saving = signal(false);
  body = '';

  ngOnInit(): void {
    this.taskService.getComments(this.task().id).subscribe({
      next: comments => { this.comments.set(comments); this.loading.set(false); },
      error: err => { this.toast.errorFor(err, 'No se pudieron cargar los comentarios.'); this.loading.set(false); }
    });
  }

  submit(): void {
    const body = this.body.trim();
    if (!body || this.saving()) return;
    this.saving.set(true);
    this.taskService.addComment(this.task().id, body).subscribe({
      next: comment => { this.comments.update(items => [...items, comment]); this.body = ''; this.saving.set(false); },
      error: err => { this.toast.errorFor(err, 'No se pudo guardar el comentario.'); this.saving.set(false); }
    });
  }
}
