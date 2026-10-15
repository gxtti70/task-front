import { Component, input } from '@angular/core';

@Component({
  selector: 'app-button', standalone: true,
  template: `<button [type]="type()" [disabled]="disabled()" [class]="'premium-primary-button disabled:cursor-not-allowed disabled:opacity-50 ' + className()"><ng-content></ng-content></button>`
})
export class ButtonComponent {
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input(false);
  className = input('');
}
