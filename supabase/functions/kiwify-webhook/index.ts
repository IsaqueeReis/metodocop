import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Esta função será hospedada no Supabase Edge Functions.
// Ela recebe os avisos da Kiwify e atualiza o banco de dados.

serve(async (req) => {
  try {
    // 1. Pega os dados enviados pela Kiwify
    const payload = await req.json()
    console.log("Recebido Webhook Kiwify:", JSON.stringify(payload))

    // O status do pedido na Kiwify (ex: 'paid', 'refunded', 'waiting_payment')
    const status = payload.order_status
    // O email do cliente que comprou
    const email = payload.Customer?.email

    if (!email) {
      return new Response("Email não encontrado no payload.", { status: 400 })
    }

    // O ID ou Nome do Produto na Kiwify
    const productName = payload.product_name || payload.Product?.name || ''
    
    // 2. Conecta no seu banco Supabase usando chaves de administrador (Service Role)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Defina aqui o nome do produto que dá ACESSO COMPLETO
    const isFullAccess = productName.toLowerCase().includes('completo') || productName.toLowerCase().includes('vip');

    // 3. Lógica de Aprovação
    if (status === 'paid') {
      if (isFullAccess) {
        // Se pagou o acesso completo, aprova o aluno totalmente
        const { error } = await supabaseClient
          .from('users')
          .update({ approved: true })
          .eq('email', email)
        
        if (error) throw error
        console.log(`Aluno ${email} APROVADO TOTALMENTE (Acesso Completo).`)
      } else {
        // Se comprou um produto avulso (Apostila, Mentoria, etc), adiciona na mochila
        // Primeiro, busca o aluno
        const { data: user, error: fetchError } = await supabaseClient
          .from('users')
          .select('purchased_products')
          .eq('email', email)
          .single()

        if (user) {
          const currentPurchases = user.purchased_products || []
          if (!currentPurchases.includes(productName)) {
            currentPurchases.push(productName)
            await supabaseClient
              .from('users')
              .update({ purchased_products: currentPurchases })
              .eq('email', email)
          }
        }
        console.log(`Produto ${productName} adicionado à mochila do aluno ${email}.`)
      }
      return new Response(`Compra de ${email} processada.`, { status: 200 })

    } else if (status === 'refunded' || status === 'chargeback') {
      // Se pediu reembolso, remove a aprovação (para refinar depois, poderíamos remover só o produto)
      const { error } = await supabaseClient
        .from('users')
        .update({ approved: false })
        .eq('email', email)
        
      if (error) throw error
      console.log(`Aluno ${email} BLOQUEADO (reembolso/chargeback).`)
      return new Response(`Aluno ${email} bloqueado.`, { status: 200 })
    }

    // Outros status (waiting_payment, etc) ignoramos e retornamos sucesso.
    return new Response("Webhook recebido, nenhuma ação necessária.", { status: 200 })

  } catch (error) {
    console.error("Erro no processamento do webhook:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }
})
