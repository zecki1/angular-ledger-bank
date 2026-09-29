import { TestBed } from '@angular/core/testing';

import { IntegrationsService } from './integrations.service';

const CHAVE = 'ledger:integracoes';

describe('IntegrationsService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('publica o catálogo completo', () => {
    const servico = TestBed.inject(IntegrationsService);
    const ids = servico.integracoes().map((i) => i.id);

    expect(ids).toEqual(['supabase', 'brapi', 'b3', 'tesouro-direto', 'binance', 'clarity']);
  });

  it('marca o que é gerenciado pelo ambiente, sem botão de conectar', () => {
    const servico = TestBed.inject(IntegrationsService);
    expect(servico.integracoes().filter((i) => i.doAmbiente).map((i) => i.id)).toEqual(['supabase']);
  });

  it('não marca o Supabase como exigindo login externo', () => {
    const servico = TestBed.inject(IntegrationsService);
    expect(servico.integracoes().find((i) => i.id === 'supabase')?.exigeLogin).toBe(false);
  });

  it('marca o que exige login externo', () => {
    const servico = TestBed.inject(IntegrationsService);
    const comLogin = servico.integracoes().filter((i) => i.exigeLogin).map((i) => i.id);

    expect(comLogin).toEqual(['b3', 'tesouro-direto', 'binance']);
  });

  it('conta conectadas e disponíveis', () => {
    const servico = TestBed.inject(IntegrationsService);
    const total = servico.integracoes().length;

    expect(servico.conectadasCount()).toBe(0);
    expect(servico.disponiveisCount()).toBe(total);

    servico.alternar('brapi');
    expect(servico.conectadasCount()).toBe(1);
    expect(servico.disponiveisCount()).toBe(total - 1);
  });

  it('alterna uma integração nos dois sentidos', () => {
    const servico = TestBed.inject(IntegrationsService);

    servico.alternar('clarity');
    expect(servico.isConectada('clarity')).toBe(true);

    servico.alternar('clarity');
    expect(servico.isConectada('clarity')).toBe(false);
  });

  it('isConectada responde false para id desconhecido', () => {
    const servico = TestBed.inject(IntegrationsService);
    expect(servico.isConectada('nao-existe')).toBe(false);
  });

  it('não deixa o usuário alternar o Supabase', () => {
    const servico = TestBed.inject(IntegrationsService);
    const antes = servico.isConectada('supabase');

    servico.alternar('supabase');

    expect(servico.isConectada('supabase')).toBe(antes);
  });

  it('persiste o estado em localStorage', () => {
    const servico = TestBed.inject(IntegrationsService);
    servico.alternar('binance');

    expect(JSON.parse(localStorage.getItem(CHAVE) ?? '[]')).toEqual(['binance']);
  });

  it('relê o estado salvo em uma nova instância', () => {
    TestBed.inject(IntegrationsService).alternar('b3');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});

    const novo = TestBed.inject(IntegrationsService);
    expect(novo.isConectada('b3')).toBe(true);
    expect(novo.conectadasCount()).toBe(1);
  });

  it('ignora conteúdo corrompido no localStorage', () => {
    localStorage.setItem(CHAVE, '{isto nao e json');
    const servico = TestBed.inject(IntegrationsService);
    expect(servico.conectadasCount()).toBe(0);
  });

  it('descarta valores que não são strings', () => {
    localStorage.setItem(CHAVE, JSON.stringify(['brapi', 42, null, { a: 1 }]));
    const servico = TestBed.inject(IntegrationsService);
    expect(servico.isConectada('brapi')).toBe(true);
    expect(servico.conectadasCount()).toBe(1);
  });

  it('ignora um JSON que não é lista', () => {
    localStorage.setItem(CHAVE, JSON.stringify({ brapi: true }));
    const servico = TestBed.inject(IntegrationsService);
    expect(servico.conectadasCount()).toBe(0);
  });
});
