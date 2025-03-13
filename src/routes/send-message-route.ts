import { extname } from 'node:path'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { answerUserMessage } from '../functions/answer-user-message'

export const sendMessageRoute: FastifyPluginAsyncZod = async app => {
  app.post(
    '/messages',
    {
      logLevel: 'error',
      // schema: {
      //   summary: 'Send message to the AI chat',
      //   tags: ['AI'],
      //   body:
      //     z.object({
      //       message: z.string(),
      //       file: z.any().optional(),
      //     }),
      //   consumes: ['multipart/form-data', 'application/json'],
      //   response: {
      //     201: z.object({ response: z.string() }),
      //     400: z.object({ error: z.string() }),
      //   },
      // },
    },
    async (request, reply) => {
      try {
        if (request.isMultipart()) {
          const parts = request.parts()
          let message: string | null = null
          let fileBuffer: Buffer | null = null
          let fileType: string | null = null

          for await (const part of parts) {
            if (part.type === 'field' && part.fieldname === 'message') {
              message = part.value as string
            } else if (part.type === 'file' && part.fieldname === 'file') {
              const allowedFileTypes = ['.png', '.jpg', '.jpeg', '.pdf']
              const fileExtension = extname(part.filename || '').toLowerCase()
              if (!allowedFileTypes.includes(fileExtension)) {
                return reply.status(400).send({
                  error: 'Invalid file type. Only PDF and images are allowed.',
                })
              }

              fileBuffer = await part.toBuffer()
              fileType = fileExtension
            }
          }
          if (!message) {
            return reply.status(400).send({ error: 'Message is required.' })
          }
          console.log('File received:', {
            size: fileBuffer?.length,
            type: fileType,
          })
          const { response } = await answerUserMessage({
            message,
            file: fileBuffer as Buffer,
            fileType: fileType as string, // Inclui o arquivo no processamento, se necessário
          })

          return reply.status(201).send({ response })
        }
        const { message } = z.object({message: z.string()}).parse(request.body)
        if (!message) {
          return reply.status(400).send({ error: 'Message is required.' })
        }

        const { response } = await answerUserMessage({ message })
        console.log(response)
        return reply.status(201).send({ response })
      } catch (error) {
        app.log.error(error)
        if (error instanceof Error)
          return reply.status(400).send({ error: error.message })

        return reply.status(400).send({ error: "Erro desconhecido" })
      }
    }
  )
}
