import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { answerUserMessage } from '../functions/answer-user-message'

export const sendMessageRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/messages',
    {
      schema: {
        summary: 'Send message to the AI chat',
        tags: ['AI'],
        body: z.object({
          message: z.string(),
        }),
        response: {
          201: z.object({ response: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { message } = request.body
      const { response } = await answerUserMessage({
        message,
      })

      console.log(response)
      return { response }
    }
  )
}
