import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'
import DBMySQL from '../../database/knex-mysql'
import SurgboxUpdateService from '../../service/surgbox/SurgboxUpdateService'

const routes = Router()

routes.get('/', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  const update_list = await SurgboxUpdateService.getUpdateList(req)
  const output = new StdObject()
  output.adds(update_list)
  res.json(output)
}))

routes.post('/', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const member_seq = token_info.getId()
  const update_seq = await SurgboxUpdateService.createUpdateInfo(member_seq, req.body)
  const output = new StdObject()
  output.add('update_seq', update_seq)
  res.json(output)
}))

routes.post('/:update_seq(\\d+)/file', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  const update_seq = req.params.update_seq
  const update_file_seq = await SurgboxUpdateService.uploadFile(update_seq, req, res)
  const output = new StdObject()
  output.add('update_file_seq', update_file_seq)
  res.json(output)
}))

routes.put('/:update_seq(\\d+)', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  const update_seq = req.params.update_seq
  const result = await SurgboxUpdateService.modifyUpdateInfo(update_seq, req.body)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.delete('/:update_seq(\\d+)', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  const update_seq = req.params.update_seq
  const result = await SurgboxUpdateService.deleteUpdateInfo(update_seq)
  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.get('/:update_seq(\\d+)', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  const update_seq = req.params.update_seq
  const result = await SurgboxUpdateService.getUpdateInfoForView(update_seq)
  const output = new StdObject()
  output.adds(result)
  res.json(output)
}))

routes.get('/list', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  const update_list = await SurgboxUpdateService.getUpdateList()
  const output = new StdObject()
  output.adds(update_list)
  res.json(output)
}))

export default routes
