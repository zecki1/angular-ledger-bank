export interface ChartPalette {
  surface: string;
  border: string;
  cream: string;
  mute: string;
  brand: string;
}

const FALLBACK: ChartPalette = {
  surface: '#14141b',
  border: '#2b2b38',
  cream: '#f4f4f6',
  mute: '#9a9aa8',
  brand: '#8b5cf6',
};

/**
 * Lê os tokens de tema (`styles.css`) do elemento informado.
 *
 * O canvas do ECharts não herda CSS, então o gráfico precisa das mesmas cores
 * que o resto da tela. Ler os tokens — em vez de duplicar a paleta em TypeScript
 * — mantém claro e escuro sempre sincronizados com o design system.
 */
export function readChartPalette(element: Element): ChartPalette {
  if (typeof getComputedStyle !== 'function') {
    return FALLBACK;
  }
  const styles = getComputedStyle(element);
  const read = (token: string, fallback: string): string => {
    const value = styles.getPropertyValue(token).trim();
    return value.length > 0 ? value : fallback;
  };
  return {
    surface: read('--color-surface', FALLBACK.surface),
    border: read('--color-border', FALLBACK.border),
    cream: read('--color-cream', FALLBACK.cream),
    mute: read('--color-mute', FALLBACK.mute),
    brand: read('--color-brand', FALLBACK.brand),
  };
}
