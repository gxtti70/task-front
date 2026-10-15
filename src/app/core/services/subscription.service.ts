import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Plan, SubscriptionSummary, SubscriptionTier } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/subscriptions`;
  readonly plans = signal<Plan[]>([]);
  readonly subscription = signal<SubscriptionSummary | null>(null);
  readonly tier = computed(() => this.subscription()?.tier ?? 'FREE');
  readonly canCreateProject = computed(() => {
    const current = this.subscription();
    return !current || current.usage.maxProjects < 0 || current.usage.projects < current.usage.maxProjects;
  });

  loadPlans(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.url}/plans`).pipe(tap(plans => this.plans.set(plans)));
  }

  getMine(): Observable<SubscriptionSummary> {
    return this.http.get<SubscriptionSummary>(`${this.url}/me`).pipe(tap(value => this.subscription.set(value)));
  }

  checkout(tier: SubscriptionTier): Observable<{ checkoutUrl?: string; subscription?: SubscriptionSummary }> {
    return this.http.post<{ checkoutUrl?: string; subscription?: SubscriptionSummary }>(`${this.url}/checkout`, { tier })
      .pipe(tap(result => { if (result.subscription) this.subscription.set(result.subscription); }));
  }

  createPaymentIntent(tier: SubscriptionTier): Observable<{ clientSecret: string }> {
    return this.http.post<{ clientSecret: string }>(`${this.url}/create-payment-intent`, { tier });
  }

  cancel(): Observable<SubscriptionSummary> {
    return this.http.post<SubscriptionSummary>(`${this.url}/cancel`, {}).pipe(tap(value => this.subscription.set(value)));
  }

  activateForDevelopment(tier: SubscriptionTier): Observable<SubscriptionSummary> {
    return this.http.post<SubscriptionSummary>(`${this.url}/dev-activate/${tier}`, {}).pipe(tap(value => this.subscription.set(value)));
  }
}
