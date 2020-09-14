import { Router } from 'express'
import Wrap from '../../utils/express-async'
import StudioService from '../../service/project/StudioService'
import StdObject from '../../wrapper/std-object'

const routes = Router()

routes.post('/download/complete', Wrap(async (req, res) => {
  req.accepts('application/json')
  const response_data = req.body
  const update_result = await StudioService.onDownloadComplete(response_data)

  const output = new StdObject()
  output.add('result', update_result)
  res.json(output)
}))

export default routes
