import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface Aba {
  id: string;
  label: string;
  icon: string;
  descricao: string;
}

@Component({
  selector: 'app-integrations-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="space-y-6">
      <header>
        <p class="text-sm text-mute">Central de integrações</p>
        <h1 class="mt-1 text-3xl font-bold tracking-tight">Integrações</h1>
        <p class="mt-1 max-w-2xl text-sm text-mute">
          Cada aba é um quadro independente, como os boards do monday: carteira, mercado e
          conexões ficam separados, mas compartilham os mesmos dados.
        </p>
      </header>

      <nav aria-label="Quadros de integração" class="border-b border-border">
        <ul class="-mb-px flex gap-1 overflow-x-auto">
          @for (aba of abas; track aba.id) {
            <li>
              <a
                [routerLink]="['/integracoes', aba.id]"
                routerLinkActive="aria-current:page"
                [attr.title]="aba.descricao"
                class="flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-mute transition-colors hover:border-border hover:text-cream"
              >
                <span aria-hidden="true">{{ aba.icon }}</span>
                {{ aba.label }}
              </a>
            </li>
          }
        </ul>
      </nav>

      <router-outlet />
    </div>
  `,
  styles: [
    `
      :host ::ng-deep a[aria-current='page'] {
        border-bottom-color: var(--color-brand);
        color: var(--color-brand-soft);
      }
    `,
  ],
})
export class IntegrationsLayout {
  protected readonly abas: Aba[] = [
    { id: 'visao-geral', label: 'Visão geral', icon: '▦', descricao: 'Resumo de tudo' },
    { id: 'investimentos', label: 'Investimentos', icon: '↗', descricao: 'Carteira e alocação' },
    { id: 'cotacoes', label: 'Cotações', icon: '◈', descricao: 'Mercado em tempo real' },
    { id: 'conexoes', label: 'Conexões', icon: '⇄', descricao: 'Contas e APIs ligadas' },
    { id: 'configuracoes', label: 'Configurações', icon: '⚙', descricao: 'Preferências do app' },
  ];
}
