import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- DICIONÁRIO DE TRADUÇÃO DO ROBÔ ---
const TRADUCOES: any = {
  pt: { titulo: 'Chefe, Temos Trabalho! 🎩', corpo: (qtd: number, valor: string) => `Você tem ${qtd} cobranças para hoje (Total: ${valor})`, locale: 'pt-BR', moeda: 'BRL' },
  en: { titulo: 'Boss, We Have Work! 🎩', corpo: (qtd: number, valor: string) => `You have ${qtd} collections due today (Total: ${valor})`, locale: 'en-US', moeda: 'USD' },
  es: { titulo: '¡Jefe, Tenemos Trabajo! 🎩', corpo: (qtd: number, valor: string) => `Tienes ${qtd} cobros para hoy (Total: ${valor})`, locale: 'es-ES', moeda: 'USD' },
  hi: { titulo: 'बॉस, काम आ गया है! 🎩', corpo: (qtd: number, valor: string) => `आज आपके पास ${qtd} कलेक्शन बकाया हैं (कुल: ${valor})`, locale: 'hi-IN', moeda: 'INR' }
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    // Mantenha a sua SERVICE_KEY original aqui
    const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjYnl3a2xnam1hbXBlY3Zna3FmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODA5NzU2NiwiZXhwIjoyMDgzNjczNTY2fQ.YcbGbOdTTJv4eVVUuNZ3JuC39oL20oAcXKuJON1ITac';

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: usuarios, error: erroUser } = await supabase
      .from('profiles')
      .select('user_id, expo_token, language') 
      .not('expo_token', 'is', null)

    if (erroUser) throw erroUser;

    const mensagensMap = new Map();
    const hojeISO = new Date().toISOString().split('T')[0]; 

    console.log(`🔎 Processando cobranças até: "${hojeISO}"`);

    if (usuarios) {
      console.log(`👥 Usuários com token encontrados: ${usuarios.length}`);
      for (const usuario of usuarios) {
        
        // 🚀 ARQUITETURA BLINDADA: Limpa espaços, enters ocultos e tokens falsos
        if (!usuario.expo_token || typeof usuario.expo_token !== 'string') continue;
        const token = usuario.expo_token.trim();
        
        if (!token.startsWith('Expo') || token.length > 100) {
           console.log(`⚠️ Token ignorado (inválido): ${token.substring(0, 15)}...`);
           continue;
        }

        if (mensagensMap.has(token)) continue;

        const langCode = usuario.language && TRADUCOES[usuario.language] ? usuario.language : 'pt';
        const textos = TRADUCOES[langCode];

        let totalClientes = 0;
        let valorTotalGeral = 0.0;

        const { data: clientes } = await supabase.from('clientes').select('nome, contratos(*)').eq('user_id', usuario.user_id)
        if (!clientes || clientes.length === 0) continue;

        for (const cli of clientes) {
          if (!cli.contratos) continue;
          const listaContratos = Array.isArray(cli.contratos) ? cli.contratos : [];

          for (const con of listaContratos) {
            const statusPermitidos = ['ATIVO', 'ATRASADO', 'PARCELADO'];
            if (!statusPermitidos.includes(con.status)) continue;

            let dataVencimentoRaw = con.proximo_vencimento || con.proximoVencimento;
            if (!dataVencimentoRaw) continue;

            let dataVencimentoISO = dataVencimentoRaw;
            if (dataVencimentoRaw.includes('/')) {
              const partes = dataVencimentoRaw.split('/');
              if (partes.length === 3) {
                dataVencimentoISO = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
              }
            }

            if (dataVencimentoISO <= hojeISO) {
                let parcela = parseFloat(String(con.valor_parcela || con.valorParcela || 0).replace(/[^\d.,-]/g, '').replace(',', '.').trim());
                let capital = parseFloat(String(con.capital || 0).replace(/[^\d.,-]/g, '').replace(',', '.').trim());
                let taxa = parseFloat(String(con.taxa || 0).replace(/[^\d.,-]/g, '').replace(',', '.').trim());

                if (isNaN(parcela)) parcela = 0;
                if (isNaN(capital)) capital = 0;
                if (isNaN(taxa)) taxa = 0;

                let valorFinal = 0;
                if (con.status === 'PARCELADO' && parcela > 0) {
                    valorFinal = parcela;
                } else if (parcela > 0) {
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
            const valorFormatado = valorTotalGeral.toLocaleString(textos.locale, { style: 'currency', currency: textos.moeda });
            
            mensagensMap.set(token, {
                to: token,
                sound: 'default',
                // Trava extra de tamanho por segurança
                title: String(textos.titulo).substring(0, 90), 
                body: String(textos.corpo(totalClientes, valorFormatado)).substring(0, 90), 
                data: { url: '/(tabs)/cobranca' }
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

    // 🚀 ARQUITETURA BLINDADA: Dividindo as notificações em Lotes de 100 (Requisito Oficial da Expo)
    const lotes = [];
    for (let i = 0; i < mensagens.length; i += 100) {
      lotes.push(mensagens.slice(i, i + 100));
    }

    console.log(`📤 Enviando ${mensagens.length} mensagens divididas em ${lotes.length} lote(s)...`);
    const resultados = [];

    // Dispara cada lote para a Expo
    for (const lote of lotes) {
        console.log("📦 PAYLOAD ENVIADO:", JSON.stringify(lote)); // Vai te mostrar no log a string limpa!
        
        const respostaExpo = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(lote),
        });

        resultados.push(await respostaExpo.json());
    }

    console.log(`📡 Resposta do Expo:`, JSON.stringify(resultados));

    return new Response(JSON.stringify({ success: true, enviados: mensagens.length, expoResponse: resultados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})