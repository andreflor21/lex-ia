import path from 'node:path'
import fs from 'node:fs'
import { fastifyCors } from '@fastify/cors'
import { fastifyMultipart } from '@fastify/multipart'
import { fastifyStatic } from '@fastify/static'
import { fastify } from 'fastify'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'
import { env } from './env'
import { sendMessageRoute } from './routes/send-message-route'

const app = fastify({
  https: env.HTTPS_CERT ? { cert: env.HTTPS_CERT, key: env.HTTPS_KEY } : null,
  logger: true,
})

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)
app.register(fastifyCors)
app.register(fastifyMultipart)

// Check if static dir exists
if (!fs.existsSync(path.join(__dirname, '../static/uploads'))) {
  fs.mkdirSync(path.join(__dirname, '../static/uploads'))
}
app.register(fastifyStatic, {
  root: path.join(__dirname, '../static/uploads'),
  prefix: '/static',
  list: false,
})
app.get('/', async () => {
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
