import { TestBed } from '@angular/core/testing';
import { importProvidersFrom } from '@angular/core';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionService } from '../../core/services/subscription.service';
import { ToastService } from '../../core/services/toast.service';
import { PricingComponent } from './pricing.component';
import { Check, Crown, Layers, LucideAngularModule } from 'lucide-angular';

describe('PricingComponent', () => {
  const plan = { tier: 'FREE' as const, name: 'Free', maxProjects: 3, maxMembersPerProject: 5, price: 0, currency: 'USD', features: ['Kanban'] };
  const subscription = { plans: signal([plan]), subscription: signal(null), loadPlans: vi.fn(() => of([plan])), getMine: vi.fn(() => of(null)) };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PricingComponent], providers: [
      { provide: SubscriptionService, useValue: subscription },
      { provide: ToastService, useValue: { errorFor: vi.fn(), success: vi.fn() } },
      { provide: Router, useValue: { navigateByUrl: vi.fn() } },
      importProvidersFrom(LucideAngularModule.pick({ Check, Crown, Layers }))
    ] });
  });

  it('renders the available plan and formatted tier label', () => {
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.tierLabel('PREMIUM_PLUS')).toBe('Premium Plus');
    expect(fixture.nativeElement.textContent).toContain('Free');
    expect(fixture.nativeElement.textContent).toContain('3 proyectos');
  });
});
