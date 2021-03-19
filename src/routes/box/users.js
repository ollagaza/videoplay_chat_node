import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'
import DBMySQL from '../../database/knex-mysql'
import GroupService from '../../service/group/GroupService'
import GroupSurgboxService from '../../service/surgbox/GroupSurgboxService'
import ServiceConfig from '../../service/service-config'

const routes = Router()

routes.get('/', Auth.isAuthenticated(Role.BOX), Wrap(async (req, res) => {
  const token_info = req.token_info
  const machine_id = req.headers['machine-id']
  if (token_info.getMachineId() !== machine_id) {
    return res.json(new StdObject(-1, '잘못된 요청입니다.', 403))
  }
  let user_list = null
  if (ServiceConfig.isVacs() && ServiceConfig.isVacsUseMachineId() !== true) {
    user_list = await GroupService.getGroupListForBox(DBMySQL)
  } else {
    user_list = await GroupSurgboxService.getGroupBoxUserList(machine_id)
  }
  log.d(req, '[BOX 01] 의사목록 조회', req.headers)
  const output = new StdObject()
  output.add('user_list', user_list)
  return res.json(output)
}))

export default routes
