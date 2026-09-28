import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { IntegrationsService } from '../../../core/services/integrations.service';

@Component({
  selector: 'app-connections-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './connections-page.html',
  styles: [':host { display: block; }'],
})
export class ConnectionsPage {
  protected readonly integrations = inject(IntegrationsService);

  protected readonly integracoes = this.integrations.integracoes;
  protected readonly conectadas = computed(() =>
    this.integracoes().filter((i) => i.integrada),
  );
  /** Só entra aqui o que o usuário realmente pode ligar. */
  protected readonly disponiveis = computed(() =>
    this.integracoes().filter((i) => !i.integrada && !i.doAmbiente),
  );
  /** Estado ditado pelo ambiente: mostra o status, sem botão de conectar. */
  protected readonly doAmbiente = computed(() => this.integracoes().filter((i) => i.doAmbiente));
  protected readonly temSupabase = this.integrations.temSupabase;

  protected alternar(id: string): void {
    this.integrations.alternar(id);
  }
}
