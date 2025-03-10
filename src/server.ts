import { fastifyCors } from '@fastify/cors'
import { fastify } from 'fastify'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import { env } from './env'
import { sendMessageRoute } from './routes/send-message-route'

const app = fastify({})

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)
app.register(fastifyCors)
app.get('/', async (request, reply) => {
  return { hello: 'world' }
})
app.register(sendMessageRoute)

app.listen({ port: env.PORT }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  console.log(`server listening on ${address}`)
})
