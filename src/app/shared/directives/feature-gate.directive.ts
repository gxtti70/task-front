import { Directive, Input, TemplateRef, ViewContainerRef, effect, inject } from '@angular/core';
import { FeatureGateService } from '../../core/services/feature-gate.service';

@Directive({ selector: '[appFeatureGate]', standalone: true })
export class FeatureGateDirective {
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);
  private readonly gates = inject(FeatureGateService);
  private rendered = false;
  private capability = '';

  @Input() set appFeatureGate(value: string) { this.capability = value; this.update(); }

  constructor() { effect(() => { this.gates.canUse(this.capability); this.update(); }); }

  private update(): void {
    const allowed = this.capability ? this.gates.canUse(this.capability) : false;
    if (allowed && !this.rendered) { this.container.createEmbeddedView(this.template); this.rendered = true; }
    else if (!allowed && this.rendered) { this.container.clear(); this.rendered = false; }
  }
}
