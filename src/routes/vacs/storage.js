import { Router } from 'express'
import Wrap from '../../utils/express-async'
import VacsService from '../../service/vacs/VacsService'
import StdObject from '../../wrapper/std-object'

const routes = Router()

routes.put('/status', Wrap(async (req, res) => {
  req.accepts('application/json')
  const request_body = req.body
  const update_result = await VacsService.updateStorageStatusByApi(null, request_body)

  const output = new StdObject()
  output.add('result', update_result)
  res.json(output)
}))

export default routes
