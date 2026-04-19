import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { Cliente, Contrato } from '../types';
import { usePermissoes } from './usePermissoes'; // ✅ Importando as Travas

export function useClientes() {
  const { t, i18n } = useTranslation();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  
  // ✅ Puxando a verificação de permissão
  const { temPermissao } = usePermissoes();

  // 🛡️ MATA DÍZIMAS INFINITAS
  const arredondarMoeda = (valor: number) => {
      return Number(Number(valor).toFixed(2));
  };

  // 🛡️ FORÇA LEITURA EXATA DE NÚMEROS
  const parseNumerico = (val: any) => {
      if (val === undefined || val === null || val === '') return 0;
      if (typeof val === 'string') return Number(val.replace(',', '.'));
      return Number(val);
  };

  const lerDataLocal = useCallback((dataStr: string) => {
     if(!dataStr) return new Date();
     
     if (i18n.language.startsWith('en')) {
        const partes = dataStr.split('/');
        const mes = Number(partes[0]);
        const dia = Number(partes[1]);
        const ano = Number(partes[2]);
        return new Date(ano, mes - 1, dia);
     } 
     
     const partes = dataStr.split('/');
     const dia = Number(partes[0]);
     const mes = Number(partes[1]);
     const ano = Number(partes[2]);
     return new Date(ano, mes - 1, dia);
  }, [i18n.language]);

  const paraBancoISO = useCallback((dataStr: string) => {
     try {
       const d = lerDataLocal(dataStr);
       const ano = d.getFullYear();
       const mes = String(d.getMonth() + 1).padStart(2, '0');
       const dia = String(d.getDate()).padStart(2, '0');
       return `${ano}-${mes}-${dia}`;
     } catch (e) { return new Date().toISOString().split('T')[0]; }
  }, [lerDataLocal]);

  const formatarDataDoBanco = useCallback((dataISO: string) => {
    if (!dataISO) return '';
    if (dataISO.includes('-')) {
       const [ano, mes, dia] = dataISO.split('-');
       if (i18n.language.startsWith('en')) return `${mes}/${dia}/${ano}`;
       return `${dia}/${mes}/${ano}`;
    }
    return dataISO;
  }, [i18n.language]);

  const processarClienteRaw = useCallback((cli: any): Cliente => {
      return {
        id: cli.id,
        nome: cli.nome,
        bloqueado: cli.bloqueado, 
        whatsapp: cli.whatsapp,
        cpf: cli.cpf, 
        endereco: cli.endereco,
        indicacao: cli.indicacao,
        reputacao: cli.reputacao,
        segmento: cli.segmento, 
        foto_com_documento: cli.foto_com_documento,
        foto_apenas_documento: cli.foto_apenas_documento,
        contratos: (cli.contratos || []).map((c: any) => ({
          id: c.id,
          capital: parseNumerico(c.capital),
          taxa: parseNumerico(c.taxa),
          frequencia: c.frequencia,
          status: c.status,
          garantia: c.garantia,
          movimentacoes: c.movimentacoes || [],
          lucroTotal: parseNumerico(c.lucro_total),
          multasPagas: parseNumerico(c.multas_pagas),
          dataInicio: formatarDataDoBanco(c.data_inicio),
          proximoVencimento: formatarDataDoBanco(c.proximo_vencimento),
          valorMultaDiaria: parseNumerico(c.valor_multa_diaria),
          diasDiario: parseNumerico(c.dias_diario),
          diasSemanaDiario: c.dias_semana_diario,
          datasExcluidas: c.datas_excluidas, 
          totalParcelas: parseNumerico(c.total_parcelas),
          parcelasPagas: parseNumerico(c.parcelas_pagas),
          valorParcela: parseNumerico(c.valor_parcela),
          valorUltimaParcela: parseNumerico(c.valor_ultima_parcela),
          lucroJurosPorParcela: parseNumerico(c.lucro_juros_por_parcela)
        })).sort((a: any, b: any) => b.id - a.id)
      };
  }, [formatarDataDoBanco]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*, contratos(*)')
        .order('nome');

      if (error) throw error;

      const formatados = (data || []).map(processarClienteRaw);
      setClientes(formatados);
    } catch (error: any) {
      console.log("Erro:", error.message);
    } finally {
      setLoading(false);
    }
  }, [processarClienteRaw]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refreshCliente = useCallback(async (clienteId: string) => {
      try {
          const { data, error } = await supabase
            .from('clientes')
            .select('*, contratos(*)')
            .eq('id', clienteId)
            .single();
          
          if (!error && data) {
              const clienteAtualizado = processarClienteRaw(data);
              setClientes(prev => prev.map(c => c.id === clienteId ? clienteAtualizado : c));
          }
      } catch (e) { console.log("Erro refreshCliente", e); }
  }, [processarClienteRaw]);

  // 🔥 MÁGICA DA CARTEIRA
  const getActiveUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('team_id, permissoes')
        .eq('user_id', user.id)
        .single();

    if (profile?.team_id && profile.permissoes?.includes('compartilhar_carteira')) {
        const { data: team } = await supabase.from('teams').select('owner_id').eq('id', profile.team_id).single();
        if (team?.owner_id) {
            return team.owner_id; 
        }
    }
    
    return user.id; 
  };

  const garantirCarteira = async () => {
    try {
        const userId = await getActiveUserId(); 
        if (!userId) return null;

        const { data } = await supabase
            .from('contas_pessoais')
            .select('id')
            .eq('nome', 'Carteira')
            .eq('user_id', userId) 
            .limit(1); 
            
        if (data && data.length > 0) return data[0].id;

        const { data: nova } = await supabase
            .from('contas_pessoais')
            .insert([{ 
                nome: 'Carteira', 
                instituicao: 'Automático',
                user_id: userId 
            }])
            .select('id')
            .single();
            
        if (nova?.id) return nova.id;
    } catch (e) { console.log("Erro carteira:", e); }
    return null;
  };

  const totais = useMemo(() => {
    let capitalTotal = 0, lucro = 0, multas = 0, vendas = 0;
    clientes.forEach(cli => {
      (cli.contratos || []).forEach(con => {
        if (con.status === 'ATIVO' || con.status === 'PARCELADO') {
          capitalTotal += (con.capital || 0);
        }
        if (con.frequencia === 'PARCELADO') {
            const recebidoParcelas = arredondarMoeda((con.parcelasPagas || 0) * (con.valorParcela || 0));
            vendas += arredondarMoeda(recebidoParcelas + (con.multasPagas || 0));
        } else {
            lucro += arredondarMoeda(con.lucroTotal || 0);
            multas += arredondarMoeda(con.multasPagas || 0);
        }
      });
    });
    return { capital: arredondarMoeda(capitalTotal), lucro, multas, vendas };
  }, [clientes]);

  // 🔒 TRAVA: CADASTRAR CLIENTE
  const adicionarCliente = useCallback(async (dados: Partial<Cliente>) => {
    if (!temPermissao('cadastrar_cliente')) {
        return Alert.alert(t('common.erro'), "Você não tem permissão para cadastrar clientes.");
    }
    try {
      const activeUserId = await getActiveUserId(); 
      const { error } = await supabase.from('clientes').insert([{
        user_id: activeUserId, 
        nome: dados.nome, whatsapp: dados.whatsapp, cpf: dados.cpf, endereco: dados.endereco, indicacao: dados.indicacao,
        reputacao: dados.reputacao || 'NEUTRA', segmento: dados.segmento,
        foto_com_documento: (dados as any).foto_com_documento,
        foto_apenas_documento: (dados as any).foto_apenas_documento
      }]);
      if (error) throw error;
      await fetchData(); 
    } catch (e) { Alert.alert(t('common.erro'), "Falha ao salvar"); }
  }, [fetchData, t, temPermissao]);

  // 🔒 TRAVA: EDITAR CLIENTE
  const editarCliente = useCallback(async (nomeAntigo: string, dados: Partial<Cliente>) => {
    if (!temPermissao('cadastrar_cliente')) {
        return Alert.alert(t('common.erro'), "Você não tem permissão para editar clientes.");
    }
    const cliente = clientes.find(c => c.nome === nomeAntigo);
    if (!cliente?.id) return;
    try {
        const { error } = await supabase.from('clientes').update({
            nome: dados.nome, whatsapp: dados.whatsapp, cpf: dados.cpf, endereco: dados.endereco, indicacao: dados.indicacao, 
            reputacao: dados.reputacao, segmento: dados.segmento,
            foto_com_documento: (dados as any).foto_com_documento,
            foto_apenas_documento: (dados as any).foto_apenas_documento
        }).eq('id', cliente.id);
        if (error) throw error;
        await fetchData();
    } catch(e) { Alert.alert(t('common.erro'), "Falha ao editar"); }
  }, [clientes, fetchData, t, temPermissao]);

  // 🔒 TRAVA: EXCLUIR CLIENTE
  const excluirCliente = useCallback(async (nomeCliente: string) => {
    if (!temPermissao('cadastrar_cliente')) {
        return Alert.alert(t('common.erro'), "Você não tem permissão para excluir clientes.");
    }
    const cliente = clientes.find(c => c.nome === nomeCliente);
    if (!cliente?.id) return;
    
    try {
        const { error } = await supabase.from('clientes').delete().eq('id', cliente.id);
        if (error) throw error;
        await fetchData();
    } catch (e) {
        Alert.alert(t('common.erro'), "Falha ao excluir cliente. Tente novamente.");
    }
  }, [clientes, fetchData, t, temPermissao]);

  // 🔒 TRAVA: BLOQUEAR CLIENTE
  const alternarBloqueio = useCallback(async (cliente: Cliente) => {
    if (!temPermissao('cadastrar_cliente')) {
        return Alert.alert(t('common.erro'), "Você não tem permissão para bloquear clientes.");
    }
    try {
        if (!cliente.id) return; 
        const novoStatus = !cliente.bloqueado;
        const { error } = await supabase.from('clientes').update({ bloqueado: novoStatus }).eq('id', cliente.id);
        if (error) throw error;
        await refreshCliente(cliente.id);
    } catch (e) { Alert.alert(t('common.erro'), "Não foi possível alterar o bloqueio."); }
  }, [refreshCliente, t, temPermissao]);

  // 🔒 TRAVA: GERAR CONTRATO
  const adicionarContrato = useCallback(async (nomeCliente: string, novoContrato: any) => {
    if (!temPermissao('gerar_contrato')) {
        return Alert.alert(t('common.erro'), "Você não tem permissão para criar novos contratos.");
    }
    const cliente = clientes.find(c => c.nome === nomeCliente);
    if (!cliente?.id) return Alert.alert(t('common.erro'), t('novoContrato.erroCliente'));

    try {
        let tipoReal = novoContrato.tipo;
        if (!tipoReal && novoContrato.garantia && novoContrato.garantia.startsWith('PRODUTO:')) tipoReal = 'VENDA';
        if (!tipoReal) tipoReal = (novoContrato.frequencia === 'PARCELADO') ? 'VENDA' : 'EMPRESTIMO';

        const capitalLido = parseNumerico(novoContrato.capital);

        if (tipoReal === 'EMPRESTIMO') {
            const idCarteira = await garantirCarteira();
            if (idCarteira) {
                // 🔥 SOLUÇÃO: Busca o saldo real da conta no momento, sem usar RPC antiga!
                const { data: dataMov } = await supabase
                    .from('fluxo_pessoal')
                    .select('tipo, valor')
                    .eq('conta_id', idCarteira);
                
                let saldoAtual = 0;
                dataMov?.forEach(m => {
                    if (m.tipo === 'ENTRADA') saldoAtual += Number(m.valor);
                    else if (m.tipo === 'SAIDA') saldoAtual -= Number(m.valor);
                });
                
                if (saldoAtual < capitalLido) {
                    if (Platform.OS === 'web') {
                        const confirmacao = window.confirm(
                            `${t('fluxo.aviso')}\nSaldo insuficiente (R$ ${saldoAtual.toFixed(2)}). Continuar?`
                        );
                        if (!confirmacao) return;
                    } else {
                        const confirmacao = await new Promise<boolean>((resolve) => {
                            Alert.alert(t('fluxo.aviso'), `Saldo insuficiente (R$ ${saldoAtual.toFixed(2)}). Continuar?`, [
                                    { text: t('common.cancelar'), onPress: () => resolve(false), style: 'cancel' },
                                    { text: "Continuar", onPress: () => resolve(true), style: 'destructive' }
                                ]);
                        });
                        if (!confirmacao) return; 
                    }
                }
            }
        }

        const dataBaseStr = novoContrato.dataInicio || new Date().toLocaleDateString(i18n.language);
        
        const addDias = (dStr: string, dias: number) => { 
            const d = lerDataLocal(dStr); 
            d.setDate(d.getDate() + dias); 
            return paraBancoISO(d.toLocaleDateString(i18n.language)); 
        };
        const addMes = (dStr: string, meses: number) => { 
            const d = lerDataLocal(dStr); 
            d.setMonth(d.getMonth() + meses); 
            return paraBancoISO(d.toLocaleDateString(i18n.language)); 
        };

        const jurosLido = parseNumerico(novoContrato.valorJuros);
        let taxaLida = parseNumerico(novoContrato.taxa);
        let valorJurosExato = 0;

        if (jurosLido > 0) {
            valorJurosExato = arredondarMoeda(jurosLido);
            if (capitalLido > 0) {
               taxaLida = (valorJurosExato / capitalLido) * 100;
            }
        } else {
            valorJurosExato = arredondarMoeda(capitalLido * (taxaLida / 100));
        }

        let contratoDB: any = {
            cliente_id: cliente.id,
            capital: arredondarMoeda(capitalLido),
            taxa: taxaLida,
            frequencia: novoContrato.frequencia,
            data_inicio: paraBancoISO(dataBaseStr),
            garantia: novoContrato.garantia,
            valor_multa_diaria: parseNumerico(novoContrato.valorMultaDiaria) || 0,
            status: 'ATIVO',
            lucro_total: 0, multas_pagas: 0, movimentacoes: []
        };

        let freq = novoContrato.frequencia;
        if (freq === 'MENSAL' && novoContrato.totalParcelas && parseInt(novoContrato.totalParcelas) > 1) {
            freq = 'PARCELADO'; 
        }

        const descHist = tipoReal === 'VENDA' ? t('relatorio.tipoVenda') : t('cadastro.segEmprestimo');

        const calcularParcelas = (totalDivida: number, qtdParcelas: number) => {
            const valorParcNormal = arredondarMoeda(totalDivida / qtdParcelas);
            const totalPagoAntesDaUltima = arredondarMoeda(valorParcNormal * (qtdParcelas - 1));
            const valorUltimaParcela = arredondarMoeda(totalDivida - totalPagoAntesDaUltima);
            return { valorParcNormal, valorUltimaParcela };
        };

        if (freq === 'PARCELADO') {
            const parc = parseInt(novoContrato.totalParcelas || '1');
            const total = arredondarMoeda(capitalLido + valorJurosExato);
            const { valorParcNormal, valorUltimaParcela } = calcularParcelas(total, parc);
            
            contratoDB.status = 'PARCELADO';
            contratoDB.total_parcelas = parc;
            contratoDB.valor_parcela = valorParcNormal;
            contratoDB.valor_ultima_parcela = valorUltimaParcela;
            contratoDB.lucro_juros_por_parcela = arredondarMoeda(valorJurosExato / parc);
            contratoDB.proximo_vencimento = addMes(dataBaseStr, 1);
            contratoDB.movimentacoes = [t('historico.criadoParcelado', { data: dataBaseStr, tipo: descHist, qtd: parc, valor: valorParcNormal.toFixed(2) })];
        
        } else if (freq === 'SEMANAL') {
            const qtd = novoContrato.qtdSemanas || novoContrato.totalParcelas || 4; 
            const total = arredondarMoeda(capitalLido + valorJurosExato);
            const { valorParcNormal, valorUltimaParcela } = calcularParcelas(total, qtd);

            contratoDB.status = 'PARCELADO';
            contratoDB.total_parcelas = qtd; 
            contratoDB.valor_parcela = valorParcNormal;
            contratoDB.valor_ultima_parcela = valorUltimaParcela;
            contratoDB.lucro_juros_por_parcela = arredondarMoeda(valorJurosExato / qtd); 
            contratoDB.proximo_vencimento = addDias(dataBaseStr, 7);
            contratoDB.movimentacoes = [t('historico.criadoSemanal', { data: dataBaseStr, tipo: descHist, valor: valorParcNormal.toFixed(2) })];
        
        } else if (freq === 'QUINZENAL') {
            const qtd = novoContrato.qtdQuinzenas || novoContrato.totalParcelas || 2;
            const total = arredondarMoeda(capitalLido + valorJurosExato);
            const { valorParcNormal, valorUltimaParcela } = calcularParcelas(total, qtd);

            contratoDB.status = 'PARCELADO';
            contratoDB.total_parcelas = qtd;
            contratoDB.valor_parcela = valorParcNormal;
            contratoDB.valor_ultima_parcela = valorUltimaParcela;
            contratoDB.lucro_juros_por_parcela = arredondarMoeda(valorJurosExato / qtd);
            contratoDB.proximo_vencimento = addDias(dataBaseStr, 15);
            contratoDB.movimentacoes = [`Criado Quinzenal - ${qtd} parcelas de R$ ${valorParcNormal.toFixed(2)}`];

        } else if (freq === 'DIARIO' && novoContrato.diasDiario) {
            const dias = parseInt(novoContrato.diasDiario);
            const total = arredondarMoeda(capitalLido + valorJurosExato);
            const { valorParcNormal, valorUltimaParcela } = calcularParcelas(total, dias);

            contratoDB.status = 'PARCELADO';
            contratoDB.dias_diario = dias;
            contratoDB.dias_semana_diario = novoContrato.diasSemanaDiario; 
            contratoDB.datas_excluidas = novoContrato.datasExcluidas; 
            contratoDB.total_parcelas = dias;
            contratoDB.valor_parcela = valorParcNormal;
            contratoDB.valor_ultima_parcela = valorUltimaParcela;
            contratoDB.lucro_juros_por_parcela = arredondarMoeda(valorJurosExato / dias);
            
            let nextDate = lerDataLocal(dataBaseStr);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const excecoes = novoContrato.datasExcluidas ? String(novoContrato.datasExcluidas).split(',') : [];
            const allowed = novoContrato.diasSemanaDiario ? String(novoContrato.diasSemanaDiario).split(',').map(Number) : [0,1,2,3,4,5,6];

            let tries = 0;
            while (tries < 30) {
                const dateString = String(nextDate.getDate()).padStart(2, '0') + '/' + String(nextDate.getMonth()+1).padStart(2, '0') + '/' + nextDate.getFullYear();
                
                if (!allowed.includes(nextDate.getDay()) || excecoes.includes(dateString)) {
                    nextDate.setDate(nextDate.getDate() + 1);
                    tries++;
                } else {
                    break;
                }
            }
            contratoDB.proximo_vencimento = paraBancoISO(nextDate.toLocaleDateString(i18n.language));
            contratoDB.movimentacoes = [t('historico.criadoDiario', { data: dataBaseStr, tipo: descHist, dias: dias, valor: valorParcNormal.toFixed(2) })];
        
        } else {
            contratoDB.lucro_juros_por_parcela = valorJurosExato; 
            contratoDB.proximo_vencimento = addMes(dataBaseStr, 1);
            contratoDB.movimentacoes = [t('historico.criadoMensal', { data: dataBaseStr, tipo: descHist, valor: capitalLido.toFixed(2) })];
        }

        const { error } = await supabase.from('contratos').insert([contratoDB]);
        if (error) throw error;

        if (tipoReal === 'EMPRESTIMO') {
            const idCarteira = await garantirCarteira();
            const activeUserId = await getActiveUserId(); 
            if (idCarteira && activeUserId) {
                  let descTipo = t('cadastro.segEmprestimo');
                  if (freq === 'SEMANAL') descTipo += ` ${t('novoContrato.freqSEMANAL')}`;
                  else if (freq === 'DIARIO') descTipo += ` ${t('novoContrato.freqDIARIO')}`;
                  else if (freq === 'MENSAL') descTipo += ` ${t('novoContrato.freqMENSAL')}`;
                  else if (freq === 'PARCELADO') descTipo += ` ${t('novoContrato.freqParcelado').split(' ')[0]}`;

                  await supabase.from('fluxo_pessoal').insert([{
                    tipo: 'SAIDA',
                    valor: arredondarMoeda(capitalLido),
                    descricao: `${descTipo} p/ ${nomeCliente}`,
                    data_movimento: paraBancoISO(dataBaseStr),
                    conta_id: idCarteira,
                    user_id: activeUserId 
                }]);
            }
        }

        if (cliente.id) await refreshCliente(cliente.id); 
    } catch (e: any) { Alert.alert(t('common.erro'), e.message); }
  }, [clientes, i18n.language, lerDataLocal, paraBancoISO, refreshCliente, t, temPermissao]);

  // 🔒 TRAVA: RENOVAR/QUITAR (COBRAR)
  const acaoRenovarQuitar = useCallback(async (tipo: string, contrato: Contrato, nomeCliente: string, dataInformada: string, multaCobrada?: number) => {
    if (!temPermissao('cobrar')) {
        return Alert.alert(t('common.erro'), "Você não tem permissão para renovar ou quitar contratos.");
    }
    try {
      let vJuro = 0;
      const jurosSalvo = contrato.lucroJurosPorParcela || 0;

      const isFracionado = ['PARCELADO', 'SEMANAL', 'QUINZENAL', 'DIARIO'].includes(contrato.frequencia || '') || (contrato.totalParcelas || 0) > 1;

      if (isFracionado) {
          const isUltimaAcao = ((contrato.parcelasPagas || 0) + 1) >= (contrato.totalParcelas || 1);
          if (tipo !== 'RENOVAR' && isUltimaAcao && (contrato as any).valorUltimaParcela > 0) {
              const valorParcUltima = arredondarMoeda((contrato as any).valorUltimaParcela);
              vJuro = arredondarMoeda(valorParcUltima - (contrato.capital || 0));
          } else {
              vJuro = arredondarMoeda(jurosSalvo);
          }
      } else {
          if (jurosSalvo > 0) {
              vJuro = arredondarMoeda(jurosSalvo);
          } else {
              vJuro = arredondarMoeda(contrato.capital * (contrato.taxa / 100));
          }
      }

      let vMulta = 0;
      if (multaCobrada !== undefined) {
          vMulta = arredondarMoeda(multaCobrada);
      } else if (contrato.valorMultaDiaria && contrato.valorMultaDiaria > 0) {
        const dtPag = lerDataLocal(dataInformada);
        let dtVenc = new Date();
        if(contrato.proximoVencimento.includes('-')) {
             const [y, m, d] = contrato.proximoVencimento.split('-');
             dtVenc = new Date(Number(y), Number(m)-1, Number(d));
        } else {
             dtVenc = lerDataLocal(contrato.proximoVencimento);
        }
        const diff = Math.ceil((dtPag.getTime() - dtVenc.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) vMulta = arredondarMoeda(diff * contrato.valorMultaDiaria);
      }

      let updates: any = {};
      let h = [...(contrato.movimentacoes || [])];

      if (tipo === 'RENOVAR') {
          const d = lerDataLocal(contrato.proximoVencimento || dataInformada);
          if (['MENSAL', 'PARCELADO'].includes(contrato.frequencia || '')) d.setMonth(d.getMonth() + 1);
          else if (contrato.frequencia === 'QUINZENAL') d.setDate(d.getDate() + 15);
          else if (contrato.frequencia === 'SEMANAL') d.setDate(d.getDate() + 7);
          else if (contrato.frequencia === 'DIARIO') {
              d.setDate(d.getDate() + 1);
              
              const diasSemana = (contrato as any).diasSemanaDiario;
              const excecoes = (contrato as any).datasExcluidas ? String((contrato as any).datasExcluidas).split(',') : [];
              const allowed = diasSemana ? String(diasSemana).split(',').map(Number) : [0,1,2,3,4,5,6];

              let tries = 0;
              while (tries < 30) {
                  const dateString = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth()+1).padStart(2, '0') + '/' + d.getFullYear();
                  
                  if (!allowed.includes(d.getDay()) || excecoes.includes(dateString)) {
                      d.setDate(d.getDate() + 1);
                      tries++;
                  } else {
                      break;
                  }
              }
          }

          let msg = t('historico.renovacao', { data: dataInformada, juros: vJuro.toFixed(2) });
          if(vMulta > 0) msg += ` + ${t('historico.comMulta', { valor: vMulta.toFixed(2) })}`;
          msg += `) [L:${vJuro.toFixed(2)}]`; 
          h.unshift(msg);

          updates = {
             lucro_total: arredondarMoeda((contrato.lucroTotal||0) + vJuro),
             multas_pagas: arredondarMoeda((contrato.multasPagas||0) + vMulta),
             proximo_vencimento: paraBancoISO(d.toLocaleDateString(i18n.language)),
             movimentacoes: h
          };

          const idCarteira = await garantirCarteira();
          const activeUserId = await getActiveUserId(); 
          if (idCarteira && activeUserId) {
               const totalPago = arredondarMoeda(vJuro + vMulta);
               await supabase.from('fluxo_pessoal').insert([{
                  tipo: 'ENTRADA',
                  valor: totalPago,
                  descricao: `Renovação - ${nomeCliente}`,
                  data_movimento: paraBancoISO(dataInformada),
                  conta_id: idCarteira,
                  user_id: activeUserId 
              }]);
          }

      } else {
          const total = arredondarMoeda(contrato.capital + vJuro + vMulta);
          let msgQuit = t('historico.quitado', { data: dataInformada, total: total.toFixed(2) });
          if (vMulta > 0) msgQuit += ` (${t('historico.comMulta', { valor: vMulta.toFixed(2) })})`;
          msgQuit += ` [L:${vJuro.toFixed(2)}]`; 
          h.unshift(msgQuit);

          updates = { status: 'QUITADO', capital: 0, lucro_total: arredondarMoeda((contrato.lucroTotal||0) + vJuro), multas_pagas: arredondarMoeda((contrato.multasPagas||0) + vMulta), movimentacoes: h };
          
          const idCarteira = await garantirCarteira();
          const activeUserId = await getActiveUserId(); 
          if (idCarteira && activeUserId) {
               let descTipo = t('cadastro.segEmprestimo');
               if (contrato.frequencia === 'PARCELADO') descTipo = t('relatorio.tipoVenda'); 
               await supabase.from('fluxo_pessoal').insert([{
                  tipo: 'ENTRADA',
                  valor: total,
                  descricao: `${t('relatorio.quitacao')} ${descTipo} - ${nomeCliente}`,
                  data_movimento: paraBancoISO(dataInformada),
                  conta_id: idCarteira,
                  user_id: activeUserId 
              }]);
          }
      }

      const { error } = await supabase.from('contratos').update(updates).eq('id', contrato.id);
      if(error) throw error;
      
      const cliente = clientes.find(c => c.contratos.some(ct => ct.id === contrato.id));
      if (cliente?.id) await refreshCliente(cliente.id);
      
      const val = tipo === 'RENOVAR' ? arredondarMoeda(vJuro + vMulta) : arredondarMoeda(contrato.capital + vJuro + vMulta);
      const tipoTraduzido = tipo === 'RENOVAR' ? t('modalAcao.tipoRenovar') : t('modalAcao.tipoQuitar');
      Alert.alert(t('common.sucesso'), `${tipoTraduzido} ${t('common.sucesso')}!\n💰 R$ ${val.toFixed(2)}`);

    } catch (e) { Alert.alert(t('common.erro'), "Erro ao processar."); }
  }, [clientes, i18n.language, lerDataLocal, paraBancoISO, refreshCliente, t, temPermissao]);

  // 🔒 TRAVA: PAGAR PARCELA (COBRAR)
  const pagarParcela = useCallback(async (nomeCliente: string, contrato: Contrato, dataPagamento: string, multaCobrada?: number) => {
    if (!temPermissao('cobrar')) {
        return Alert.alert(t('common.erro'), "Você não tem permissão para baixar parcelas.");
    }
    try {
      
      let vMulta = 0;
      if (multaCobrada !== undefined) {
          vMulta = arredondarMoeda(multaCobrada);
      } else if (contrato.valorMultaDiaria && contrato.valorMultaDiaria > 0) {
        let dtVenc = new Date();
        if(contrato.proximoVencimento.includes('-')) {
             const [y, m, d] = contrato.proximoVencimento.split('-');
             dtVenc = new Date(Number(y), Number(m)-1, Number(d));
        } else {
             dtVenc = lerDataLocal(contrato.proximoVencimento);
        }
        const dtPag = lerDataLocal(dataPagamento);
        const diff = Math.ceil((dtPag.getTime() - dtVenc.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) vMulta = arredondarMoeda(diff * contrato.valorMultaDiaria);
      }

      const qtdPagas = (contrato.parcelasPagas || 0) + 1;
      const isUltimaParcela = qtdPagas >= (contrato.totalParcelas || 1);
      
      let lucroParc = contrato.lucroJurosPorParcela || 0;
      let valorParc = contrato.valorParcela || 0;

      const isFracionado = ['PARCELADO', 'SEMANAL', 'QUINZENAL', 'DIARIO'].includes(contrato.frequencia || '') || (contrato.totalParcelas || 0) > 1;

      if (isUltimaParcela && isFracionado) {
          const vUltima = (contrato as any).valorUltimaParcela;
          if (vUltima && vUltima > 0) {
              valorParc = vUltima;
          } else {
              valorParc = arredondarMoeda((contrato.capital || 0) + lucroParc);
          }
          
          const lucroCalculado = arredondarMoeda(valorParc - (contrato.capital || 0));
          if (lucroCalculado < 0) {
              lucroParc = contrato.lucroJurosPorParcela || 0;
          } else {
              lucroParc = lucroCalculado;
          }
      }

      const amortizacao = arredondarMoeda(valorParc - lucroParc);
      let novoSaldo = arredondarMoeda((contrato.capital || 0) - amortizacao);
      if (novoSaldo < 0) novoSaldo = 0;

      let h = [...(contrato.movimentacoes || [])];
      let msgPag = t('historico.recebido', { data: dataPagamento, valor: (valorParc + vMulta).toFixed(2) });
      if (vMulta > 0) msgPag += ` (${t('historico.comMulta', { valor: vMulta.toFixed(2) })})`;
      
      msgPag += ` [L:${lucroParc.toFixed(2)}]`;
      h.unshift(msgPag);

      let updates: any = { 
          multas_pagas: arredondarMoeda((contrato.multasPagas || 0) + vMulta), 
          lucro_total: arredondarMoeda((contrato.lucroTotal || 0) + lucroParc), 
          parcelas_pagas: qtdPagas, 
          movimentacoes: h 
      };

      if (isUltimaParcela || novoSaldo <= 0.1) {
         h.unshift(t('historico.finalizado', { data: dataPagamento }));
         updates.status = 'QUITADO';
         updates.capital = 0;
       } else {
         updates.capital = novoSaldo;
         const d = lerDataLocal(contrato.proximoVencimento || dataPagamento); 
         if (contrato.frequencia === 'QUINZENAL') d.setDate(d.getDate() + 15);
         else if (contrato.frequencia === 'SEMANAL') d.setDate(d.getDate() + 7);
         else if (contrato.frequencia === 'DIARIO') {
             d.setDate(d.getDate() + 1);
             
             const diasSemana = (contrato as any).diasSemanaDiario;
             const excecoes = (contrato as any).datasExcluidas ? String((contrato as any).datasExcluidas).split(',') : [];
             const allowed = diasSemana ? String(diasSemana).split(',').map(Number) : [0,1,2,3,4,5,6];

             let tries = 0;
             while (tries < 30) {
                 const dateString = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth()+1).padStart(2, '0') + '/' + d.getFullYear();
                 
                 if (!allowed.includes(d.getDay()) || excecoes.includes(dateString)) {
                     d.setDate(d.getDate() + 1);
                     tries++;
                 } else {
                     break;
                 }
             }
         }
         else d.setMonth(d.getMonth() + 1);
         updates.proximo_vencimento = paraBancoISO(d.toLocaleDateString(i18n.language));
       }

      const { error } = await supabase.from('contratos').update(updates).eq('id', contrato.id);
      if(error) throw error;

      const idCarteira = await garantirCarteira();
      const activeUserId = await getActiveUserId(); 
      if (idCarteira && activeUserId) {
          const valorRecebido = arredondarMoeda(valorParc + vMulta);
          let descTipo = t('cadastro.segEmprestimo');
          if (contrato.frequencia === 'PARCELADO') descTipo = t('relatorio.tipoVenda');
          await supabase.from('fluxo_pessoal').insert([{
              tipo: 'ENTRADA',
              valor: valorRecebido,
              descricao: `Receb. ${descTipo} ${qtdPagas}/${contrato.totalParcelas || '?'} - ${nomeCliente}`,
              data_movimento: paraBancoISO(dataPagamento),
              conta_id: idCarteira,
              user_id: activeUserId 
          }]);
      }

      const cliente = clientes.find(c => c.nome === nomeCliente);
      if(cliente?.id) await refreshCliente(cliente.id); 

      Alert.alert(t('common.sucesso'), `${t('pastaCliente.pagarParcela')} OK!\n💰 R$ ${(valorParc+vMulta).toFixed(2)}`);
    } catch (e) { Alert.alert(t('common.erro'), "Erro ao pagar."); }
  }, [clientes, i18n.language, lerDataLocal, paraBancoISO, refreshCliente, t, temPermissao]);

  // 🔒 TRAVA: CRIAR ACORDO (COBRAR)
  const criarAcordo = useCallback(async (nomeCliente: string, contratoId: number, valorTotal: number, qtd: number, data: string, multaDiaria: number) => {
    if (!temPermissao('cobrar')) {
        return Alert.alert(t('common.erro'), "Você não tem permissão para fazer acordos.");
    }
    try {
        const contrato = clientes.find(c => c.nome === nomeCliente)?.contratos.find(ct => ct.id === contratoId);
        
        const saldoAnt = contrato?.capital || 0;
        let novoCapitalBase = saldoAnt;
        if (valorTotal < saldoAnt) novoCapitalBase = valorTotal; 

        const lucroAcordo = arredondarMoeda(valorTotal - novoCapitalBase);
        
        const calcularParcelas = (totalDivida: number, qtdParcelas: number) => {
            const valorParcNormal = arredondarMoeda(totalDivida / qtdParcelas);
            const totalPagoAntesDaUltima = arredondarMoeda(valorParcNormal * (qtdParcelas - 1));
            const valorUltimaParcela = arredondarMoeda(totalDivida - totalPagoAntesDaUltima);
            return { valorParcNormal, valorUltimaParcela };
        };

        const { valorParcNormal, valorUltimaParcela } = calcularParcelas(valorTotal, qtd);

        const updates = {
            status: 'PARCELADO', 
            capital: novoCapitalBase, 
            total_parcelas: qtd, 
            parcelas_pagas: 0,
            valor_parcela: valorParcNormal, 
            valor_ultima_parcela: valorUltimaParcela,
            valor_multa_diaria: multaDiaria,
            lucro_juros_por_parcela: lucroAcordo > 0 ? arredondarMoeda(lucroAcordo / qtd) : 0,
            proximo_vencimento: paraBancoISO(data),
            movimentacoes: [t('historico.acordo', { data, valor: valorTotal.toFixed(2), qtd }), ...(contrato?.movimentacoes || [])]
        };
        const { error } = await supabase.from('contratos').update(updates).eq('id', contratoId);
        if (error) throw error;
        
        const cliente = clientes.find(c => c.nome === nomeCliente);
        if(cliente?.id) await refreshCliente(cliente.id); 

        Alert.alert(t('common.sucesso'), "Acordo realizado!");
    } catch(e) { Alert.alert(t('common.erro'), "Falha no acordo"); }
  }, [clientes, paraBancoISO, refreshCliente, t, temPermissao]);

  // 🔒 TRAVA: ABATER EMPRÉSTIMO (COBRAR)
  const abaterEmprestimo = useCallback(async (nomeCliente: string, contrato: Contrato, valorPago: number, multaPaga: number, dataPagamento: string) => {
    if (!temPermissao('cobrar')) {
        return Alert.alert(t('common.erro'), "Você não tem permissão para realizar abatimentos.");
    }
    try {
        let jurosAtual = 0;
        const jurosSalvo = contrato.lucroJurosPorParcela || 0;

        const isFracionado = ['PARCELADO', 'SEMANAL', 'QUINZENAL', 'DIARIO'].includes(contrato.frequencia || '') || (contrato.totalParcelas || 0) > 1;

        if (isFracionado) {
            jurosAtual = arredondarMoeda(jurosSalvo);
        } else {
            if (jurosSalvo > 0) {
                jurosAtual = arredondarMoeda(jurosSalvo);
            } else {
                jurosAtual = arredondarMoeda(contrato.capital * (contrato.taxa / 100));
            }
        }
        
        const dividaTotal = arredondarMoeda(contrato.capital + jurosAtual);
        const novoCapital = arredondarMoeda(dividaTotal - valorPago);

        if (novoCapital <= 0) return Alert.alert(t('common.erro'), "O valor quita o contrato. Use a opção 'Quitar'.");

        const lucroRegistrado = valorPago >= jurosAtual ? jurosAtual : valorPago;

        let h = [...(contrato.movimentacoes || [])];
        let msg = `Abatimento Parcial: Recebido R$ ${valorPago.toFixed(2)}`;
        if (multaPaga > 0) msg += ` + Multa R$ ${multaPaga.toFixed(2)}`;
        msg += ` | Novo Capital Base: R$ ${novoCapital.toFixed(2)} em ${dataPagamento}`;
        msg += ` [L:${lucroRegistrado.toFixed(2)}]`; 
        h.unshift(msg);

        const d = lerDataLocal(contrato.proximoVencimento || dataPagamento);
        if (['MENSAL', 'PARCELADO'].includes(contrato.frequencia || '')) d.setMonth(d.getMonth() + 1);
        else if (contrato.frequencia === 'QUINZENAL') d.setDate(d.getDate() + 15);
        else if (contrato.frequencia === 'SEMANAL') d.setDate(d.getDate() + 7);
        else if (contrato.frequencia === 'DIARIO') {
            d.setDate(d.getDate() + 1);
            const diasSemana = (contrato as any).diasSemanaDiario;
            const excecoes = (contrato as any).datasExcluidas ? String((contrato as any).datasExcluidas).split(',') : [];
            const allowed = diasSemana ? String(diasSemana).split(',').map(Number) : [0,1,2,3,4,5,6];
            let tries = 0;
            while (tries < 30) {
                const dateString = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth()+1).padStart(2, '0') + '/' + d.getFullYear();
                if (!allowed.includes(d.getDay()) || excecoes.includes(dateString)) {
                    d.setDate(d.getDate() + 1);
                    tries++;
                } else { break; }
            }
        }

        const updates: any = {
            capital: novoCapital,
            lucro_total: arredondarMoeda((contrato.lucroTotal || 0) + lucroRegistrado),
            multas_pagas: arredondarMoeda((contrato.multasPagas || 0) + multaPaga),
            proximo_vencimento: paraBancoISO(d.toLocaleDateString(i18n.language)),
            movimentacoes: h
        };

        if (isFracionado) {
            const parcelasRestantes = (contrato.totalParcelas || 1) - (contrato.parcelasPagas || 0);
            if (parcelasRestantes > 0) {
                const novoJurosTotal = arredondarMoeda(novoCapital * (contrato.taxa / 100));
                
                const totalDividaAbatida = arredondarMoeda(novoCapital + novoJurosTotal);
                const valorParcNormal = arredondarMoeda(totalDividaAbatida / parcelasRestantes);
                const totalPagoAntesDaUltima = arredondarMoeda(valorParcNormal * (parcelasRestantes - 1));
                const valorUltimaParcela = arredondarMoeda(totalDividaAbatida - totalPagoAntesDaUltima);

                updates.lucro_juros_por_parcela = arredondarMoeda(novoJurosTotal / parcelasRestantes);
                updates.valor_parcela = valorParcNormal;
                updates.valor_ultima_parcela = valorUltimaParcela; 
            }
        } else {
            updates.lucro_juros_por_parcela = arredondarMoeda(novoCapital * (contrato.taxa / 100));
        }

        const { error } = await supabase.from('contratos').update(updates).eq('id', contrato.id);
        if (error) throw error;

        const idCarteira = await garantirCarteira();
        const activeUserId = await getActiveUserId(); 
        if (idCarteira && activeUserId) {
            const totalEntrada = arredondarMoeda(valorPago + multaPaga);
            if (totalEntrada > 0) {
                await supabase.from('fluxo_pessoal').insert([{
                    tipo: 'ENTRADA',
                    valor: totalEntrada,
                    descricao: `Abatimento - ${nomeCliente}`,
                    data_movimento: paraBancoISO(dataPagamento),
                    conta_id: idCarteira,
                    user_id: activeUserId 
                }]);
            }
        }

        const cliente = clientes.find(c => c.nome === nomeCliente);
        if(cliente?.id) await refreshCliente(cliente.id);

        Alert.alert(t('common.sucesso'), `Abatimento concluído!\nO Novo Capital Base é R$ ${novoCapital.toFixed(2)} e o vencimento foi atualizado.`);
    } catch (e) { Alert.alert(t('common.erro'), "Falha ao abater valor."); }
  }, [clientes, i18n.language, lerDataLocal, paraBancoISO, refreshCliente, t, temPermissao]);
  
  // 🔒 TRAVA: EDITAR CONTRATO
  const editarContrato = useCallback(async (nomeCliente: string, id: number, dados: any) => { 
      if (!temPermissao('gerar_contrato')) {
        return Alert.alert(t('common.erro'), "Você não tem permissão para editar contratos.");
      }
      try {
          let dataInicioDB = dados.dataInicio;
          if (dataInicioDB && dataInicioDB.includes('/')) {
              dataInicioDB = paraBancoISO(dataInicioDB);
          }
          let vencimentoDB = dados.proximoVencimento;
          if (vencimentoDB && vencimentoDB.includes('/')) {
              vencimentoDB = paraBancoISO(vencimentoDB);
          }

          const updates: any = {
              capital: dados.capital,
              taxa: dados.taxa,
              lucro_total: dados.lucroTotal,
              data_inicio: dataInicioDB,
              proximo_vencimento: vencimentoDB,
              garantia: dados.garantia,
              valor_multa_diaria: dados.valorMultaDiaria
          };

          if (dados.valorParcela !== undefined) updates.valor_parcela = dados.valorParcela;
          if (dados.totalParcelas !== undefined) updates.total_parcelas = dados.totalParcelas;
          if (dados.parcelasPagas !== undefined) updates.parcelas_pagas = dados.parcelasPagas;

          const { error } = await supabase.from('contratos').update(updates).eq('id', id);
          if (error) throw error;
          
          const cliente = clientes.find(c => c.nome === nomeCliente);
          if (cliente?.id) await refreshCliente(cliente.id);
          
          Alert.alert(t('common.sucesso'), "Empréstimo atualizado com sucesso!");
      } catch (e) { 
          Alert.alert(t('common.erro'), "Falha ao editar empréstimo."); 
      }
  }, [clientes, paraBancoISO, refreshCliente, t, temPermissao]);
  
  // 🔒 TRAVA: EXCLUIR CONTRATO
  const excluirContrato = useCallback(async (id: number) => { 
      if (!temPermissao('gerar_contrato')) {
        return Alert.alert(t('common.erro'), "Você não tem permissão para excluir contratos.");
      }
      const { error } = await supabase.from('contratos').delete().eq('id', id);
      if(!error) await fetchData(); 
  }, [fetchData, temPermissao]);
  
  const importarDados = useCallback((d: any) => {}, []);

  return {
    clientes, loading, totais, fetchData,
    adicionarCliente, editarCliente, excluirCliente,
    adicionarContrato, editarContrato, excluirContrato,
    acaoRenovarQuitar, pagarParcela, criarAcordo, importarDados,
    alternarBloqueio, abaterEmprestimo 
  };
}