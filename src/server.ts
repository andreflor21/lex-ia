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

const httpsOptions = {
  key: env.HTTPS_KEY ? fs.readFileSync(env.HTTPS_KEY as string) : undefined,
  cert: env.HTTPS_CERT ? fs.readFileSync(env.HTTPS_CERT as string) : undefined,
};

// Check if static dir exists
if (!fs.existsSync(path.join(__dirname, '../logs/server.log'))) {
  fs.mkdirSync(path.join(__dirname, '../logs/server.log'))
}
const app = fastify({
  https: env.HTTPS_CERT && env.HTTPS_KEY ? httpsOptions : null,
  logger: {
    level: 'info',
    file: path.join(__dirname, '../logs/server.log'),
  },
})

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)
app.register(fastifyCors)
app.register(fastifyMultipart)

// Check if static dir exists
if (!fs.existsSync(path.join(__dirname, '../static'))) {
  fs.mkdirSync(path.join(__dirname, '../static'))
}
app.register(fastifyStatic, {
  root: path.join(__dirname, '../static'),
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
