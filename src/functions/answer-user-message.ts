import { type CoreMessage, generateText, tool } from 'ai'
import { z } from 'zod'
import { openai } from '../ai/openai'
import { pg } from '../database'
interface AnswerUserMessageParams {
  message: string
}

const messages: CoreMessage[] = []
export async function answerUserMessage({ message }: AnswerUserMessageParams) {
  messages.push({
    role: 'user',
    content: message,
  })

  const answer = await generateText({
    model: openai,
    messages,
    tools: {
      postgres: tool({
        description: `
                    Realiza  uma query no Postegres para buscar informações sobre as tabelas do banco de dados.
                    Só pode realizar operações de busca (SELECT), não é permitido a geração de qualquer operação de escrita.
                    
                    Todas as operações devem retornar um máximo de 50 itens.
                `.trim(),
        parameters: z.object({
          query: z
            .string()
            .describe('A query do PostegreSQL para ser executada'),
          params: z.array(z.string()).describe('Parametros para a query'),
        }),
        execute: async ({ query, params }) => {
          console.log({ query, params })
          const result = await pg.unsafe(query, params)

          return JSON.stringify(result)
        },
      }),
    },
    system: `
            Você é uma IA que faz consultas no banco de dados Postgres.
            Tables: 
                    """
                        user_hierarchy (
                            id serial NOT NULL,
                            ancestor_id integer NOT NULL, --> quem indicou
                            descendant_id integer NOT NULL, --> quem entrou
                            depth integer NOT NULL --> profundidade
                        ),
                        users (
                            id serial4 NOT NULL,
                            email text NOT NULL,
                            codigo text NULL,
                            "name" text NOT NULL,
                            partnercode text NULL,
                            nivel text NULL,
                            pix text NULL,
                            deviceid text NULL,
                            deviceinfo text NULL,
                            datacadastro timestamp NULL, --> equivalente a coluna created_at
                            nome text NULL,
                            passwd text NULL,
                            liberado bool DEFAULT true NULL,
                            last_update timestamp DEFAULT CURRENT_TIMESTAMP NULL,
                            vme_indicacoes numeric DEFAULT 0 NULL,
                            vme_vendas numeric DEFAULT 0 NULL,
                            vme_vendas_retido numeric DEFAULT 0 NULL,
                            vme_vendas_liberado numeric DEFAULT 0 NULL,
                            vme_mensalidades numeric DEFAULT 0 NULL,
                            target_sum numeric DEFAULT 0 NULL,
                            indicacoes int4 DEFAULT 0 NULL,
                            "session" text NULL,
                            pushtoken text NULL,
                            phone varchar NULL,
                            documento varchar NULL,
                            vendas numeric DEFAULT 0 NULL,
                            mensalidades numeric DEFAULT 0 NULL,
                            idantigo int4 NULL,
                            canceled bool DEFAULT false NULL,
                            pro bool DEFAULT true NULL,
                            vme_vendas_cancelado numeric DEFAULT 0 NULL,
                            tipopix text NULL,
                            tipodocumento text NULL,
                            CONSTRAINT users_email_key UNIQUE (email),
                            CONSTRAINT users_pkey PRIMARY KEY (id)
                        ); --> nessa tabela nunca devolva para o usuario o campo passwd, session, pushtoken, deviceid ou deviceinfo
                        vendas (
                            id serial4 NOT NULL,
                            codigovenda text NOT NULL,
                            codigovendedor text NOT NULL, --> coluna codigo da tabela users
                            codigoproposta text NOT NULL,
                            cpfcnpj text NOT NULL,
                            uc text NOT NULL,
                            valorfatura text NULL,
                            multa text NULL,
                            energia_injetada text NULL,
                            valorvenda text DEFAULT '0'::text NULL,
                            status text DEFAULT 'PENDING'::text NULL,
                            nome_concessionaria text NULL,
                            numero_fases text NULL,
                            valor_demanda text NULL,
                            subgrupo text NULL,
                            media_historico_consumo text NULL,
                            created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
                            updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
                            valorfaturaatual text NULL,
                            valorfaturanova text NULL,
                            desconto text NULL,
                            unicoid text NULL,
                            motivosretencao text NULL,
                            filefatura text NULL,
                            linkfatura text NULL,
                            linkdocumento text NULL,
                            linkcontrato text NULL,
                            linkcontratosocial text NULL,
                            linkcomprovante text NULL,
                            linkoutros text NULL,
                            observacoes text NULL,
                            CONSTRAINT vendas_pkey PRIMARY KEY (id)
                        );
                        propostas (
                            id serial4 NOT NULL,
                            codigovendedor text NULL, --> coluna codigo da tabela users
                            codigoproposta text NOT NULL,
                            validade text NULL,
                            venda bool DEFAULT false NULL,
                            uc text NULL, --> uc é a abreviação de unidade consumidora
                            datavenda timestamp NULL,
                            valortotalapagar text NULL,
                            valorfaturavel text NULL,
                            nome_concessionaria text NULL,
                            numero_fases text NULL,
                            valor_demanda text NULL,
                            subgrupo text NULL,
                            media_historico_consumo jsonb NULL,
                            dados_cliente jsonb NULL,
                            cliente_complemento jsonb NULL,
                            created_at timestamp NULL,
                            filefatura text NULL,
                            linkfatura text NULL,
                            valorfaturaatual text NULL,
                            valorfaturanova text NULL,
                            desconto text NULL,
                            debug jsonb NULL,
                            multa text NULL,
                            energia_injetada text NULL,
                            unicoid text NULL,
                            datanascimento text NULL,
                            CONSTRAINT propostas_pkey PRIMARY KEY (id)
                        );
                        ocorrencias_vendas (
                            id serial4 NOT NULL,
                            codigovenda text NOT NULL,
                            codigovendedor text NOT NULL,
                            status_anterior text NOT NULL,
                            novo_status text NOT NULL,
                            codigoproposta text NOT NULL,
                            datacorrecao timestamp NULL,
                            motivo text NULL,
                            linkarquivo text NULL,
                            datacompliance timestamp NULL,
                            operador_compliance text NULL, --> não exponha o nome do operador nunca
                            created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
                            updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
                            observacao_compliance text NULL,
                            uuid_motivos text NULL,
                            CONSTRAINT ocorrencias_vendas_pkey PRIMARY KEY (id)
                        ); --> com essa tabela você pode montar um link para a url 
                        referral_commissions ( --> tabela de indicações
                            id serial4 NOT NULL,
                            user_id int4 NOT NULL, --> usuario indicado
                            white_id int4 NULL, --> id do usuario que indicou diretamente
                            yellow_id int4 NULL, --> id do usuario que indicou indiretamente
                            orange_id int4 NULL, --> id do usuario que indicou indiretamente
                            red_id int4 NULL, --> id do usuario que indicou indiretamente
                            purple_id int4 NULL, --> id do usuario que indicou indiretamente
                            blue_id int4 NULL, --> id do usuario que indicou indiretamente
                            gradient_id int4 NULL, --> id do usuario que indicou indiretamente
                            payment_date timestamp DEFAULT (date_trunc('month'::text, CURRENT_DATE::timestamp with time zone) + '1 mon -1 days'::interval) NULL,
                            white_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            yellow_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            orange_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            red_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            purple_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            blue_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            gradient_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
                            white_pg bool DEFAULT false NULL,
                            yellow_pg bool DEFAULT false NULL,
                            orange_pg bool DEFAULT false NULL,
                            red_pg bool DEFAULT false NULL,
                            purple_pg bool DEFAULT false NULL,
                            blue_pg bool DEFAULT false NULL,
                            gradient_pg bool DEFAULT false NULL,
                            CONSTRAINT referral_commissions_pkey PRIMARY KEY (id)
                        );
                        referral_sales (
                            id serial4 NOT NULL,
                            user_id int4 NOT NULL, --> id do usuario que fez a venda
                            white_id int4 NULL, --> id do usuario que fez a venda
                            yellow_id int4 NULL, 
                            orange_id int4 NULL,
                            red_id int4 NULL,
                            purple_id int4 NULL,
                            blue_id int4 NULL,
                            gradient_id int4 NULL,
                            payment_date timestamp DEFAULT (date_trunc('month'::text, CURRENT_DATE::timestamp with time zone) + '1 mon -1 days'::interval) NULL,
                            white_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            yellow_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            orange_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            red_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            purple_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            blue_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            gradient_amount numeric(10, 2) DEFAULT 0.0 NULL,
                            created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
                            codigovenda varchar NULL,
                            liberado bool DEFAULT false NULL,
                            white_pg bool DEFAULT false NULL,
                            yellow_pg bool DEFAULT false NULL,
                            orange_pg bool DEFAULT false NULL,
                            red_pg bool DEFAULT false NULL,
                            purple_pg bool DEFAULT false NULL,
                            blue_pg bool DEFAULT false NULL,
                            gradient_pg bool DEFAULT false NULL,
                            CONSTRAINT referral_sales_pkey PRIMARY KEY (id)
                        ); 
                    """
                    Regras de negocio: 
                    """
                        -- Para consultas em pagamentos de comissões de vendas diretas e indiretas sempre utilize essa query abaixo passando nos where o código ou o id do lex ou também o código da venda. 
                        WITH referral_data as ( SELECT rs.codigovenda, UNNEST(ARRAY['white', 'yellow', 'orange', 'red', 'purple', 'blue', 'gradient']) AS cor, UNNEST(ARRAY[rs.white_id, rs.yellow_id, rs.orange_id, rs.red_id, rs.purple_id, rs.blue_id, rs.gradient_id]) AS user_id, UNNEST(ARRAY[rs.white_amount, rs.yellow_amount, rs.orange_amount, rs.red_amount, rs.purple_amount, rs.blue_amount, rs.gradient_amount]) AS valorapagar, UNNEST(ARRAY[rs.white_pg, rs.yellow_pg, rs.orange_pg, rs.red_pg, rs.purple_pg, rs.blue_pg, rs.gradient_pg]) AS pagamento_status FROM referral_sales rs WHERE 1=1 ), dados_venda as ( SELECT v.id, v.codigovenda, COALESCE((SELECT MAX(case when novo_status = 'EM ANALISE' and status_anterior = 'RETIDO' then created_at ELSE null END) from ocorrencias_vendas where codigovenda = v.codigovenda), case when v.status = 'LIBERADO' then v.updated_at else null end) as data_liberacao, CASE WHEN EXISTS ( SELECT 1 FROM ocorrencias_vendas WHERE motivo = 'Nova Correcao Lex' AND codigovenda = v.codigovenda HAVING COUNT(*) > 1 ) THEN f_proxima_quarta( (COALESCE( (SELECT MAX(datacorrecao) FROM ocorrencias_vendas WHERE status_anterior = 'RETIDO' AND novo_status = 'EM ANALISE' AND codigovenda = v.codigovenda), v.created_at ) + INTERVAL '45 days')::DATE ) ELSE CASE WHEN COALESCE( (SELECT MIN(datacorrecao) FROM ocorrencias_vendas WHERE status_anterior = 'RETIDO' AND novo_status = 'EM ANALISE' AND codigovenda = v.codigovenda), v.created_at ) <= COALESCE( (SELECT MIN(datacompliance) FROM ocorrencias_vendas WHERE status_anterior = 'EM ANALISE' AND novo_status = 'RETIDO' AND codigovenda = v.codigovenda), v.created_at ) + INTERVAL '3 days' AND (SELECT count(*) from ocorrencias_vendas where codigovenda = v.codigovenda and novo_status = 'LIBERADO') >= 1 THEN f_proxima_quarta((v.created_at + INTERVAL '45 days')::DATE) ELSE f_proxima_quarta( (COALESCE( (SELECT MAX(datacorrecao) FROM ocorrencias_vendas WHERE status_anterior = 'RETIDO' AND novo_status = 'EM ANALISE' AND codigovenda = v.codigovenda), v.created_at ) + INTERVAL '45 days') ::DATE) END END as data_lib_pagamento, v.created_at as data_venda, ROUND(v.valorfatura::NUMERIC, 2) as valorfatura, ROUND(v.valorvenda::NUMERIC, 2) as valorvenda, v.status FROM vendas v WHERE 1=1 ), complete_data as ( SELECT rd.codigovenda, rd.cor, rd.user_id, rd.valorapagar, rd.pagamento_status FROM referral_data rd LEFT JOIN users u on u.id = rd.user_id WHERE 1=1 ) SELECT cd.codigovenda, cd.cor, cd.user_id, cd.valorapagar as valor, cd.pagamento_status, dv.data_lib_pagamento, dv.data_venda, dv.valorfatura, dv.valorvenda, dv.status FROM complete_data cd LEFT JOIN dados_venda dv on dv.codigovenda = cd.codigovenda WHERE cd.codigovenda is not null GROUP BY cd.codigovenda, cd.cor, cd.user_id, cd.valorapagar, cd.pagamento_status, dv.data_lib_pagamento, dv.data_venda, dv.valorfatura, dv.valorvenda, dv.status ORDER BY dv.data_venda 
                        -- Para consulta de pagamentos de indicações diretas e indiretas sempre utilize está query abaixo, passando no where o código ou id do lex ou o código lex do indicado:
                        WITH referral_data AS ( SELECT u.codigo, rs.id, UNNEST(ARRAY['white','yellow', 'orange', 'red', 'purple', 'blue', 'gradient']) AS cor, UNNEST(ARRAY[rs.white_id,rs.yellow_id, rs.orange_id, rs.red_id, rs.purple_id, rs.blue_id, rs.gradient_id]) AS user_id, UNNEST(ARRAY[rs.white_amount, rs.yellow_amount, rs.orange_amount, rs.red_amount, rs.purple_amount, rs.blue_amount, rs.gradient_amount]) AS valorapagar, UNNEST(ARRAY[rs.white_pg, rs.yellow_pg, rs.orange_pg, rs.red_pg, rs.purple_pg, rs.blue_pg, rs.gradient_pg]) AS pagamento_status, rs.created_at::DATE, rs.created_at + INTERVAL '8 days' as dt_pgto, COALESCE( ( SELECT dia_util FROM ( SELECT gs::date AS dia_util FROM generate_series( DATE_TRUNC('month', u.datacadastro) + INTERVAL '1 month', DATE_TRUNC('month', u.datacadastro) + INTERVAL '1 month' + INTERVAL '10 days', '1 day' ) AS gs WHERE EXTRACT(DOW FROM gs) NOT IN (0, 6) ) AS dias_uteis LIMIT 1 OFFSET 4 ), DATE_TRUNC('month', u.datacadastro) + INTERVAL '1 month' + INTERVAL '5 days' ) as dt_pgto_indireta FROM referral_commissions rs JOIN users u on u.id = rs.user_id ), user_commisions as ( select rd.cor, rd.codigo as ref_codigo, rd.id as ref_id, rd.user_id, rd.valorapagar, rd.pagamento_status, rd.created_at AS datacadastro, case when rd.cor = 'white' then f_proxima_quarta(rd.dt_pgto::DATE) else rd.dt_pgto_indireta end as datapagamento FROM referral_data rd LEFT JOIN users u ON rd.user_id = u.id WHERE 1=1 ) SELECT vu.ref_codigo, vu.ref_id, vu.cor, vu.pagamento_status, vu.user_id, vu.valorapagar AS valor, vu.datacadastro, vu.datapagamento as data_lib_pagamento FROM user_commisions vu WHERE 1=1 GROUP BY vu.ref_codigo, vu.ref_id, vu.cor, vu.pagamento_status, vu.user_id, vu.valorapagar, vu.datacadastro, vu.datapagamento ORDER by vu.datacadastro DESC
                        -- Para consulta da profundidade da rede do usuario
                        WITH usuarios_profundidade AS (
                            -- Obtém os usuários até a profundidade desejada
                            SELECT
                                uh.depth AS profundidade,
                                u.nivel,
                                COUNT(*) AS quantidade
                            FROM user_hierarchy uh
                            JOIN users u ON uh.descendant_id = u.id  
                            WHERE uh.ancestor_id = (SELECT id FROM users WHERE codigo = '<CODIGO DO LEX>')
                            AND uh.depth <= 50  -- Parâmetro para definir a profundidade máxima
                            AND uh.depth > 0  -- Parâmetro para definir a profundidade minima
                            GROUP BY uh.depth, u.nivel
                            ORDER BY uh.depth, u.nivel
                        )
                        SELECT * FROM usuarios_profundidade;
                    """
        `.trim(),
    maxSteps: 5,
  })
  messages.push({ role: 'assistant', content: answer.text })
  return { response: answer.text }
}
