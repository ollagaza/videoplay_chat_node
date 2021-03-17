import { Router } from 'express'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import StdObject from '../../../wrapper/std-object'
import GroupSurgboxService from '../../../service/surgbox/GroupSurgboxService'
import GroupService from '../../../service/group/GroupService'
import DBMySQL from '../../../database/knex-mysql'

const routes = Router()

const checkGroupAuth = async (req) => {
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  if (!group_auth.is_group_admin || !group_auth.is_group_admin) {
    throw new StdObject(100, '권한이 없습니다.', 403)
  }
  if (req.params) {
    if (req.params.machine_id) {
      group_auth.machine_id = req.params.machine_id
    }
    if (req.params.seq) {
      group_auth.seq = req.params.seq
    }
  }
  return group_auth
}

routes.get('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  const box_info_list = await GroupSurgboxService.getGroupSurgboxInfoList(group_auth.group_seq)
  const output = new StdObject()
  output.add('box_info_list', box_info_list)
  res.json(output)
}))

routes.get('/duplicate', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  const is_duplicate = await GroupSurgboxService.isDuplicateMachineId(group_auth.group_seq, req.query)
  const output = new StdObject()
  output.add('is_duplicate', is_duplicate)
  res.json(output)
}))

routes.post('/:machine_id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  const box_info = await GroupSurgboxService.createGroupSurgboxInfo(group_auth.group_seq, group_auth.member_seq, group_auth.machine_id)
  const output = new StdObject()
  output.add('box_info', box_info)
  res.json(output)
}))

routes.put('/:seq/:machine_id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  await GroupSurgboxService.modifyGroupSurgboxInfo(group_auth.seq, group_auth.machine_id)
  const output = new StdObject()
  res.json(output)
}))

routes.delete('/:seq', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  await GroupSurgboxService.deleteGroupSurgboxInfo(group_auth.seq)
  const output = new StdObject()
  res.json(output)
}))

export default routes
