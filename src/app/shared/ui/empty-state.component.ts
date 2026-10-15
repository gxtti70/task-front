import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state', standalone: true,
  template: `<section class="rounded-xl border border-dashed border-zinc-800 px-5 py-10 text-center"><h2 class="text-sm font-medium text-zinc-200">{{ title() }}</h2><p class="mt-1 text-xs text-zinc-500">{{ description() }}</p><ng-content></ng-content></section>`
})
export class EmptyStateComponent {
  title = input('Nada por aquí todavía');
  description = input('Cuando haya contenido, aparecerá aquí.');
}
