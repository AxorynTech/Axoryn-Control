import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { Cliente, Contrato } from '../types';

export function useClientes() {
  const { t, i18n } = useTranslation();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

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
          capital: c.capital,
          taxa: c.taxa,
          frequencia: c.frequencia,
          status: c.status,
          garantia: c.garantia,
          movimentacoes: c.movimentacoes || [],
          lucroTotal: c.lucro_total || 0,
          multasPagas: c.multas_pagas || 0,
          dataInicio: formatarDataDoBanco(c.data_inicio),
          proximoVencimento: formatarDataDoBanco(c.proximo_vencimento),
          valorMultaDiaria: c.valor_multa_diaria,
          diasDiario: c.dias_diario,
          diasSemanaDiario: c.dias_semana_diario,
          datasExcluidas: c.datas_excluidas, 
          totalParcelas: c.total_parcelas,
          parcelasPagas: c.parcelas_pagas,
          valorParcela: c.valor_parcela,
          lucroJurosPorParcela: c.lucro_juros_por_parcela
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

  const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };

  const garantirCarteira = async () => {
    try {
        const userId = await getUserId();
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
            const recebidoParcelas = (con.parcelasPagas || 0) * (con.valorParcela || 0);
            vendas += (recebidoParcelas + (con.multasPagas || 0));
        } else {
            lucro += (con.lucroTotal || 0);
            multas += (con.multasPagas || 0);
        }
      });
    });
    return { capital: capitalTotal, lucro, multas, vendas };
  }, [clientes]);

  const adicionarCliente = useCallback(async (dados: Partial<Cliente>) => {
    try {
      const { error } = await supabase.from('clientes').insert([{
        nome: dados.nome, whatsapp: dados.whatsapp, cpf: dados.cpf, endereco: dados.endereco, indicacao: dados.indicacao,
        reputacao: dados.reputacao || 'NEUTRA', segmento: dados.segmento,
        foto_com_documento: (dados as any).foto_com_documento,
        foto_apenas_documento: (dados as any).foto_apenas_documento
      }]);
      if (error) throw error;
      await fetchData(); 
    } catch (e) { Alert.alert(t('common.erro'), "Falha ao salvar"); }
  }, [fetchData, t]);

  const editarCliente = useCallback(async (nomeAntigo: string, dados: Partial<Cliente>) => {
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
  }, [clientes, fetchData, t]);

  const excluirCliente = useCallback(async (nomeCliente: string) => {
    const cliente = clientes.find(c => c.nome === nomeCliente);
    if (!cliente?.id) return;
    
    try {
        const { error } = await supabase.from('clientes').delete().eq('id', cliente.id);
        if (error) throw error;
        await fetchData();
    } catch (e) {
        Alert.alert(t('common.erro'), "Falha ao excluir cliente. Tente novamente.");
    }
  }, [clientes, fetchData, t]);

  const alternarBloqueio = useCallback(async (cliente: Cliente) => {
    try {
        if (!cliente.id) return; 
        const novoStatus = !cliente.bloqueado;
        const { error } = await supabase.from('clientes').update({ bloqueado: novoStatus }).eq('id', cliente.id);
        if (error) throw error;
        await refreshCliente(cliente.id);
    } catch (e) { Alert.alert(t('common.erro'), "Não foi possível alterar o bloqueio."); }
  }, [refreshCliente, t]);

  const adicionarContrato = useCallback(async (nomeCliente: string, novoContrato: any) => {
    const cliente = clientes.find(c => c.nome === nomeCliente);
    if (!cliente?.id) return Alert.alert(t('common.erro'), t('novoContrato.erroCliente'));

    try {
        let tipoReal = novoContrato.tipo;
        if (!tipoReal && novoContrato.garantia && novoContrato.garantia.startsWith('PRODUTO:')) tipoReal = 'VENDA';
        if (!tipoReal) tipoReal = (novoContrato.frequencia === 'PARCELADO') ? 'VENDA' : 'EMPRESTIMO';

        if (tipoReal === 'EMPRESTIMO') {
            const idCarteira = await garantirCarteira();
            if (idCarteira) {
                const { data: contasSaldo } = await supabase.rpc('buscar_saldos_contas');
                const carteira = contasSaldo?.find((c: any) => c.nome === 'Carteira');
                const saldoAtual = carteira ? parseFloat(carteira.saldo) : 0;
                const valorEmprestimo = Number(novoContrato.capital);

                if (saldoAtual < valorEmprestimo) {
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

        let valorJurosExato = 0;

        if (novoContrato.valorJuros && Number(novoContrato.valorJuros) > 0) {
            valorJurosExato = Number(novoContrato.valorJuros);
            if (novoContrato.capital > 0) {
               novoContrato.taxa = (valorJurosExato / novoContrato.capital) * 100;
            }
        } else {
            valorJurosExato = novoContrato.capital * (novoContrato.taxa / 100);
        }

        let contratoDB: any = {
            cliente_id: cliente.id,
            capital: novoContrato.capital,
            taxa: novoContrato.taxa,
            frequencia: novoContrato.frequencia,
            data_inicio: paraBancoISO(dataBaseStr),
            garantia: novoContrato.garantia,
            valor_multa_diaria: novoContrato.valorMultaDiaria || 0,
            status: 'ATIVO',
            lucro_total: 0, multas_pagas: 0, movimentacoes: []
        };

        const freq = novoContrato.frequencia;
        const descHist = tipoReal === 'VENDA' ? t('relatorio.tipoVenda') : t('cadastro.segEmprestimo');

        if (freq === 'PARCELADO') {
            const parc = parseInt(novoContrato.totalParcelas || '1');
            const total = novoContrato.capital + valorJurosExato;
            const valorParc = total / parc;
            contratoDB.status = 'PARCELADO';
            contratoDB.total_parcelas = parc;
            contratoDB.valor_parcela = valorParc;
            contratoDB.lucro_juros_por_parcela = valorJurosExato / parc;
            contratoDB.proximo_vencimento = addMes(dataBaseStr, 1);
            contratoDB.movimentacoes = [t('historico.criadoParcelado', { data: dataBaseStr, tipo: descHist, qtd: parc, valor: valorParc.toFixed(2) })];
        
        } else if (freq === 'SEMANAL') {
            const qtd = novoContrato.qtdSemanas || novoContrato.totalParcelas || 4; 
            const total = novoContrato.capital + valorJurosExato;
            const parc = total / qtd; 
            contratoDB.status = 'PARCELADO';
            contratoDB.total_parcelas = qtd; 
            contratoDB.valor_parcela = parc;
            contratoDB.lucro_juros_por_parcela = valorJurosExato / qtd; 
            contratoDB.proximo_vencimento = addDias(dataBaseStr, 7);
            contratoDB.movimentacoes = [t('historico.criadoSemanal', { data: dataBaseStr, tipo: descHist, valor: parc.toFixed(2) })];
        
        } else if (freq === 'QUINZENAL') {
            const qtd = novoContrato.qtdQuinzenas || novoContrato.totalParcelas || 2;
            const total = novoContrato.capital + valorJurosExato;
            const parc = total / qtd;
            contratoDB.status = 'PARCELADO';
            contratoDB.total_parcelas = qtd;
            contratoDB.valor_parcela = parc;
            contratoDB.lucro_juros_por_parcela = valorJurosExato / qtd;
            contratoDB.proximo_vencimento = addDias(dataBaseStr, 15);
            contratoDB.movimentacoes = [`Criado Quinzenal - ${qtd} parcelas de R$ ${parc.toFixed(2)}`];

        } else if (freq === 'DIARIO' && novoContrato.diasDiario) {
            const dias = parseInt(novoContrato.diasDiario);
            const total = novoContrato.capital + valorJurosExato;
            const parc = total / dias;
            contratoDB.status = 'PARCELADO';
            contratoDB.dias_diario = dias;
            contratoDB.dias_semana_diario = novoContrato.diasSemanaDiario; 
            
            contratoDB.datas_excluidas = novoContrato.datasExcluidas; 
            
            contratoDB.total_parcelas = dias;
            contratoDB.valor_parcela = parc;
            contratoDB.lucro_juros_por_parcela = valorJurosExato / dias;
            
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
            contratoDB.movimentacoes = [t('historico.criadoDiario', { data: dataBaseStr, tipo: descHist, dias: dias, valor: parc.toFixed(2) })];
        
        } else {
            contratoDB.lucro_juros_por_parcela = valorJurosExato; 
            contratoDB.proximo_vencimento = addMes(dataBaseStr, 1);
            contratoDB.movimentacoes = [t('historico.criadoMensal', { data: dataBaseStr, tipo: descHist, valor: novoContrato.capital.toFixed(2) })];
        }

        const { error } = await supabase.from('contratos').insert([contratoDB]);
        if (error) throw error;

        if (tipoReal === 'EMPRESTIMO') {
            const idCarteira = await garantirCarteira();
            const userId = await getUserId();
            if (idCarteira && userId) {
                  let descTipo = t('cadastro.segEmprestimo');
                  if (freq === 'SEMANAL') descTipo += ` ${t('novoContrato.freqSEMANAL')}`;
                  else if (freq === 'DIARIO') descTipo += ` ${t('novoContrato.freqDIARIO')}`;
                  else if (freq === 'MENSAL') descTipo += ` ${t('novoContrato.freqMENSAL')}`;
                  else if (freq === 'PARCELADO') descTipo += ` ${t('novoContrato.freqParcelado').split(' ')[0]}`;

                  await supabase.from('fluxo_pessoal').insert([{
                    tipo: 'SAIDA',
                    valor: Number(novoContrato.capital),
                    descricao: `${descTipo} p/ ${nomeCliente}`,
                    data_movimento: paraBancoISO(dataBaseStr),
                    conta_id: idCarteira,
                    user_id: userId
                }]);
            }
        }

        if (cliente.id) await refreshCliente(cliente.id); 
    } catch (e: any) { Alert.alert(t('common.erro'), e.message); }
  }, [clientes, i18n.language, lerDataLocal, paraBancoISO, refreshCliente, t]);

  const acaoRenovarQuitar = useCallback(async (tipo: string, contrato: Contrato, nomeCliente: string, dataInformada: string) => {
    try {
      // 🚀 MATEMÁTICA BLINDADA: SE EXISTIR VALOR FIXO SALVO, USA ELE. SE NÃO, USA A TAXA.
      let vJuro = 0;
      const jurosSalvo = contrato.lucroJurosPorParcela || 0;

      if (['PARCELADO', 'SEMANAL', 'QUINZENAL', 'DIARIO'].includes(contrato.frequencia || '')) {
          vJuro = jurosSalvo;
      } else {
          // Se for MENSAL e tiver valor fixo cravado, usa o cravado.
          if (jurosSalvo > 0) {
              vJuro = Number(jurosSalvo);
          } else {
              // Só calcula com porcentagem se for um empréstimo antigo que não tinha valor fixo
              vJuro = contrato.capital * (contrato.taxa / 100);
          }
      }

      let vMulta = 0;
      if (contrato.valorMultaDiaria && contrato.valorMultaDiaria > 0) {
        const dtPag = lerDataLocal(dataInformada);
        let dtVenc = new Date();
        if(contrato.proximoVencimento.includes('-')) {
             const [y, m, d] = contrato.proximoVencimento.split('-');
             dtVenc = new Date(Number(y), Number(m)-1, Number(d));
        } else {
             dtVenc = lerDataLocal(contrato.proximoVencimento);
        }
        const diff = Math.ceil((dtPag.getTime() - dtVenc.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) vMulta = diff * contrato.valorMultaDiaria;
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
          msg += `)`;
          h.unshift(msg);

          updates = {
             lucro_total: (contrato.lucroTotal||0) + vJuro,
             multas_pagas: (contrato.multasPagas||0) + vMulta,
             proximo_vencimento: paraBancoISO(d.toLocaleDateString(i18n.language)),
             movimentacoes: h
          };

          const idCarteira = await garantirCarteira();
          const userId = await getUserId();
          if (idCarteira && userId) {
               const totalPago = vJuro + vMulta;
               await supabase.from('fluxo_pessoal').insert([{
                  tipo: 'ENTRADA',
                  valor: totalPago,
                  descricao: `Renovação - ${nomeCliente}`,
                  data_movimento: paraBancoISO(dataInformada),
                  conta_id: idCarteira,
                  user_id: userId
              }]);
          }

      } else {
          const total = contrato.capital + vJuro + vMulta;
          let msgQuit = t('historico.quitado', { data: dataInformada, total: total.toFixed(2) });
          if (vMulta > 0) msgQuit += ` (${t('historico.comMulta', { valor: vMulta.toFixed(2) })})`;
          h.unshift(msgQuit);

          updates = { status: 'QUITADO', capital: 0, lucro_total: (contrato.lucroTotal||0) + vJuro, multas_pagas: (contrato.multasPagas||0) + vMulta, movimentacoes: h };
          
          const idCarteira = await garantirCarteira();
          const userId = await getUserId(); 
          if (idCarteira && userId) {
               let descTipo = t('cadastro.segEmprestimo');
               if (contrato.frequencia === 'PARCELADO') descTipo = t('relatorio.tipoVenda'); 
               await supabase.from('fluxo_pessoal').insert([{
                  tipo: 'ENTRADA',
                  valor: total,
                  descricao: `${t('relatorio.quitacao')} ${descTipo} - ${nomeCliente}`,
                  data_movimento: paraBancoISO(dataInformada),
                  conta_id: idCarteira,
                  user_id: userId 
              }]);
          }
      }

      const { error } = await supabase.from('contratos').update(updates).eq('id', contrato.id);
      if(error) throw error;
      
      const cliente = clientes.find(c => c.contratos.some(ct => ct.id === contrato.id));
      if (cliente?.id) await refreshCliente(cliente.id);
      
      const val = tipo === 'RENOVAR' ? (vJuro + vMulta) : (contrato.capital + vJuro + vMulta);
      const tipoTraduzido = tipo === 'RENOVAR' ? t('modalAcao.tipoRenovar') : t('modalAcao.tipoQuitar');
      Alert.alert(t('common.sucesso'), `${tipoTraduzido} ${t('common.sucesso')}!\n💰 R$ ${val.toFixed(2)}`);

    } catch (e) { Alert.alert(t('common.erro'), "Erro ao processar."); }
  }, [clientes, i18n.language, lerDataLocal, paraBancoISO, refreshCliente, t]);

  const pagarParcela = useCallback(async (nomeCliente: string, contrato: Contrato, dataPagamento: string) => {
    try {
      let vMulta = 0;
      if (contrato.valorMultaDiaria && contrato.valorMultaDiaria > 0) {
        let dtVenc = new Date();
        if(contrato.proximoVencimento.includes('-')) {
             const [y, m, d] = contrato.proximoVencimento.split('-');
             dtVenc = new Date(Number(y), Number(m)-1, Number(d));
        } else {
             dtVenc = lerDataLocal(contrato.proximoVencimento);
        }
        const dtPag = lerDataLocal(dataPagamento);
        const diff = Math.ceil((dtPag.getTime() - dtVenc.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) vMulta = diff * contrato.valorMultaDiaria;
      }

      const qtdPagas = (contrato.parcelasPagas || 0) + 1;
      const lucroParc = contrato.lucroJurosPorParcela || 0;
      const amortizacao = (contrato.valorParcela || 0) - lucroParc;
      let novoSaldo = (contrato.capital || 0) - amortizacao;
      if (novoSaldo < 0) novoSaldo = 0;

      let h = [...(contrato.movimentacoes || [])];
      let msgPag = t('historico.recebido', { data: dataPagamento, valor: ((contrato.valorParcela||0)+vMulta).toFixed(2) });
      if (vMulta > 0) msgPag += ` (${t('historico.comMulta', { valor: vMulta.toFixed(2) })})`;
      h.unshift(msgPag);

      let updates: any = { multas_pagas: (contrato.multasPagas || 0) + vMulta, lucro_total: (contrato.lucroTotal || 0) + lucroParc, parcelas_pagas: qtdPagas, movimentacoes: h };

      if (qtdPagas >= (contrato.totalParcelas || 0) || novoSaldo <= 0.1) {
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
      const userId = await getUserId(); 
      if (idCarteira && userId) {
          const valorRecebido = (contrato.valorParcela || 0) + vMulta;
          let descTipo = t('cadastro.segEmprestimo');
          if (contrato.frequencia === 'PARCELADO') descTipo = t('relatorio.tipoVenda');
          await supabase.from('fluxo_pessoal').insert([{
              tipo: 'ENTRADA',
              valor: valorRecebido,
              descricao: `Receb. ${descTipo} ${qtdPagas}/${contrato.totalParcelas || '?'} - ${nomeCliente}`,
              data_movimento: paraBancoISO(dataPagamento),
              conta_id: idCarteira,
              user_id: userId 
          }]);
      }

      const cliente = clientes.find(c => c.nome === nomeCliente);
      if(cliente?.id) await refreshCliente(cliente.id); 

      Alert.alert(t('common.sucesso'), `${t('pastaCliente.pagarParcela')} OK!\n💰 R$ ${((contrato.valorParcela||0)+vMulta).toFixed(2)}`);
    } catch (e) { Alert.alert(t('common.erro'), "Erro ao pagar."); }
  }, [clientes, i18n.language, lerDataLocal, paraBancoISO, refreshCliente, t]);

  const criarAcordo = useCallback(async (nomeCliente: string, contratoId: number, valorTotal: number, qtd: number, data: string, multaDiaria: number) => {
    try {
        const contrato = clientes.find(c => c.nome === nomeCliente)?.contratos.find(ct => ct.id === contratoId);
        const saldoAnt = contrato?.capital || 0;
        const lucroAcordo = valorTotal - saldoAnt;
        const valorParc = valorTotal / qtd;

        const updates = {
            status: 'PARCELADO', capital: valorTotal, total_parcelas: qtd, parcelas_pagas: 0,
            valor_parcela: valorParc, valor_multa_diaria: multaDiaria,
            lucro_juros_por_parcela: lucroAcordo > 0 ? (lucroAcordo / qtd) : 0,
            proximo_vencimento: paraBancoISO(data),
            movimentacoes: [t('historico.acordo', { data, valor: valorTotal.toFixed(2), qtd }), ...(contrato?.movimentacoes || [])]
        };
        const { error } = await supabase.from('contratos').update(updates).eq('id', contratoId);
        if (error) throw error;
        
        const cliente = clientes.find(c => c.nome === nomeCliente);
        if(cliente?.id) await refreshCliente(cliente.id); 

        Alert.alert(t('common.sucesso'), "Acordo realizado!");
    } catch(e) { Alert.alert(t('common.erro'), "Falha no acordo"); }
  }, [clientes, paraBancoISO, refreshCliente, t]);

  const abaterEmprestimo = useCallback(async (nomeCliente: string, contrato: Contrato, valorPago: number, multaPaga: number, dataPagamento: string) => {
    try {
        // 🚀 MATEMÁTICA BLINDADA AQUI TAMBÉM 🚀
        let jurosAtual = 0;
        const jurosSalvo = contrato.lucroJurosPorParcela || 0;

        if (['PARCELADO', 'SEMANAL', 'QUINZENAL', 'DIARIO'].includes(contrato.frequencia || '')) {
            jurosAtual = jurosSalvo;
        } else {
            if (jurosSalvo > 0) {
                jurosAtual = Number(jurosSalvo);
            } else {
                jurosAtual = contrato.capital * (contrato.taxa / 100);
            }
        }
        
        const dividaTotal = contrato.capital + jurosAtual;
        const novoCapital = dividaTotal - valorPago;

        if (novoCapital <= 0) return Alert.alert(t('common.erro'), "O valor quita o contrato. Use a opção 'Quitar'.");

        const lucroRegistrado = valorPago >= jurosAtual ? jurosAtual : valorPago;

        let h = [...(contrato.movimentacoes || [])];
        let msg = `Abatimento Parcial: Recebido R$ ${valorPago.toFixed(2)}`;
        if (multaPaga > 0) msg += ` + Multa R$ ${multaPaga.toFixed(2)}`;
        msg += ` | Novo Capital Base: R$ ${novoCapital.toFixed(2)} em ${dataPagamento}`;
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
            lucro_total: (contrato.lucroTotal || 0) + lucroRegistrado,
            multas_pagas: (contrato.multasPagas || 0) + multaPaga,
            proximo_vencimento: paraBancoISO(d.toLocaleDateString(i18n.language)),
            movimentacoes: h
        };

        if (['PARCELADO', 'SEMANAL', 'QUINZENAL', 'DIARIO'].includes(contrato.frequencia || '')) {
            const parcelasRestantes = (contrato.totalParcelas || 1) - (contrato.parcelasPagas || 0);
            if (parcelasRestantes > 0) {
                const novoJurosTotal = novoCapital * (contrato.taxa / 100);
                updates.lucro_juros_por_parcela = novoJurosTotal / parcelasRestantes;
                updates.valor_parcela = (novoCapital + novoJurosTotal) / parcelasRestantes;
            }
        } else {
            // Recalcula o próximo Juro cravado no novo capital
            updates.lucro_juros_por_parcela = novoCapital * (contrato.taxa / 100);
        }

        const { error } = await supabase.from('contratos').update(updates).eq('id', contrato.id);
        if (error) throw error;

        const idCarteira = await garantirCarteira();
        const userId = await getUserId();
        if (idCarteira && userId) {
            const totalEntrada = valorPago + multaPaga;
            if (totalEntrada > 0) {
                await supabase.from('fluxo_pessoal').insert([{
                    tipo: 'ENTRADA',
                    valor: totalEntrada,
                    descricao: `Abatimento - ${nomeCliente}`,
                    data_movimento: paraBancoISO(dataPagamento),
                    conta_id: idCarteira,
                    user_id: userId
                }]);
            }
        }

        const cliente = clientes.find(c => c.nome === nomeCliente);
        if(cliente?.id) await refreshCliente(cliente.id);

        Alert.alert(t('common.sucesso'), `Abatimento concluído!\nO Novo Capital Base é R$ ${novoCapital.toFixed(2)} e o vencimento foi atualizado.`);
    } catch (e) { Alert.alert(t('common.erro'), "Falha ao abater valor."); }
  }, [clientes, i18n.language, lerDataLocal, paraBancoISO, refreshCliente, t]);
  
  const editarContrato = useCallback(async (nomeCliente: string, id: number, dados: any) => { 
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
  }, [clientes, paraBancoISO, refreshCliente, t]);
  
  const excluirContrato = useCallback(async (id: number) => { 
      const { error } = await supabase.from('contratos').delete().eq('id', id);
      if(!error) await fetchData(); 
  }, [fetchData]);
  
  const importarDados = useCallback((d: any) => {}, []);

  return {
    clientes, loading, totais, fetchData,
    adicionarCliente, editarCliente, excluirCliente,
    adicionarContrato, editarContrato, excluirContrato,
    acaoRenovarQuitar, pagarParcela, criarAcordo, importarDados,
    alternarBloqueio, abaterEmprestimo 
  };
}