import { createFileRoute } from "@tanstack/react-router";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

const tool = {
  type: "function",
  function: {
    name: "registrar_nota",
    description:
      "Registra os dados extraídos de uma nota fiscal, cupom fiscal, boleto, duplicata ou recibo de compra de material/serviço de obra. Campos ausentes ou ilegíveis devem ser null — nunca inventar.",
    parameters: {
      type: "object",
      properties: {
        categoria: {
          type: ["string", "null"],
          enum: ["material", "mao_obra", "equipamento", null],
          description: "Categoria mais provável do gasto.",
        },
        descricao: {
          type: ["string", "null"],
          description: "Resumo curto do item principal (ex: 'Cimento CP-II 50kg').",
        },
        fornecedor: {
          type: ["string", "null"],
          description: "Nome da loja/empresa emitente, sem CNPJ.",
        },
        subcategoria: {
          type: ["string", "null"],
          description: "Detalhe opcional (ex: 'hidráulica').",
        },
        valor: {
          type: ["number", "null"],
          description: "Valor total da nota em reais, apenas número.",
        },
        quantidade: {
          type: ["number", "null"],
          description: "Quantidade apenas se houver um item claramente dominante.",
        },
        unidade: {
          type: ["string", "null"],
          description: "Unidade do item dominante (sc, m³, un, kg...).",
        },
        data: {
          type: ["string", "null"],
          description: "Data de emissão no formato AAAA-MM-DD.",
        },
        condicao_pagamento: {
          type: ["string", "null"],
          enum: ["a_vista", "parcelado", null],
          description:
            "'a_vista' quando pagamento à vista/sem prazo; 'parcelado' quando houver prazos ou múltiplas parcelas; null se não informado.",
        },
        parcelas: {
          type: "array",
          description:
            "Plano de parcelas exato. Vazio quando à vista. Se a nota traz datas e valores explícitos (boletos/duplicatas), use-os. Se traz apenas prazos em dias (ex: 30/60/90), calcule vencimento = emissão + N dias e divida o valor total igualmente, jogando o resto de arredondamento na 1ª parcela. A soma deve bater com o valor total. Nunca invente prazos.",
          items: {
            type: "object",
            properties: {
              vencimento: {
                type: ["string", "null"],
                description: "Data de vencimento no formato AAAA-MM-DD.",
              },
              valor: {
                type: ["number", "null"],
                description: "Valor da parcela em reais.",
              },
            },
            required: ["vencimento", "valor"],
            additionalProperties: false,
          },
        },
      },
      required: [
        "categoria",
        "descricao",
        "fornecedor",
        "subcategoria",
        "valor",
        "quantidade",
        "unidade",
        "data",
        "condicao_pagamento",
        "parcelas",
      ],
      additionalProperties: false,
    },
  },
};

export const Route = createFileRoute("/api/public/ler-nota")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return json({ ok: false, error: "LOVABLE_API_KEY ausente" }, 500);

          const body = (await request.json()) as { image?: string };
          const image = body?.image;
          if (!image || typeof image !== "string") {
            return json({ ok: false, error: "Imagem ausente" }, 400);
          }

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content:
                    "Você extrai dados de notas fiscais, cupons fiscais, boletos, duplicatas e recibos de compra de obra no Brasil. Sempre chame a função registrar_nota. Nunca invente valores: se um campo não estiver legível ou não existir, retorne null.\n\nLeia atentamente as condições de pagamento: 'à vista', 'a prazo', '30/60/90 dias', '3x', duplicatas e boletos.\n- Se a fatura traz datas de vencimento e valores explícitos (boletos/duplicatas), use-os exatamente em `parcelas` e defina condicao_pagamento='parcelado'.\n- Se traz apenas prazos em dias (ex: '30/60/90 dias'), calcule cada vencimento = data de emissão + N dias e divida o valor total igualmente entre as parcelas, jogando qualquer diferença de arredondamento na primeira parcela. A soma das parcelas deve bater com o valor total. condicao_pagamento='parcelado'.\n- Se for à vista ou não houver informação de prazo, retorne condicao_pagamento='a_vista' (ou null se realmente não souber) e parcelas=[]. Nunca invente prazos.",
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Extraia os dados desta nota." },
                    { type: "image_url", image_url: { url: image } },
                  ],
                },
              ],
              tools: [tool],
              tool_choice: { type: "function", function: { name: "registrar_nota" } },
            }),
          });

          if (!aiRes.ok) {
            const errText = await aiRes.text();
            console.error("AI Gateway erro", aiRes.status, errText);
            if (aiRes.status === 429) {
              return json(
                { ok: false, error: "Limite de uso da IA atingido, tente em instantes" },
                429,
              );
            }
            if (aiRes.status === 402) {
              return json({ ok: false, error: "Créditos de IA esgotados" }, 402);
            }
            return json({ ok: false, error: "Falha ao ler a nota" }, 500);
          }

          const data = (await aiRes.json()) as {
            choices?: Array<{
              message?: {
                tool_calls?: Array<{ function?: { arguments?: string } }>;
              };
            }>;
          };
          const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (!args) {
            return json({ ok: false, error: "IA não retornou dados" }, 500);
          }
          let dados: Record<string, unknown>;
          try {
            dados = JSON.parse(args);
          } catch {
            return json({ ok: false, error: "Resposta inválida da IA" }, 500);
          }

          return json({ ok: true, dados });
        } catch (e) {
          console.error("ler-nota erro", e);
          return json(
            { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
            500,
          );
        }
      },
    },
  },
});
