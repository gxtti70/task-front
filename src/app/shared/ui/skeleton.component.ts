import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton', standalone: true,
  template: `<div [class]="'animate-pulse rounded-lg bg-zinc-800/70 ' + skeletonClass()" aria-hidden="true"></div>`
})
export class SkeletonComponent { skeletonClass = input('h-4 w-full'); }
