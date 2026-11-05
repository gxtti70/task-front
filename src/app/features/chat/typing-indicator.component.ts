import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-typing-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (typingUsers().size > 0) {
      <div class="typing-indicator flex items-center gap-2 px-3 py-1.5">
        <span class="flex h-1.5 w-1.5 gap-1">
          <span class="typing-dot animate-bounce" style="animation-delay: 0ms"></span>
          <span class="typing-dot animate-bounce" style="animation-delay: 150ms"></span>
          <span class="typing-dot animate-bounce" style="animation-delay: 300ms"></span>
        </span>
        <span class="text-[10px] text-zinc-500">
          @if (typingUsers().size === 1) {
            {{ typingUsers().values().next().value }} está escribiendo…
          } @else {
            {{ typingUsers().size }} usuarios están escribiendo…
          }
        </span>
      </div>
    }
  `,
  styles: [
    `
      .typing-dot {
        width: 6px;
        height: 6px;
        background-color: #9ca3af;
        border-radius: 50%;
        display: inline-block;
      }
      .animate-bounce {
        animation: typing-bounce 1.4s infinite ease-in-out both;
      }
      @keyframes typing-bounce {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-4px);
        }
      }
    `,
  ],
})
export class TypingIndicatorComponent {
  readonly chat = inject(ChatService);
  readonly typingUsers = computed(() => this.chat.typingUsers());
}
