import { afterRenderEffect, Directive, effect, ElementRef, inject, Input, OnDestroy } from '@angular/core';
import { animate, AnimationOptions } from '@motionone/dom';

/**
 * Diretiva Angular mínima para Motion One (`@motionone/dom`).
 *
 * Usa change detection minimalista e roda efeitos apenas no cliente. Respeita
 * `prefers-reduced-motion`: Motion One já reduz/ignora animações nesse caso,
 * mas também podemos pular a inicialização quando desejado.
 *
 * Uso:
 * ```html
 * <div appMotion [appMotionIn]="{ opacity: [0,1], y: [8,0], duration: 0.25 }">
 * ```
 */
@Directive({
  selector: '[appMotion]',
  standalone: true,
})
export class MotionDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>).nativeElement;

  /** Opções para animação de entrada (aplicadas quando elemento entra). */
  @Input('appMotionIn') inOptions?: AnimationOptions | AnimationOptions[];

  /** Opções para animação de saída (executada antes de remoção). */
  @Input('appMotionOut') outOptions?: AnimationOptions | AnimationOptions[];

  /** Se true, não anima (ignora). Útil p/ prefers-reduced-motion. */
  @Input('appMotionDisabled') disabled = false;

  /** Se true, anima já no primeiro render (sem esperar "enter"). */
  @Input('appMotionImmediate') immediate = false;

  /** Estado interno: já animou entrada? */
  private entered = false;

  constructor() {
    // Animação de entrada
    effect(() => {
      const opts = this.inOptions;
      if (this.disabled || this.entered || !opts) return;
      if (this.immediate || this.isInView()) {
        void this.run(opts);
        this.entered = true;
      }
    });

    // Observa quando o elemento aparece no viewport (lazy)
    afterRenderEffect(() => {
      if (this.disabled || this.entered || !this.inOptions) return;
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              void this.run(this.inOptions!);
              this.entered = true;
              io.unobserve(this.el);
            }
          });
        },
        { threshold: 0.05 }
      );
      io.observe(this.el);
      return () => io.disconnect();
    });
  }

  ngOnDestroy(): void {
    // noop
  }

  /** Executa animação (entrada). Aceita array de keyframes/anim. */
  private async run(opts: AnimationOptions | AnimationOptions[]): Promise<void> {
    try {
      if (Array.isArray(opts)) {
        // anima em sequência? Motion One timeline faria melhor, mas array simples: roda primeira
        await animate(this.el, opts[0]);
        for (let i = 1; i < opts.length; i++) {
          await animate(this.el, opts[i]);
        }
        return;
      }
      await animate(this.el, opts);
    } catch {
      // Silencia falhas de animação (não bloqueia render)
    }
  }

  /** Heurística simples: considera visível se já está no viewport. */
  private isInView(): boolean {
    if (typeof window === 'undefined') return false;
    const rect = this.el.getBoundingClientRect();
    return rect.top < window.innerHeight && rect.bottom > 0;
  }
}
