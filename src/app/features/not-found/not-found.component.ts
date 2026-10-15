import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `<main class="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-center"><section class="max-w-md"><p class="font-mono text-sm text-indigo-300">ERROR 404</p><h1 class="mt-3 text-3xl font-semibold text-white">No encontramos esa página</h1><p class="mt-3 text-sm text-zinc-400">La dirección puede haber cambiado o no existe.</p><a routerLink="/dashboard/kanban" class="mt-6 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-medium text-black">Volver al tablero</a></section></main>`
})
export class NotFoundComponent {}
