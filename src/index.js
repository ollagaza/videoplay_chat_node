import os from 'os'
import app from './app'
import log from './libs/logger'
import InitService from './service/init'

const { PORT = 3000 } = process.env

process.env.HOSTNAME = os.hostname()

app.listen(PORT, '0.0.0.0', async () => {
  log.d(null, `Listening on port ${PORT} -> PID: ${process.pid}`)
  await InitService.init()
})
