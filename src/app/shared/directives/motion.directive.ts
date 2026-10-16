import { afterNextRender, Directive, ElementRef, inject, Input, OnDestroy } from '@angular/core';
import { animate, AnimationOptionsWithOverrides, inView, MotionKeyframesDefinition } from '@motionone/dom';

/**
 * O input aceita keyframes e opções de reprodução no mesmo objeto (é o formato
 * dos exemplos do Motion One). `animate()` espera os dois em argumentos
 * separados, então o wrapper faz a separação em tempo de execução.
 */
type OpcoesMotion = AnimationOptionsWithOverrides & MotionKeyframesDefinition;

/** Chaves que são opções de reprodução e não keyframes. */
const CHAVES_REPRODUCAO = [
  'duration',
  'delay',
  'endDelay',
  'easing',
  'offset',
  'direction',
  'repeat',
  'autoplay',
  'record',
] as const;

/**
 * Diretiva Angular mínima para Motion One (`@motionone/dom`).
 *
 * Motivo: o pacote `@motionone/angular` nunca existiu no npm (ver
 * `docs/decisions/2026-10-16-liquid-motion.md`); o core `@motionone/dom` é
 * framework-agnostic, então este wrap de ~60 linhas o torna Angular-first:
 * standalone, com inputs simples e integração com o ciclo de vida do Angular.
 *
 * Comportamento:
 * - Anima quando o elemento entra no viewport (`inView` do Motion One), ou
 *   imediatamente com `[appMotionNow]` (ex.: conteúdo de aba que já está visível).
 * - **`prefers-reduced-motion: reduce` desliga a animação** — o Motion One não
 *   trata disso sozinho, então a diretiva checa o matchMedia e mostra o
 *   elemento no estado final (visível) sem animar.
 * - O elemento começa com `opacity: 0` só enquanto a animação não roda; se a
 *   animação falhar ou for pulada, um `finally` garante `opacity: 1` — nada
 *   some da tela por causa de animação.
 *
 * Uso:
 * ```html
 * <article [appMotion]="{ opacity: [0, 1], y: [10, 0], duration: 0.35, delay: i * 0.05 }">
 * ```
 */
@Directive({
  selector: '[appMotion]',
  standalone: true,
})
export class MotionDirective implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>).nativeElement;

  /** Opções da animação (formato `animate()` do Motion One). */
  @Input({ alias: 'appMotion' }) options?: OpcoesMotion | null;

  /** Anima já na próxima renderização, sem esperar entrar no viewport. */
  @Input() appMotionNow = false;

  private observerCleanup?: () => void;
  private destruido = false;

  constructor() {
    afterNextRender(() => {
      if (this.destruido || !this.options) {
        return;
      }
      if (prefersReducedMotion()) {
        // Sem animação: elemento já está visível por padrão no DOM.
        return;
      }
      // Esconde enquanto não anima (só quando vamos animar de verdade).
      this.el.style.opacity = '0';

      if (this.appMotionNow) {
        void this.executar();
        return;
      }

      this.observerCleanup = inView(
        this.el,
        () => {
          void this.executar();
        },
        { amount: 0.05 },
      );
    });
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.observerCleanup?.();
    this.el.style.opacity = '';
  }

  private async executar(): Promise<void> {
    if (!this.options) {
      return;
    }

    const keyframes: Record<string, unknown> = {};
    const reproducao: Record<string, unknown> = {};
    for (const [chave, valor] of Object.entries(this.options)) {
      const destino = (CHAVES_REPRODUCAO as readonly string[]).includes(chave) ? reproducao : keyframes;
      destino[chave] = valor;
    }

    try {
      await animate(this.el, keyframes as MotionKeyframesDefinition, reproducao as AnimationOptionsWithOverrides);
    } finally {
      // Estado final visível mesmo se a animação falhar.
      if (!this.destruido) {
        this.el.style.opacity = '';
      }
    }
  }
}

/**
 * `true` quando o usuário pediu menos movimento. Checado a cada chamada para
 * refletir troca de preferência sem reiniciar a página.
 */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
