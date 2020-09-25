import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'
import DBMySQL from '../../database/knex-mysql'
import GroupService from '../../service/member/GroupService'
import MemberService from '../../service/member/MemberService'

const routes = Router()

routes.get('/', Auth.isAuthenticated(Role.BOX), Wrap(async (req, res) => {
  const token_info = req.token_info
  const machine_id = req.headers['machine-id']
  log.d(req, token_info.toJSON(), machine_id, token_info.getMachineId(), token_info.getMachineId() !== machine_id)
  if (token_info.getMachineId() !== machine_id) {
    log.d(req, '00')
    return res.json(new StdObject(-1, '잘못된 요청입니다.', 403))
  }
  log.d(req, 'aa')
  let user_list = null
  if (token_info.getGroupSeq() === 0) {
    user_list = await GroupService.getAllPersonalGroupUserListForBox(DBMySQL)
  }
  const output = new StdObject()
  output.add('user_list', user_list)
  log.d(req, 'nn')
  return res.json(output)
}))

routes.post('/:user_id', Wrap(async (req, res) => {
  req.accepts('application/json')

  const token_info = req.token_info
  const machine_id = req.headers['machine-id']
  log.d(req, token_info)
  if (token_info.getMachineId() !== machine_id) {
    return res.json(new StdObject(-1, '잘못된 요청입니다.', 403))
  }
  const user_id = res.params.user_id
  let group_user_info = await GroupService.getPersonalGroupUserForBox(DBMySQL, user_id)

  if (!group_user_info) {
    const user_info = await MemberService.createMember(DBMySQL, req.body, true)
    log.debug(req, 'auto created user info', user_id, user_info.toJSON())
    group_user_info = await GroupService.getPersonalGroupUserForBox(DBMySQL, user_id)
  }

  const output = new StdObject()
  output.add('group_user_info', group_user_info)
  return res.json(output)
}))

export default routes
