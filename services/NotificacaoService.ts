import * as Notifications from 'expo-notifications';
import i18n from '../i18n'; // <--- Importação direta da instância de tradução
import { Cliente } from '../types';

// Configuração da Notificação
// CORREÇÃO: Removemos 'shouldShowAlert' que estava obsoleto.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // Faz aparecer o pop-up no topo da tela
    shouldShowList: true,   // Faz aparecer na lista de notificações
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function verificarNotificacoes(clientes: Cliente[]) {
  // 1. Pede permissão (se ainda não tiver)
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus !== 'granted') return;
  }

  // 2. Conta tudo que está pendente (Hoje + Atrasados)
  let qtdCobrancas = 0;
  let valorTotal = 0;
  
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  clientes.forEach(cli => {
    (cli.contratos || []).forEach(con => {
      // Considera apenas contratos Ativos ou Parcelados
      if (con.status === 'ATIVO' || con.status === 'PARCELADO') {
        
        // Verifica se a data existe antes de tentar ler
        if (!con.proximoVencimento) return;

        const p = con.proximoVencimento.split('/');
        
        // Verifica se a data está no formato correto (dia/mês/ano)
        if (p.length < 3) return;

        const dataVenc = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
        
        // Se a data de vencimento for HOJE ou ANTES DE HOJE (Atrasado)
        if (dataVenc.getTime() <= hoje.getTime()) {
          qtdCobrancas++;
          
          if(con.status === 'PARCELADO') {
            valorTotal += (con.valorParcela || 0);
          } else {
            // Se for quitação total, soma capital + juros
            valorTotal += (con.capital + (con.capital * (con.taxa/100)));
          }
        }
      }
    });
  });

  // 3. Manda a notificação do Chefe
  if (qtdCobrancas > 0) {
    // Limpa notificações antigas para não acumular spam
    await Notifications.cancelAllScheduledNotificationsAsync();

    // --- TRADUÇÃO AQUI ---
    // Como não estamos num componente, usamos i18n.t diretamente
    const moeda = i18n.t('common.moeda', { defaultValue: 'R$' });
    
    const titulo = i18n.t('notificacao.titulo');
    
    // Passamos as variáveis (qtd e valor) para a string traduzida
    const corpo = i18n.t('notificacao.corpo', { 
        qtd: qtdCobrancas, 
        valor: `${moeda} ${valorTotal.toFixed(2)}` 
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: corpo,
        sound: true,
      },
      trigger: null, // Manda na hora
    });
  }
}