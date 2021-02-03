import { Router } from 'express'
import Wrap from '../../../utils/express-async'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import DBMySQL from '../../../database/knex-mysql'
import StdObject from '../../../wrapper/std-object'
import OperationLinkService from '../../../service/operation/OperationLinkService'
import OperationService from '../../../service/operation/OperationService'
import GroupService from '../../../service/group/GroupService'
import Util from '../../../utils/baseutil'

const routes = Router()

const getOperationInfoByCode = async (request, import_media_info = false, only_writer = false) => {
  const link_code = request.params.link_code
  if (Util.isEmpty(link_code)) {
    throw new StdObject(-1, '잘못된 접근입니다.', 400)
  }
  const link_info = await OperationLinkService.getOperationLinkByCode(DBMySQL, link_code)
  if (only_writer) {
    if (link_info.auth !== OperationLinkService.AUTH_WRITE) {
      throw new StdObject(-2, '권한이 없습니다.', 403)
    }
  }
  const operation_seq = link_info.operation_seq
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, import_media_info)

  const clip_id = request.params.clip_id
  const phase_id = request.params.phase_id

  return {
    link_code,
    operation_seq,
    link_info,
    operation_info,
    clip_id,
    phase_id
  }
}

routes.get('/check/:link_code', Wrap(async (req, res) => {
  const link_code = req.params.link_code
  const link_info = await OperationLinkService.checkOperationLinkByCode(DBMySQL, link_code)

  const output = new StdObject()
  output.add('link_info', link_info)
  res.json(output)
}))

routes.post('/check/password/:link_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const link_seq = req.params.link_seq
  const password = req.body.password

  const is_verified = await OperationLinkService.checkLinkPassword(DBMySQL, link_seq, password)

  const output = new StdObject()
  output.add('is_verified', is_verified)
  res.json(output)
}))

routes.get('/:operation_seq(\\d+)/email', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq
  const link_info_list = await OperationLinkService.getOperationLinkList(DBMySQL, operation_seq, OperationLinkService.TYPE_EMAIL)

  const output = new StdObject()
  output.add('link_info_list', link_info_list)
  res.json(output)
}))

routes.get('/:operation_seq(\\d+)/static', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq
  const link_info_list = await OperationLinkService.getOperationLinkList(DBMySQL, operation_seq, OperationLinkService.TYPE_STATIC)

  const output = new StdObject()
  output.add('link_info_list', link_info_list)
  res.json(output)
}))

routes.get('/:operation_seq(\\d+)/has_link', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq
  const has_link = await OperationLinkService.hasLink(DBMySQL, operation_seq)

  const output = new StdObject()
  output.add('has_link', has_link)
  res.json(output)
}))

routes.post('/:operation_seq(\\d+)/email', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { member_info, token_info } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq
  const link_info_list = await OperationLinkService.createOperationLinkByEmailList(operation_seq, member_info, req.body, token_info.getServiceDomain())

  const output = new StdObject()
  output.add('send_count', link_info_list.length)
  res.json(output)
}))

routes.post('/:operation_seq(\\d+)/static', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_seq = req.params.operation_seq
  const link_info = await OperationLinkService.createOperationLinkOne(operation_seq, req.body)

  const output = new StdObject()
  output.add('link_info', link_info)
  res.json(output)
}))

routes.put('/:link_seq(\\d+)/options', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  req.accepts('application/json')
  const link_seq = req.params.link_seq
  const result = await OperationLinkService.setLinkOptionBySeq(link_seq, req.body)

  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

routes.delete('/:link_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  req.accepts('application/json')
  const link_seq = req.params.link_seq
  const result = await OperationLinkService.deleteOperationLinkBySeq(link_seq)

  const output = new StdObject()
  output.add('result', result)
  res.json(output)
}))

export default routes
