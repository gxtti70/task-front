import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable, map } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { SubscriptionService } from '../../core/services/subscription.service';
import { SubscriptionSummary, SubscriptionTier } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

interface StripePaymentElementLike { mount(selector: string): void; unmount(): void; }
interface StripeElementsLike { create(type: 'payment', options: { layout: string }): StripePaymentElementLike; }
interface StripeLike {
  elements(options: { clientSecret: string }): StripeElementsLike;
  confirmPayment(options: { elements: StripeElementsLike; confirmParams: { return_url: string }; redirect: 'if_required' }): Promise<{ error?: { message?: string }; paymentIntent?: { status: string } }>;
}
declare global { interface Window { Stripe?: (key: string) => StripeLike; } }

type PaymentMethod = 'card' | 'apple_pay' | 'google_pay';

@Component({
  selector: 'app-pricing', standalone: true, imports: [CommonModule, LucideAngularModule],
  template: `
    <section class="mx-auto max-w-6xl space-y-8 pb-10">
      <header class="text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Planes TaskManager</p>
        <h1 class="mt-2 text-2xl font-semibold text-white">Elige el espacio que necesita tu equipo</h1>
        <p class="mt-2 text-sm text-zinc-500">Tu plan actual: <span class="font-medium text-zinc-200">{{ tierLabel(subscription.subscription()?.tier || 'FREE') }}</span></p>
      </header>
      @if (loading()) { <p class="text-center text-sm text-zinc-500">Cargando planes...</p> }
      @else {
        <div class="grid gap-4 md:grid-cols-3">
          @for (plan of subscription.plans(); track plan.tier) {
            <article class="relative flex flex-col rounded-2xl border p-5"
              [ngClass]="subscription.subscription()?.tier === plan.tier ? 'border-sky-500 bg-sky-950/20' : 'border-zinc-800 bg-zinc-950/60'">
              @if (subscription.subscription()?.tier === plan.tier) { <span class="absolute right-4 top-4 rounded-full bg-sky-400/10 px-2.5 py-1 text-[10px] font-semibold text-sky-300">PLAN ACTUAL</span> }
              <div class="flex items-center gap-2 text-sm font-semibold text-white"><lucide-icon [name]="plan.tier === 'FREE' ? 'layers' : 'crown'" class="h-4 w-4 text-sky-300"></lucide-icon>{{ plan.name }}</div>
              <p class="mt-5 text-3xl font-semibold text-white">{{ plan.price === 0 ? 'Gratis' : ('$' + (plan.price | number:'1.2-2')) }}<span class="text-xs font-normal text-zinc-500">{{ plan.price === 0 ? '' : ' / mes' }}</span></p>
              <ul class="my-5 flex-1 space-y-3 border-t border-zinc-800 pt-4">
                <li class="flex gap-2 text-xs text-zinc-300"><lucide-icon name="check" class="h-4 w-4 shrink-0 text-emerald-400"></lucide-icon>{{ plan.maxProjects < 0 ? 'Proyectos ilimitados' : plan.maxProjects + ' proyectos' }}</li>
                <li class="flex gap-2 text-xs text-zinc-300"><lucide-icon name="check" class="h-4 w-4 shrink-0 text-emerald-400"></lucide-icon>{{ plan.maxMembersPerProject < 0 ? 'Miembros ilimitados' : 'Hasta ' + plan.maxMembersPerProject + ' miembros por proyecto' }}</li>
                @for (feature of plan.features; track feature) { <li class="flex gap-2 text-xs text-zinc-400"><lucide-icon name="check" class="h-4 w-4 shrink-0 text-emerald-400"></lucide-icon>{{ feature }}</li> }
              </ul>
              @if (plan.tier !== 'FREE') {
                <div class="mb-3 space-y-2">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Método de pago</p>
                  <div class="grid grid-cols-3 gap-1.5">
                    <button type="button" (click)="startPayment(plan.tier, 'card')" [disabled]="busy()" class="rounded-lg border px-2 py-2 text-[10px] font-medium" [ngClass]="selectedTier() === plan.tier && selectedMethod() === 'card' ? 'border-sky-400/60 bg-sky-400/10 text-white' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'">▰ Tarjeta</button>
                    <button type="button" (click)="startPayment(plan.tier, 'apple_pay')" [disabled]="busy()" class="rounded-lg border px-2 py-2 text-[10px] font-medium" [ngClass]="selectedTier() === plan.tier && selectedMethod() === 'apple_pay' ? 'border-sky-400/60 bg-sky-400/10 text-white' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'">● Apple Pay</button>
                    <button type="button" (click)="startPayment(plan.tier, 'google_pay')" [disabled]="busy()" class="rounded-lg border px-2 py-2 text-[10px] font-medium" [ngClass]="selectedTier() === plan.tier && selectedMethod() === 'google_pay' ? 'border-sky-400/60 bg-sky-400/10 text-white' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'">◆ Google Pay</button>
                  </div>
                </div>
              }
              <button (click)="choose(plan.tier)" [disabled]="busy() || subscription.subscription()?.tier === plan.tier"
                class="rounded-lg px-3 py-2.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
                [ngClass]="plan.tier === 'FREE' ? 'border border-zinc-700 text-zinc-200 hover:bg-zinc-900' : 'bg-white text-zinc-950 hover:bg-zinc-200'">
                {{ busy() ? 'Procesando...' : subscription.subscription()?.tier === plan.tier ? 'Plan actual' : plan.tier === 'FREE' ? 'Cambiar a Free' : 'Elegir ' + plan.name }}
              </button>
            </article>
          }
        </div>
      }
      @if (selectedTier(); as tier) {
        <section class="mx-auto w-full max-w-2xl space-y-4 rounded-2xl border border-sky-400/20 bg-zinc-950/70 p-5">
          <div class="flex items-center justify-between gap-4"><div><h2 class="text-sm font-semibold text-white">Pago de {{ tierLabel(tier) }}</h2><p class="mt-1 text-xs text-zinc-500">{{ methodLabel(selectedMethod()) }} · pago seguro con Stripe</p></div><button type="button" (click)="closePayment()" aria-label="Cerrar pago" class="text-zinc-500 hover:text-white">✕</button></div>
          @if (!environment.stripePublishableKey) {
            <p class="text-xs leading-relaxed text-amber-200/80">Falta configurar VITE_STRIPE_PUBLISHABLE_KEY en el entorno de compilación y copiarla a environment.ts. Puedes continuar con la página de Checkout como alternativa.</p>
            <button type="button" (click)="choose(tier)" [disabled]="busy()" class="premium-primary-button">Continuar con Checkout</button>
          } @else {
            <div id="stripe-payment-element" class="min-h-24 rounded-xl bg-white p-3"></div>
            @if (paymentError()) { <p role="alert" class="text-xs text-red-300">{{ paymentError() }}</p> }
            <button type="button" (click)="confirmInPagePayment()" [disabled]="busy() || !paymentReady()" class="premium-primary-button">{{ busy() ? 'Procesando pago...' : 'Pagar con Stripe' }}</button>
            <p class="text-[10px] text-zinc-500">Apple Pay y Google Pay aparecen si Stripe, el navegador y el dispositivo los admiten.</p>
          }
        </section>
      }
      @if (subscription.subscription(); as current) {
        <section class="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <div><h2 class="text-sm font-medium text-white">Gestión de suscripción</h2><p class="mt-1 text-xs text-zinc-500">{{ current.cancelAtPeriodEnd ? 'Tu plan terminará' : 'Próxima renovación' }} {{ current.currentPeriodEnd ? (current.currentPeriodEnd | date:'mediumDate') : 'según tu periodo actual' }}.</p></div>
          @if (current.tier !== 'FREE' && !current.cancelAtPeriodEnd) { <button (click)="cancel()" [disabled]="busy()" class="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900">Cancelar al final del periodo</button> }
        </section>
      }
    </section>
  `
})
export class PricingComponent implements OnInit {
  readonly environment = environment;
  readonly subscription = inject(SubscriptionService);
  private toast = inject(ToastService);
  private router = inject(Router);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly selectedTier = signal<SubscriptionTier | null>(null);
  readonly selectedMethod = signal<PaymentMethod>('card');
  readonly paymentReady = signal(false);
  readonly paymentError = signal('');
  private stripe: StripeLike | null = null;
  private stripeElements: StripeElementsLike | null = null;
  private paymentElement: StripePaymentElementLike | null = null;

