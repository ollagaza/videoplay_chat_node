import { Router } from 'express'
import Wrap from '../../utils/express-async'
import SocketManager from '../../service/socket-manager'
import log from '../../libs/logger'

const routes = Router()

routes.get('/reloadService', Wrap(async (req, res) => {
  await SocketManager.requestReloadService()
  log.debug('node api reloadService call')
  res.json('success')
}))

export default routes
