import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Directive({ selector: '[appHasRole]', standalone: true })
export class HasRoleDirective {
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);
  private readonly auth = inject(AuthService);
  private rendered = false;
  private roles: string[] = [];

  @Input() set appHasRole(value: string | string[]) { this.roles = Array.isArray(value) ? value : [value]; this.update(); }

  constructor() { effect(() => { this.auth.userRole(); this.update(); }); }

  private update(): void {
    const allowed = this.roles.includes(this.auth.userRole());
    if (allowed && !this.rendered) { this.container.createEmbeddedView(this.template); this.rendered = true; }
    else if (!allowed && this.rendered) { this.container.clear(); this.rendered = false; }
  }
}
