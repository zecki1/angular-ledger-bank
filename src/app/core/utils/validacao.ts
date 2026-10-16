/**
 * Validações do cadastro: CPF, força de senha e idade mínima.
 *
 * Funções puras, sem dependência de Angular, para poderem ser testadas
 * isoladamente e reaproveitadas tanto na tela de cadastro quanto nos specs.
 */

/** Remove tudo que não for dígito. */
export function somenteDigitos(valor: string): string {
  return valor.replace(/\D+/g, '');
}

/**
 * Valida um CPF pelo dígito verificador (algoritmo oficial da Receita).
 *
 * Rejeita comprimentos diferentes de 11 e sequências repetidas
 * (`111.111.111-11` passa na conta mas não é CPF válido).
 */
export function validarCpf(valor: string): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11) {
    return false;
  }
  if (/^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const digito = (ate: number): number => {
    let soma = 0;
    for (let i = 0; i < ate; i++) {
      soma += Number(cpf[i]) * (ate + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  return digito(9) === Number(cpf[9]) && digito(10) === Number(cpf[10]);
}

/** Aplica a máscara `000.000.000-00`, tolerando colagem com pontos/traços. */
export function mascararCpf(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

/** Aplica a máscara `00/00/0000` a partir do que o usuário digita. */
export function mascararData(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 8);
  return d.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}

/** `00/00/0000` → `YYYY-MM-DD` (formato aceito por `input[type=date]` e APIs). */
export function dataBrParaIso(valor: string): string {
  const d = somenteDigitos(valor);
  if (d.length !== 8) {
    return '';
  }
  return `${d.slice(4, 8)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
}

/** Converte `YYYY-MM-DD` em `Date` **local** (sem deslocar por causa do UTC). */
function comoDataLocal(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) {
    return new Date(iso);
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Idade em anos completos na data de referência (default: hoje). */
export function idadeEmAnos(nascimentoIso: string, referencia = new Date()): number {
  const nascimento = comoDataLocal(nascimentoIso);
  if (Number.isNaN(nascimento.getTime())) {
    return -1;
  }
  let idade = referencia.getFullYear() - nascimento.getFullYear();
  const mes = referencia.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && referencia.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
}

/** Maioridade mínima exigida para abrir conta (18 anos). */
export const IDADE_MINIMA = 18;

export interface RequisitoSenha {
  id: 'tamanho' | 'maiuscula' | 'minuscula' | 'numero' | 'simbolo';
  rotulo: string;
  atendido: boolean;
}

export interface ForcaSenha {
  /** 0–100, para a barra de força. */
  pontuacao: number;
  /** `muito fraca` … `muito forte`. */
  rotulo: string;
  requisitos: RequisitoSenha[];
  /** `true` só quando todos os requisitos são atendidos. */
  valida: boolean;
}

/**
 * Avalia uma senha contra o padrão de senha forte: mínimo 8 caracteres, com
 * maiúscula, minúscula, número e símbolo. A pontuação soma os requisitos
 * atendidos e dá um bônus por comprimento (até 100).
 */
export function avaliarSenha(senha: string): ForcaSenha {
  const requisitos: RequisitoSenha[] = [
    { id: 'tamanho', rotulo: 'Mínimo de 8 caracteres', atendido: senha.length >= 8 },
    { id: 'maiuscula', rotulo: 'Uma letra maiúscula', atendido: /[A-Z]/.test(senha) },
    { id: 'minuscula', rotulo: 'Uma letra minúscula', atendido: /[a-z]/.test(senha) },
    { id: 'numero', rotulo: 'Um número', atendido: /\d/.test(senha) },
    { id: 'simbolo', rotulo: 'Um símbolo (!@#$…)', atendido: /[^A-Za-z0-9]/.test(senha) },
  ];

  const atendidos = requisitos.filter((r) => r.atendido).length;
  const bonusComprimento = Math.min(Math.max(senha.length - 8, 0) * 4, 20);
  const pontuacao = Math.min(Math.round((atendidos / requisitos.length) * 80) + bonusComprimento, 100);

  const indice = pontuacao <= 0 ? 0 : Math.min(Math.ceil((pontuacao / 100) * 5) - 1, 4);
  const rotulos = ['muito fraca', 'fraca', 'média', 'forte', 'muito forte'];

  return {
    pontuacao,
    rotulo: rotulos[indice],
    requisitos,
    valida: requisitos.every((r) => r.atendido),
  };
}
