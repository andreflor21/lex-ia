import { createReadStream, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { tool } from 'ai'
import OpenAI from 'openai'
import type {
  Message,
  MessageContentPartParam,
  MessageCreateParams,
  TextContentBlock
} from 'openai/resources/beta/threads'
import { z } from 'zod'
import { env } from '../env'

export const filesTool = tool({
  description: `
        Processa arquivos (PDFs ou imagens) e envia para a OpenAI para extração de informações.
        Imagens são processadas via URL pública. PDFs são carregados e analisados.
        Extrair os dados da fatura e caso não seja possivel extrair os dados do pdf, retornar os campos vazios.
        Utilizar a seção "Para leituras/análises/processamento de faturas de energia utilizar sempre as instruções abaixo" como base de instruções
    `.trim(),
  // description: `
  //
  // `.trim(),
  parameters: z.object({
    fileName: z.string().describe('Nome do arquivo enviado'),
    message: z.string().describe('Mensagem do usuário sobre o arquivo'),
  }),
  execute: async ({ fileName, message }) => {
    console.log('Recebido na tool files:', { fileName, message })

    if (!fileName) {
      return JSON.stringify({ success: false, error: "O buffer do arquivo não foi enviado."})
    }

    try {
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
      const uploadDir = '../../static'
      const fileUploadExt = fileName.split('.').pop()?.toLowerCase()
      if (!fileUploadExt) return JSON.stringify({ success: false, error: "Extensão do arquivo inválida"})
      // if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir)

      const filePath = resolve(__dirname, uploadDir, fileName)
      console.log('Caminho do arquivo:', filePath)
      // const fileStream = createReadStream(filePath)
      const content: MessageContentPartParam[] = []
      let fileUploadId: string | undefined
      if (['jpeg', 'jpg', 'png'].includes(fileUploadExt)) {
        const imageUrl = `https://lexaiapi.energiacom.vc/static/${fileName}`
        content.push({
          type: 'image_url',
          image_url: { url: imageUrl, detail: 'high' },
        })
      } else if (fileUploadExt === 'pdf') {
        console.log({ fileUploadExt })
        try {
          const fileUpload = await openai.files.create({
            file: createReadStream(filePath),
            purpose: 'assistants',
          })
          console.log('resuldado do upload: ', { fileUpload })
          fileUploadId = fileUpload.id as string
          content.push({
            type: 'text',
            text: message,
          })
        } catch (error) {
          console.log(error)
        }
      }
      console.log(content)
      // Enviar a solicitação para a OpenAI
      const threadId = await askOpenAI(openai, content, [
        { file_id: fileUploadId, tools: [{ type: 'file_search' }] },
      ])

      // Processar resposta
      if (threadId) {
        const messages = await getOpenAIResponse(openai, threadId)
        unlinkSync(filePath)
        return JSON.stringify({ success: true, data: messages })
      }
      unlinkSync(filePath)
      return JSON.stringify({ success: false, error: "Não foi possivel gerar a threadID" })
    } catch (error) {
      if (error instanceof Error)
        return JSON.stringify({ success: false, error: error.message })

      return JSON.stringify({ success: false, error: 'Erro desconhecido' })
    }
  },
})

// Função para enviar a solicitação para a OpenAI
async function askOpenAI(
  client: OpenAI,
  prompt: MessageContentPartParam[],
  attachments: MessageCreateParams.Attachment[] | null = null
) {
  const messagePayload: MessageCreateParams = {
    role: 'user',
    content: prompt,
  }
  if (attachments) messagePayload.attachments = attachments

  const res = await client.beta.threads.create({
    messages: [messagePayload],
  })

  return res.id
}

// Função para recuperar respostas da OpenAI
async function getOpenAIResponse(client: OpenAI, threadId: string) {
  return new Promise((resolve, reject) => {
    const allMessages: Message[] = []
    client.beta.threads.runs
      .stream(threadId, { assistant_id: env.OPENAI_ASSISTANT_ID })
      .on('messageDone', msg => {
        return allMessages.push(msg)
      })
      .on('end', () => resolve(allMessages))
      .on('error', reject)
  })
}
