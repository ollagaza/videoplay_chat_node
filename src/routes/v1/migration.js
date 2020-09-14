import { Router } from 'express'
import Wrap from '../../utils/express-async'
import MigrationService from '../../service/etc/MigrationService'

const routes = Router()

routes.get('/setGroupCounts', Wrap(async (req, res) => {
  const result = await MigrationService.setGroupCounts()
  res.json(result)
}))

export default routes
