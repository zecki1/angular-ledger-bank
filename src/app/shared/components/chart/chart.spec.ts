import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { Chart } from './chart';

// O componente importa `init` de `echarts/core` (registro modular), não de
// `echarts` — o mock precisa cobrir o mesmo entry point.
const echartsMock = vi.hoisted(() => {
  const chart = { setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn() };
  return { init: vi.fn(() => chart), use: vi.fn(), chart };
});

vi.mock('echarts/core', () => echartsMock);

describe('Chart', () => {
  beforeEach(async () => {
    echartsMock.init.mockClear();
    echartsMock.use.mockClear();
    echartsMock.chart.setOption.mockClear();
    echartsMock.chart.dispose.mockClear();
    await TestBed.configureTestingModule({ imports: [Chart] }).compileComponents();
  });

  function create(width = 0): ComponentFixture<Chart> {
    const fixture = TestBed.createComponent(Chart);
    fixture.componentRef.setInput('option', { series: [{ type: 'line', data: [1, 2] }] });
    fixture.componentRef.setInput('ariaLabel', 'Gráfico de fluxo de caixa dos últimos 30 dias em reais');
    fixture.detectChanges();
    if (width > 0) {
      const node = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="img"]');
      if (node) {
        Object.defineProperty(node, 'clientWidth', { configurable: true, get: () => width });
        fixture.componentInstance.ngAfterViewInit();
      }
    }
    return fixture;
  }

  it('renderiza o contêiner com papel de imagem e rótulo acessível', () => {
    const fixture = create(300);
    const node = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('[role="img"]');
    expect(node).not.toBeNull();
    expect(node?.getAttribute('aria-label')).toBe(
      'Gráfico de fluxo de caixa dos últimos 30 dias em reais',
    );
    expect(node?.getAttribute('tabindex')).toBe('0');
  });

  it('registra os módulos do ECharts uma única vez', () => {
    // `registerCharts()` tem guarda de módulo: chamar em todo `init` seria
    // trabalho repetido. Só o primeiro `ngAfterViewInit` paga o registro.
    echartsMock.use.mockClear();
    create(300);
    create(300);
    expect(echartsMock.use.mock.calls.length).toBeLessThanOrEqual(1);
    expect(echartsMock.init).toHaveBeenCalled();
  });

  it('inicializa o ECharts e aplica a opção quando há largura', () => {
    create(300);
    expect(echartsMock.init).toHaveBeenCalledTimes(1);
    expect(echartsMock.chart.setOption).toHaveBeenCalledTimes(1);
  });

  it('não inicializa sem largura (jsdom/guard)', () => {
    create(0);
    expect(echartsMock.init).not.toHaveBeenCalled();
  });

  it('libera o gráfico ao destruir', () => {
    const fixture = create(300);
    fixture.destroy();
    expect(echartsMock.chart.dispose).toHaveBeenCalledTimes(1);
  });
});