  ngOnInit(): void {
    this.subscription.loadPlans().subscribe({ next: () => this.loading.set(false), error: err => { this.loading.set(false); this.toast.errorFor(err, 'No se pudieron cargar los planes.'); } });
    this.subscription.getMine().subscribe({ error: err => this.toast.errorFor(err, 'No se pudo cargar tu suscripción.') });
  }

  tierLabel(tier: SubscriptionTier): string { return tier === 'PREMIUM_PLUS' ? 'Premium Plus' : tier[0] + tier.slice(1).toLowerCase(); }

  methodLabel(method: PaymentMethod): string {
    return method === 'card' ? 'Tarjeta' : method === 'apple_pay' ? 'Apple Pay' : 'Google Pay';
  }

  startPayment(tier: SubscriptionTier, method: PaymentMethod): void {
    this.selectedTier.set(tier);
    this.selectedMethod.set(method);
    this.paymentReady.set(false);
    this.paymentError.set('');
    this.stripeElements = null;
    this.paymentElement?.unmount();
    this.paymentElement = null;
    if (!environment.stripePublishableKey) return;
    this.busy.set(true);
    this.loadStripe().then(stripe => {
      this.stripe = stripe;
      this.subscription.createPaymentIntent(tier).subscribe({
        next: ({ clientSecret }) => {
          this.busy.set(false);
          this.stripeElements = stripe.elements({ clientSecret });
          setTimeout(() => {
            if (!this.selectedTier() || !this.stripeElements) return;
            this.paymentElement = this.stripeElements.create('payment', { layout: 'tabs' });
            this.paymentElement.mount('#stripe-payment-element');
            this.paymentReady.set(true);
          });
        },
        error: err => { this.busy.set(false); this.paymentError.set('No se pudo iniciar el pago. Inténtalo de nuevo o usa Checkout.'); this.toast.errorFor(err, 'No se pudo iniciar el pago.'); }
      });
    }).catch(() => { this.busy.set(false); this.paymentError.set('No se pudo cargar Stripe.js. Comprueba tu conexión e inténtalo de nuevo.'); });
  }

