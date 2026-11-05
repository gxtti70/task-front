import { Component, DestroyRef, NgZone, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Channel, Project, User } from '../../core/models';
import { ChatService } from '../../core/services/chat.service';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { UserDirectoryService } from '../../core/services/user-directory.service';
import { ToastService } from '../../core/services/toast.service';
import { FocusTrapDirective } from '../../shared/directives/focus-trap.directive';
import { SkeletonComponent } from '../../shared/ui/skeleton.component';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, FocusTrapDirective, SkeletonComponent],
  templateUrl: './chat.component.html'
})
export class ChatComponent implements OnInit {
  readonly chat = inject(ChatService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly zone = inject(NgZone);
  private readonly projectService = inject(ProjectService);
  private readonly userDirectory = inject(UserDirectoryService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rooms = computed(() => this.chat.channels().filter(channel => channel.projectId !== null));
  readonly directs = computed(() => this.chat.channels().filter(channel => channel.projectId === null));
  readonly currentUserId = computed(() => this.auth.currentUser()?.id ?? '');

  readonly projectList = signal<Project[]>([]);
  readonly userList = signal<User[]>([]);
  readonly creatableProjects = computed(() => {
    const self = this.currentUserId();
    return this.auth.isAdmin() ? this.projectList() : this.projectList().filter(p => p.ownerId === self);
  });

  readonly dialogOpen = signal(false);
  readonly dialogTab = signal<'room' | 'dm'>('room');
  readonly roomName = signal('');
  readonly roomProjectId = signal('');
  readonly dmSearch = signal('');
  readonly creating = signal(false);
  readonly draft = signal('');
  readonly sidebarOpen = signal(false);

  readonly filteredUsers = computed(() => {
    const query = this.dmSearch().trim().toLowerCase();
    const self = this.currentUserId();
    return this.userList().filter(user => user.id && user.id !== self
      && (!query || `${user.fullName ?? ''} ${user.email}`.toLowerCase().includes(query)));
  });

  private readonly scroller = viewChild<HTMLElement>('messagesScroller');
  private lastScrolledMessageId = '';

  constructor() {
    effect(() => {
      const element = this.scroller();
      const lastId = this.chat.messages().at(-1)?.id ?? '';
      if (!element || !lastId || lastId === this.lastScrolledMessageId) return;
      this.lastScrolledMessageId = lastId;
      queueMicrotask(() => { element.scrollTop = element.scrollHeight; });
    });
  }

  ngOnInit(): void {
    this.chat.pollWhenVisible();
    this.projectService.getProjects().subscribe({ next: list => this.projectList.set(list) });
    this.userDirectory.getActiveUsers().subscribe({ next: list => this.userList.set(list) });
    // Sondeo cada 4 s solo mientras la pestaña esté visible, fuera de la zona para no saturar el detector de cambios.
    this.zone.runOutsideAngular(() => {
      const poller = setInterval(() => {
        if (document.visibilityState === 'visible') this.zone.run(() => this.chat.pollWhenVisible());
      }, this.chat.pollIntervalMs);
      this.destroyRef.onDestroy(() => clearInterval(poller));
    });
  }

  channelLabel(channel: Channel | null): string {
    if (!channel) return '';
    return channel.otherUserName || channel.name || 'Conversación';
  }

  initialsOf(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return '?';
    return words.length > 1
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : words[0].slice(0, 2).toUpperCase();
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    if (element.scrollTop < 80) this.chat.loadOlderMessages();
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    this.submitDraft();
  }

  onSendClick(): void {
    this.submitDraft();
  }

  private submitDraft(): void {
    const text = this.draft();
    this.chat.send(text);
    if (text.trim()) this.draft.set('');
  }

  openDialog(tab: 'room' | 'dm'): void {
    this.dialogTab.set(tab);
    this.dialogOpen.set(true);
    this.roomName.set('');
    this.dmSearch.set('');
    if (tab === 'room') this.roomProjectId.set(this.creatableProjects().at(0)?.id ?? '');
  }

  switchDialogTab(tab: 'room' | 'dm'): void {
    this.openDialog(tab);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  openChannelAndCloseSidebar(channelId: string): void {
    this.chat.openChannel(channelId);
    if (this.sidebarOpen()) this.toggleSidebar();
  }

  submitRoom(): void {
    const projectId = this.roomProjectId();
    const name = this.roomName().trim();
    if (!projectId || !name || this.creating()) return;
    this.creating.set(true);
    this.chat.createChannel({ projectId, name, type: 'TEXT' }).subscribe({
      next: channel => {
        this.creating.set(false);
        this.toast.success('Sala creada');
        this.chat.openChannel(channel.id);
        this.closeDialog();
      },
      error: error => {
        this.creating.set(false);
        this.toast.errorFor(error, 'No se pudo crear la sala.');
      }
    });
  }

  openDirectDiscussion(user: User): void {
    if (!user.id || this.creating()) return;
    this.creating.set(true);
    this.chat.openDirectChannel(user.id).subscribe({
      next: () => {
        this.creating.set(false);
        this.closeDialog();
      },
      error: error => {
        this.creating.set(false);
        this.toast.errorFor(error, 'No se pudo abrir la conversación.');
      }
    });
  }
}
