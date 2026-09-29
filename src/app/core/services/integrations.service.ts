import { Injectable, computed, signal } from '@angular/core';

import { IntegrationCategory } from '../models';
import { temSupabase } from './supabase-client';

interface IntegracaoSeed extends Omit<IntegrationCategory, 'integrada'> {
  exigeSupabase: boolean;
}

const SEED: IntegracaoSeed[] = [
  {
    id: 'supabase',
    nome: 'Supabase',
    descricao: 'Contas, transações e leads no Postgres com RLS.',
    icone: '⛁',
    exigeLogin: false,
    exigeSupabase: true,
    doAmbiente: true,
    detalhe: 'Banco de dados do projeto compartilhado angular-portfolio.',
  },
  {
    id: 'brapi',
    nome: 'BrAPI',
    descricao: 'Cotações de ativos da B3 em tempo quase real.',
    icone: '↗',
    exigeLogin: false,
    exigeSupabase: false,
    doAmbiente: false,
    detalhe: 'brapi.dev — 20 req/min sem token. Token amplia o limite.',
  },
  {
    id: 'b3',
    nome: 'B3 / BOVESPA',
    descricao: 'Posições em renda variável e FIIs.',
    icone: '◫',
    exigeLogin: true,
    exigeSupabase: true,
    doAmbiente: false,
    detalhe: 'Conta DemoTrade. A leitura de carteira é por planilha; a API é paga.',
  },
  {
    id: 'tesouro-direto',
    nome: 'Tesouro Direto',
    descricao: 'Renda fixa: Tesouro Selic, IPCA+ e CDB do banco.',
    icone: '◇',
    exigeLogin: true,
    exigeSupabase: true,
    doAmbiente: false,
    detalhe: 'Treasury Direct do Tesouro Nacional. Sem API oficial pública.',
  },
  {
    id: 'binance',
    nome: 'Binance',
    descricao: 'Carteira de cripto em conta spot.',
    icone: '◆',
    exigeLogin: true,
    exigeSupabase: false,
    doAmbiente: false,
    detalhe: 'Chave de API somente leitura, sem permissão de saque.',
  },
  {
    id: 'clarity',
    nome: 'Microsoft Clarity',
    descricao: 'Mapa de calor e gravação de sessão.',
    icone: '◉',
    exigeLogin: false,
    exigeSupabase: false,
    doAmbiente: false,
    detalhe: 'Snippet carrega só quando CLARITY_PROJECT_ID está definido.',
  },
];

/**
 * Registro de integrações. O estado de cada conexão é local e persistido em
 * `localStorage`: o objetivo é mostrar a arquitetura de conexão (o que exige
 * login, o que tem cota, o que está ligado) sem fingir uma API que não existe.
 *
 * A única integração com estado real é o Supabase, derivada de `temSupabase()`
 * — as demais ficam em "disponível" até o usuário conectar.
 */
@Injectable({ providedIn: 'root' })
export class IntegrationsService {
  private readonly STORAGE_KEY = 'ledger:integracoes';

  private readonly _conectadas = signal<Set<string>>(this.ler());

  readonly conectadas = this._conectadas.asReadonly();

  readonly integracoes = computed<IntegrationCategory[]>(() => {
    const conectadas = this._conectadas();
    return SEED.map(({ exigeSupabase, ...resto }) => ({
      ...resto,
      integrada: exigeSupabase ? temSupabase() || conectadas.has(resto.id) : conectadas.has(resto.id),
    }));
  });

  readonly conectadasCount = computed(() => this.integracoes().filter((i) => i.integrada).length);

  readonly disponiveisCount = computed(() => this.integracoes().length - this.conectadasCount());

  readonly temSupabase = temSupabase;

  isConectada(id: string): boolean {
    return this.integracoes().find((i) => i.id === id)?.integrada ?? false;
  }

  alternar(id: string): void {
    // O Supabase não é alternável: ele é ditado pelo ambiente.
    if (id === 'supabase') return;

    const proximo = new Set(this._conectadas());
    if (proximo.has(id)) {
      proximo.delete(id);
    } else {
      proximo.add(id);
    }
    this._conectadas.set(proximo);
    this.gravar(proximo);
  }

  private ler(): Set<string> {
    try {
      const bruto = localStorage.getItem(this.STORAGE_KEY);
      if (!bruto) return new Set();
      const lista: unknown = JSON.parse(bruto);
      return new Set(Array.isArray(lista) ? lista.filter((v): v is string => typeof v === 'string') : []);
    } catch {
      // localStorage bloqueado (aba anônima, iframe) não pode derrubar o app.
      return new Set();
    }
  }

  private gravar(ids: Set<string>): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([...ids]));
    } catch {
      // Idem: sem persistência, segue valendo só nesta sessão.
    }
  }
}
