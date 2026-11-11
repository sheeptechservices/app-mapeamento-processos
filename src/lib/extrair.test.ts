import { describe, expect, it } from 'vitest';
import { extrairProcesso } from './extrair';

const areas = [
  { id: 'a-fiscal', nome: 'Fiscal' },
  { id: 'a-dp', nome: 'Departamento Pessoal' },
];

describe('extrairProcesso', () => {
  it('interpreta o exemplo do PRD', () => {
    const p = extrairProcesso(
      'o fiscal importa XML de uns 300 clientes por mês, cada um leva uns 10 minutos, e erra muito no SPED',
      areas,
    );
    expect(p.area_id).toBe('a-fiscal');
    expect(p.vezes_mes).toBe(300);
    expect(p.tempo_medio_min).toBe(10);
    expect(p.gargalos).toBe('Erra muito no SPED');
    expect(p.titulo).toBe('Importa XML de clientes');
    expect(p.descricao).toContain('300 clientes');
  });

  it('converte por dia e por semana em vezes por mês', () => {
    expect(extrairProcesso('emitem 15 notas por dia', []).vezes_mes).toBe(330);
    expect(extrairProcesso('fazem 3 vezes por semana a conciliação', []).vezes_mes).toBe(13);
  });

  it('lê horas como minutos e não confunde tempo com volume', () => {
    const p = extrairProcesso('o fechamento leva 2 horas, 4 vezes por mês', []);
    expect(p.tempo_medio_min).toBe(120);
    expect(p.vezes_mes).toBe(4);
    const q = extrairProcesso('cada guia leva 5 min por dia', []);
    expect(q.tempo_medio_min).toBe(5);
    expect(q.vezes_mes).toBeNull();
  });

  it('pega pessoas e perda em reais', () => {
    const p = extrairProcesso('3 pessoas fazem isso e perdem uns R$ 2.500 por mês em multa', []);
    expect(p.pessoas_envolvidas).toBe(3);
    expect(p.perda_mes).toBe(2500);
    expect(p.vezes_mes).toBeNull(); // "R$ 2.500 por mês" é perda, não volume
    expect(extrairProcesso('o retrabalho custa 4 mil reais', []).perda_mes).toBe(4000);
    expect(extrairProcesso('risco de R$ 12 mil', []).perda_mes).toBe(12000);
  });

  it('reconhece apelido de área existente e sugere área nova', () => {
    const dp = extrairProcesso('o DP digita o ponto de 85 funcionários', areas);
    expect(dp.area_id).toBe('a-dp');
    expect(dp.pessoas_envolvidas).toBeNull();
    const nova = extrairProcesso('o comercial monta proposta no Word', areas);
    expect(nova.area_id).toBeNull();
    expect(nova.area_nova).toBe('Comercial');
    expect(extrairProcesso('o comercial monta 40 propostas por mês no Word', areas).titulo).toBe('Monta propostas no Word');
  });

  it('não inventa número: texto sem quantidade fica com os campos vazios', () => {
    const p = extrairProcesso('a recepção confirma consultas pelo WhatsApp e às vezes esquece', []);
    expect(p.vezes_mes).toBeNull();
    expect(p.tempo_medio_min).toBeNull();
    expect(p.perda_mes).toBeNull();
    expect(p.pessoas_envolvidas).toBeNull();
    expect(p.area_nova).toBe('Atendimento');
    expect(p.gargalos).toContain('esquece');
  });
});
