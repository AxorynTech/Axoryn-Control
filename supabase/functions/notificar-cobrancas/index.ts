import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- DICIONÁRIO DE TRADUÇÃO DO ROBÔ ---
const TRADUCOES: any = {
  pt: {
    titulo: 'Chefe, Temos Trabalho! 🎩',
    corpo: (qtd: number, valor: string) => `Você tem ${qtd} cobranças para hoje (Total: ${valor})`,
    locale: 'pt-BR',
    moeda: 'BRL'
  },
  en: {
    titulo: 'Boss, We Have Work! 🎩',
    corpo: (qtd: number, valor: string) => `You have ${qtd} collections due today (Total: ${valor})`,
    locale: 'en-US',
    moeda: 'USD'
  },
  es: {
    titulo: '¡Jefe, Tenemos Trabajo! 🎩',
    corpo: (qtd: number, valor: string) => `Tienes ${qtd} cobros para hoy (Total: ${valor})`,
    locale: 'es-ES',
    moeda: 'USD'
  }
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    // Nota: Idealmente use Deno.env.get('SERVICE_ROLE_KEY') por segurança
    const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjYnl3a2xnam1hbXBlY3Zna3FmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA5NzU2NiwiZXhwIjoyMDgzNjczNTY2fQ.YcbGbOdTTJv4eVVUuNZ3JuC39oL20oAcXKuJON1ITac';

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1. Busca usuários E O IDIOMA DELES
    // Adicionei 'language' na seleção. Se sua tabela não tiver essa coluna, ele vai usar o padrão (pt).
    const { data: usuarios, error: erroUser } = await supabase
      .from('profiles')
      .select('user_id, expo_token, language') 
      .not('expo_token', 'is', null)

    if (erroUser) throw erroUser;

    const mensagensMap = new Map();
    
    const dataObj = new Date();
    const dia = String(dataObj.getDate()).padStart(2, '0');
    const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
    const ano = dataObj.getFullYear();
    const hojeISO = `${ano}-${mes}-${dia}`; 

    console.log(`🔎 Processando cobranças até: "${hojeISO}"`);

    if (usuarios) {
      for (const usuario of usuarios) {
        
        if (mensagensMap.has(usuario.expo_token)) continue;

        // Define o idioma (padrão 'pt' se não existir ou for nulo)
        const langCode = usuario.language && TRADUCOES[usuario.language] ? usuario.language : 'pt';
        const textos = TRADUCOES[langCode];

        let totalClientes = 0;
        let valorTotalGeral = 0.0;

        const { data: clientes, error: erroCli } = await supabase
          .from('clientes')
          .select('nome, contratos(*)') 
          .eq('user_id', usuario.user_id)

        if (!clientes || clientes.length === 0) continue;

        for (const cli of clientes) {
          if (!cli.contratos) continue;
          const listaContratos = Array.isArray(cli.contratos) ? cli.contratos : [];

          for (const con of listaContratos) {
            if (con.status !== 'ATIVO') continue;

            const dataVencimento = con.proximo_vencimento;

            if (dataVencimento && dataVencimento <= hojeISO) {
                
                let valorFinal = 0;

                // Limpeza robusta de strings
                let parcela = parseFloat(String(con.valor_parcela).replace(/[^\d.,-]/g, '').replace(',', '.').trim());
                let capital = parseFloat(String(con.capital).replace(/[^\d.,-]/g, '').replace(',', '.').trim());
                let taxa = parseFloat(String(con.taxa).replace(/[^\d.,-]/g, '').replace(',', '.').trim());

                if (isNaN(parcela)) parcela = 0;
                if (isNaN(capital)) capital = 0;
                if (isNaN(taxa)) taxa = 0;

                if (parcela > 0) {
                    valorFinal = parcela;
                } else if (capital > 0) {
                    const valorJuros = capital * (taxa / 100);
                    valorFinal = capital + valorJuros;
                }

                if (valorFinal > 0) {
                    totalClientes++;
                    valorTotalGeral += valorFinal;
                }
            }
          }
        }

        if (totalClientes > 0) {
            // Formatação de moeda baseada no idioma do usuário
            const valorFormatado = valorTotalGeral.toLocaleString(textos.locale, { 
                style: 'currency', 
                currency: textos.moeda 
            });
            
            mensagensMap.set(usuario.expo_token, {
                to: usuario.expo_token,
                sound: 'default',
                title: textos.titulo, // Título traduzido
                body: textos.corpo(totalClientes, valorFormatado), // Corpo traduzido com variáveis
                data: { url: '/(tabs)/cobranca' },
                channelId: 'resumo-diario',
            });
        }
      }
    }

    const mensagens = Array.from(mensagensMap.values());

    if (mensagens.length === 0) {
      return new Response(JSON.stringify({ message: "Sem cobranças hoje." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const respostaExpo = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mensagens),
    });

    return new Response(JSON.stringify({ success: true, enviados: mensagens.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})