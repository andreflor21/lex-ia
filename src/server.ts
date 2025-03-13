import path from 'node:path'
import fs from 'node:fs'
import { fastifyCors } from '@fastify/cors'
import { fastifyMultipart } from '@fastify/multipart'
import { fastifyStatic } from '@fastify/static'
import {fastify, FastifyHttpOptions, FastifyHttpsOptions} from 'fastify'
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
console.log(httpsOptions)
// // Check if static dir exists
// if (!fs.existsSync(path.join(__dirname, '../logs'))) {
//   fs.mkdirSync(path.join(__dirname, '../logs'))
// }

const fastifyOptions: {
  logger: {
    level: string;
    file: string;
  },
  https?: {
    key: Buffer | undefined;
    cert: Buffer | undefined;
  }
} = {
  logger: {
  level: 'info',
      file: path.join(__dirname, '../logs/server.log'),
  },
}
if(env.NODE_ENV === 'production')
  fastifyOptions.https = httpsOptions;

const app = fastify({
  ...fastifyOptions,
})

app.setSerializerCompiler(serializerCompiler)
app.setValidatorCompiler(validatorCompiler)
app.register(fastifyCors)
app.register(fastifyMultipart, {
  limits: {
    fileSize: 1024 * 1024 * 10,
    files: 1,
  }
})

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
