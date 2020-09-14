import { Router } from 'express'
import Wrap from '../../utils/express-async'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'

import analysis_response from '../../data/analysis_response'

const routes = Router()

routes.get('/analysis_data', Wrap(async (req, res) => {
  const output = new StdObject()
  log.debug(analysis_response)
  output.add('analysis_data', analysis_response)
  res.json(output)
}))

export default routes
