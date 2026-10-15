import { Directive, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Directive({ selector: '[appFocusTrap]', standalone: true })
export class FocusTrapDirective implements OnInit, OnDestroy {
  private readonly host: HTMLElement;
  private previousFocus: HTMLElement | null = null;

  constructor(element: ElementRef<HTMLElement>) { this.host = element.nativeElement; }

  ngOnInit(): void {
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    queueMicrotask(() => this.focusable()[0]?.focus());
  }

  ngOnDestroy(): void { this.previousFocus?.focus(); }

  @HostListener('keydown', ['$event'])
  trap(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const items = this.focusable();
    if (!items.length) { event.preventDefault(); this.host.focus(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !this.host.contains(document.activeElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !this.host.contains(document.activeElement))) {
      event.preventDefault(); first.focus();
    }
  }

  private focusable(): HTMLElement[] {
    return Array.from(this.host.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(item => item.getAttribute('aria-hidden') !== 'true');
  }
}
