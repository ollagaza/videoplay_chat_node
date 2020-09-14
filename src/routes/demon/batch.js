import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import log from '../../libs/logger'
import BatchOperationQueueModel from '../../database/mysql/batch/BatchOperationQueueModel'
import OperationScheduler from '../../scheduler/OperationScheduler'

const routes = Router()

routes.post('/operation', Auth.isAuthenticated(Role.API), Wrap(async (req, res) => {
  req.accepts('application/json')

  const token_info = req.token_info
  const member_seq = token_info.getId()

  const output = new StdObject()
  let success = false
  let message = ''
  await DBMySQL.transaction(async (transaction) => {
    const sync_model = new BatchOperationQueueModel(transaction)
    if (await sync_model.verifyKey(member_seq, req.body.key)) {
      await sync_model.push(member_seq, req.body.key, req.body.data)
      success = true
    } else {
      output.setError(-1)
      message = `${req.body.key} is already use`
    }
  })

  output.add('success', success)
  output.add('message', message)
  res.json(output)

  if (success) {
    try {
      OperationScheduler.onNewJob()
    } catch (e) {
      log.e(req, e)
    }
  }
}))

export default routes
