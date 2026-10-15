import { Injectable, computed, inject } from '@angular/core';
import { SubscriptionService } from './subscription.service';

@Injectable({ providedIn: 'root' })
export class FeatureGateService {
  private subscription = inject(SubscriptionService);
  readonly isPremium = computed(() => this.subscription.tier() !== 'FREE');
  readonly canCreateProject = this.subscription.canCreateProject;
  readonly canUseAttachments = computed(() => this.subscription.subscription()?.capabilities?.['attachments'] === true);
  canUse(capability: string): boolean {
    return this.subscription.subscription()?.capabilities?.[capability] === true;
  }
  canAddMember(currentCount: number): boolean {
    const max = this.subscription.subscription()?.usage.maxMembersPerProject ?? 5;
    return max < 0 || currentCount < max;
  }
}
