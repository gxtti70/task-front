import { Component, input, output } from '@angular/core';
import { FocusTrapDirective } from '../directives/focus-trap.directive';

@Component({
  selector: 'app-modal', standalone: true,
  imports: [FocusTrapDirective],
  template: `<div class="premium-overlay" (click)="closed.emit()"><section appFocusTrap class="premium-dialog w-full max-w-xl" role="dialog" aria-modal="true" [attr.aria-label]="label()" (click)="$event.stopPropagation()"><ng-content></ng-content></section></div>`
})
export class ModalComponent {
  label = input.required<string>();
  closed = output<void>();
}
