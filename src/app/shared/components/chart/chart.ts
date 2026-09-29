import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { ECharts, init } from 'echarts/core';

import { EChartsCoreOption, registerCharts } from '../../../core/echarts';
import { ThemeService } from '../../../core/services/theme.service';
import { readChartPalette } from '../../../core/utils/chart-theme';

@Component({
  selector: 'app-chart',
  standalone: true,
  template: `
    <div
      #container
      class="h-64 w-full"
      role="img"
      [attr.aria-label]="ariaLabel()"
      tabindex="0"
    ></div>
  `,
  styles: [':host { display: block; }'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chart implements AfterViewInit, OnDestroy {
  readonly option = input.required<EChartsCoreOption>();
  readonly ariaLabel = input('Gráfico');

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly theme = inject(ThemeService);
  private chart?: ECharts;
  private resizeObserver?: ResizeObserver;

  constructor() {
    // Reaplica a série quando o tema muda, para os eixos e a grade acompanharem
    // o contraste do modo claro.
    effect(() => {
      this.theme.theme();
      untracked(() => this.applyOption());
    });
  }

  ngAfterViewInit(): void {
    const node = this.el.nativeElement.querySelector<HTMLElement>('[role="img"]');
    if (!node || node.clientWidth === 0) {
      return;
    }

    registerCharts();
    this.chart = init(node);
    this.applyOption();

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.chart?.resize());
      this.resizeObserver.observe(node);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  private applyOption(): void {
    const palette = readChartPalette(this.el.nativeElement);
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.chart?.setOption(
      {
        color: [palette.brand],
        textStyle: { color: palette.mute },
        ...this.option(),
        animation: !prefersReducedMotion,
      },
      { notMerge: true },
    );
  }
}
