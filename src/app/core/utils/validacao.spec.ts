import { describe, expect, it } from 'vitest';

import {
  avaliarSenha,
  dataBrParaIso,
  idadeEmAnos,
  mascararCpf,
  mascararData,
  somenteDigitos,
  validarCpf,
} from './validacao';

describe('validarCpf', () => {
  it('aceita CPFs válidos', () => {
    expect(validarCpf('529.982.247-25')).toBe(true);
    expect(validarCpf('52998224725')).toBe(true);
  });

  it('rejeita CPF com dígito verificador errado', () => {
    expect(validarCpf('529.982.247-24')).toBe(false);
  });

  it('rejeita sequências repetidas mesmo com tamanho certo', () => {
    expect(validarCpf('111.111.111-11')).toBe(false);
    expect(validarCpf('00000000000')).toBe(false);
  });

  it('rejeita tamanhos diferentes de 11 dígitos', () => {
    expect(validarCpf('')).toBe(false);
    expect(validarCpf('123')).toBe(false);
    expect(validarCpf('529982247251')).toBe(false);
  });
});

describe('mascaras', () => {
  it('mascara CPF progressivamente', () => {
    expect(mascararCpf('529')).toBe('529');
    expect(mascararCpf('529982')).toBe('529.982');
    expect(mascararCpf('52998224725')).toBe('529.982.247-25');
  });

  it('ignora caracteres extras ao colar', () => {
    expect(mascararCpf('529.982.247-25abc')).toBe('529.982.247-25');
  });

  it('mascara data no formato brasileiro', () => {
    expect(mascararData('0101')).toBe('01/01');
    expect(mascararData('01012000')).toBe('01/01/2000');
    expect(mascararData('01/01/2000')).toBe('01/01/2000');
  });
});

describe('dataBrParaIso', () => {
  it('converte data brasileira para ISO', () => {
    expect(dataBrParaIso('01/02/2000')).toBe('2000-02-01');
  });

  it('retorna vazio quando incompleta', () => {
    expect(dataBrParaIso('01/02')).toBe('');
  });
});

describe('idadeEmAnos', () => {
  const referencia = new Date('2026-10-16T12:00:00');

  it('calcula a idade completa', () => {
    expect(idadeEmAnos('2000-10-15', referencia)).toBe(26);
  });

  it('não conta o ano quando o aniversário ainda não chegou', () => {
    expect(idadeEmAnos('2000-10-17', referencia)).toBe(25);
    expect(idadeEmAnos('2008-10-17', referencia)).toBe(17);
  });

  it('retorna -1 para data inválida', () => {
    expect(idadeEmAnos('', referencia)).toBe(-1);
  });
});

describe('avaliarSenha', () => {
  it('marca senha fraca sem os requisitos', () => {
    const forca = avaliarSenha('abc');
    expect(forca.valida).toBe(false);
    expect(forca.requisitos.find((r) => r.id === 'tamanho')?.atendido).toBe(false);
  });

  it('considera válida a senha forte', () => {
    const forca = avaliarSenha('Senha@123');
    expect(forca.valida).toBe(true);
    expect(forca.requisitos.every((r) => r.atendido)).toBe(true);
    expect(forca.pontuacao).toBeGreaterThan(80);
  });

  it('sinaliza cada requisito individualmente', () => {
    const forca = avaliarSenha('senha123');
    expect(forca.requisitos.find((r) => r.id === 'maiuscula')?.atendido).toBe(false);
    expect(forca.requisitos.find((r) => r.id === 'minuscula')?.atendido).toBe(true);
    expect(forca.requisitos.find((r) => r.id === 'numero')?.atendido).toBe(true);
    expect(forca.requisitos.find((r) => r.id === 'simbolo')?.atendido).toBe(false);
  });
});

describe('somenteDigitos', () => {
  it('remove tudo que não for dígito', () => {
    expect(somenteDigitos('a1.b2-c3')).toBe('123');
  });
});
