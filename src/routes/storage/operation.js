import { Router } from 'express'
import Wrap from '../../utils/express-async'
import SyncService from '../../service/sync/SyncService'
import StdObject from '../../wrapper/std-object'
import logger from '../../libs/logger'

const routes = Router()

const onFileMoveComplete = (req, res) => {
  req.accepts('application/json')
  const response_data = req.body
  const update_result = SyncService.onOperationFileMoveCompeteByRequest(response_data)

  const output = new StdObject()
  output.add('result', update_result)
  res.json(output)
}

routes.post('/video/move/complete', Wrap(async (req, res) => {
  onFileMoveComplete(req, res)
}))
routes.post('/image/move/complete', Wrap(async (req, res) => {
  onFileMoveComplete(req, res)
}))

routes.post('/analysis/complete', Wrap(async (req, res) => {
  onFileMoveComplete(req, res)
}))



routes.post('/origin/copy/complete', Wrap(async (req, res) => {
  req.accepts('application/json')
  const response_data = req.body
  const update_result = SyncService.onOperationOriginFileCopyCompeteByRequest(response_data)

  const output = new StdObject()
  output.add('result', update_result)
  res.json(output)
}))

export default routes
