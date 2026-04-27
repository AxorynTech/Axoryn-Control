import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Configuração de CORS para o App conseguir chamar a função
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Responde a requisições de pre-flight do navegador/app
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, tipoContrato, nomeUsuario } = await req.json()
    const openAiKey = Deno.env.get('OPENAI_API_KEY')

    // 🧠 O PROMPT MESTRE: Aqui definimos o comportamento da IA
    const systemPrompt = `
      Você é o Assistente Jurídico de Elite da Axoryn Tecnologia. 
      Sua missão é gerar um contrato de ${tipoContrato} profissional, seguindo as leis brasileiras.
      
      Regras Críticas:
      1. Use uma linguagem formal e jurídica.
      2. Inclua cláusulas de multas, juros de mora e foro de eleição.
      3. Onde houver dados variáveis, use colchetes como [NOME COMPLETO], [CPF], [VALOR].
      4. No final, coloque campos claros para ASSINATURA DO CREDOR e ASSINATURA DO DEVEDOR.
      5. O contrato deve ser estruturado para virar um PDF bonito.
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o', // Modelo mais inteligente para contratos
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Gere um contrato com base nestas informações: ${prompt}` }
        ],
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    const textoGerado = data.choices[0].message.content

    return new Response(JSON.stringify({ contrato: textoGerado }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})