import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

export { echarts };
export type { EChartsCoreOption } from 'echarts/core';

/**
 * Registro mínimo do ECharts: linha e barra para séries temporais, rosca para
 * alocação de carteira, mais grade, legenda, tooltip e renderer de canvas.
 *
 * O import direto de `echarts` traz os ~1 MB da lib inteira; registrar apenas o
 * que o app usa derruba o chunk de `echarts` em ~2x — o tipo `ECharts`
 * continua vindo de `echarts/core`, que é tree-shakeable.
 */
let registered = false;

export function registerCharts(): void {
  if (registered) {
    return;
  }
  echarts.use([
    LineChart,
    BarChart,
    PieChart,
    GridComponent,
    LegendComponent,
    TooltipComponent,
    CanvasRenderer,
  ]);
  registered = true;
}
