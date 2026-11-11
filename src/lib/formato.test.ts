import { describe, expect, it } from 'vitest';
import { lerDataBr, lerNumero, mascaraCnpj, mascaraData, mascaraTelefone } from './formato';

describe('formato pt-BR', () => {
  it('lê número digitado com vírgula e milhar', () => {
    expect(lerNumero('1.234,5')).toBe(1234.5);
    expect(lerNumero('12,5')).toBe(12.5);
    expect(lerNumero('300')).toBe(300);
    expect(lerNumero('410.000')).toBe(410000);
    expect(lerNumero('')).toBeNull();
  });

  it('mascara CNPJ e telefone enquanto digita', () => {
    expect(mascaraCnpj('12345678000190')).toBe('12.345.678/0001-90');
    expect(mascaraCnpj('1234')).toBe('12.34');
    expect(mascaraTelefone('44998124410')).toBe('(44) 99812-4410');
    expect(mascaraTelefone('4430297781')).toBe('(44) 3029-7781');
  });

  it('data DD/MM/AAAA válida vira ISO; impossível vira null', () => {
    expect(mascaraData('11112026')).toBe('11/11/2026');
    expect(lerDataBr('11/11/2026')).toBe('2026-11-11');
    expect(lerDataBr('31/02/2026')).toBeNull();
    expect(lerDataBr('11/11/20')).toBeNull();
  });
});