  confirmInPagePayment(): void {
    if (!this.stripe || !this.stripeElements || !this.paymentReady() || this.busy()) return;
    this.busy.set(true);
    this.stripe.confirmPayment({
      elements: this.stripeElements,
      confirmParams: { return_url: `${window.location.origin}/dashboard/subscription?payment=success` },
      redirect: 'if_required'
    }).then(result => {
      this.busy.set(false);
      if (result.error) { this.paymentError.set(result.error.message || 'Stripe no pudo confirmar el pago.'); return; }
      if (result.paymentIntent?.status === 'succeeded') {
        this.toast.success('Pago confirmado. Actualizando tu plan…');
        this.subscription.getMine().subscribe({ error: err => this.toast.errorFor(err, 'No se pudo actualizar el estado del plan.') });
        this.closePayment();
      }
    }).catch(() => { this.busy.set(false); this.paymentError.set('No se pudo confirmar el pago. Inténtalo de nuevo.'); });
  }

  closePayment(): void {
    this.stripeElements = null;
    this.stripe = null;
    this.paymentElement?.unmount();
    this.paymentElement = null;
    this.selectedTier.set(null);
    this.paymentReady.set(false);
  }

  private loadStripe(): Promise<StripeLike> {
    if (window.Stripe) return Promise.resolve(window.Stripe(environment.stripePublishableKey));
    return new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-stripe-js]');
      const script = existing || document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.dataset['stripeJs'] = 'true';
      script.onload = () => window.Stripe ? resolve(window.Stripe(environment.stripePublishableKey)) : reject(new Error('Stripe.js no disponible'));
      script.onerror = () => reject(new Error('No se pudo cargar Stripe.js'));
      if (!existing) document.head.appendChild(script);
    });
  }

  choose(tier: SubscriptionTier): void {
    this.busy.set(true);
    const request: Observable<{ checkoutUrl?: string; subscription?: SubscriptionSummary }> = environment.billingSimulate
      ? this.subscription.activateForDevelopment(tier).pipe(map(subscription => ({ subscription })))
      : this.subscription.checkout(tier);
    request.subscribe({
      next: result => {
        this.busy.set(false);
        if ('checkoutUrl' in result && result.checkoutUrl) { window.location.assign(result.checkoutUrl); return; }
        this.toast.success('Tu plan se actualizó.');
        if (tier === 'FREE') this.router.navigateByUrl('/dashboard/kanban');
      },
      error: err => { this.busy.set(false); this.toast.errorFor(err, 'No se pudo cambiar el plan.'); }
    });
  }

  cancel(): void {
    this.busy.set(true);
    this.subscription.cancel().subscribe({ next: () => { this.busy.set(false); this.toast.success('La cancelación quedó programada para el final del periodo.'); }, error: err => { this.busy.set(false); this.toast.errorFor(err, 'No se pudo cancelar la suscripción.'); } });
  }
}
