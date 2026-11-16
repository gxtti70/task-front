import { Component, ElementRef, OnInit, input, output, signal, viewChildren } from '@angular/core';

/**
 * Campo de entrada para un código numérico de un solo uso.
 *
 * <p>Cada cifra va en su propia casilla: el avance es automático, la flecha
 * izquierda borra hacia atrás y pegar el código completo llena todas las casillas.
 * Usa `autocomplete="one-time-code"` para que el teclado del móvil proponga el
 * código recibido por SMS o correo.
 */
@Component({
  selector: 'app-otp-input',
  standalone: true,
  template: `
    <div class="flex items-center justify-center gap-2 sm:gap-3" (paste)="onPaste($event)">
      @for (slot of digits(); track $index) {
        <input
          #box
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          autocomplete="one-time-code"
          maxlength="1"
          [value]="slot"
          [attr.aria-label]="'Dígito ' + ($index + 1) + ' de ' + length()"
          (input)="onInput($index, $event)"
          (keydown)="onKeydown($index, $event)"
          (focus)="selectContent($event)"
          class="h-12 w-11 rounded-lg border border-zinc-800 bg-zinc-950 text-center text-lg font-semibold text-white transition-colors focus:border-zinc-500 focus:outline-none sm:h-14 sm:w-14">
      }
    </div>
  `
})
export class OtpInputComponent implements OnInit {
  readonly length = input(6);
  readonly codeChange = output<string>();
  readonly digits = signal<string[]>([]);

  private readonly boxes = viewChildren<ElementRef<HTMLInputElement>>('box');

  ngOnInit(): void {
    this.digits.set(Array.from({ length: this.length() }, () => ''));
  }

  onInput(index: number, event: Event): void {
    const field = event.target as HTMLInputElement;
    const raw = (field.value ?? '').replace(/\D/g, '');
    if (!raw) {
      this.update(index, '');
      return;
    }
    if (raw.length === 1) {
      this.update(index, raw);
      if (index < this.length() - 1) this.focus(index + 1);
      else field.blur();
      return;
    }
    // Relleno automático del navegador: el código completo llega en la primera casilla.
    this.fill(index, raw);
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (this.digits()[index]) {
        this.update(index, '');
        this.focus(index);
      } else if (index > 0) {
        this.update(index - 1, '');
        this.focus(index - 1);
      }
      return;
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focus(index - 1);
      return;
    }
    if (event.key === 'ArrowRight' && index < this.length() - 1) {
      event.preventDefault();
      this.focus(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    const text = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
    if (!text) return;
    event.preventDefault();
    this.fill(0, text);
  }

  selectContent(event: Event): void {
    (event.target as HTMLInputElement).select();
  }

  reset(): void {
    this.digits.set(Array.from({ length: this.length() }, () => ''));
    this.codeChange.emit('');
    this.focus(0);
  }

  private fill(startIndex: number, text: string): void {
    const next = this.digits().slice();
    for (let offset = 0; offset < text.length && startIndex + offset < this.length(); offset++) {
      next[startIndex + offset] = text[offset];
    }
    this.digits.set(next);
    this.emit();
    this.focus(Math.min(startIndex + text.length, this.length() - 1));
  }

  private update(index: number, value: string): void {
    const next = this.digits().slice();
    next[index] = value;
    this.digits.set(next);
    this.emit();
  }

  private emit(): void {
    const code = this.digits().join('');
    if (code.length === this.length() && /^\d+$/.test(code)) {
      this.codeChange.emit(code);
    }
  }

  private focus(index: number): void {
    setTimeout(() => {
      const ref = this.boxes()[index];
      if (!ref) return;
      ref.nativeElement.focus();
      ref.nativeElement.select();
    });
  }
}
