import { tool } from 'ai'
import { z } from 'zod'
import { pg } from '../database'

export const postgresTool = tool({
  description: `
                    Realiza  uma query no Postegres para buscar informações sobre as tabelas do banco de dados.
                    Só pode realizar operações de busca (SELECT), não é permitido a geração de qualquer operação de escrita.
                    
                    Todas as operações devem retornar um máximo de 50 itens.
                `.trim(),
  parameters: z.object({
    query: z.string().describe('A query do PostegreSQL para ser executada'),
    params: z.array(z.string()).describe('Parametros para a query'),
  }),
  execute: async ({ query, params }) => {
    console.log({ query, params })
    const result = await pg.unsafe(query, params)

    return JSON.stringify(result)
  },
})
