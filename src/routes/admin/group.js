import { Router } from 'express'
import log from '../../libs/logger'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import Wrap from '../../utils/express-async'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import UserService from '../../service/member/MemberService'
import GroupService from '../../service/group/GroupService'

const routes = Router()

routes.put('/createEnterprise', Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const member_seq = req.body.member_seq;
  const payment_info = req.body.payment_info;

  const member_info = await UserService.getMemberInfo(DBMySQL, member_seq);
  const result = await GroupService.createEnterpriseGroup(DBMySQL, member_info, payment_info)

  output.add('member_info', member_info)
  output.add('create_group_result', result)

  res.json(output)
}))

routes.get('/', Auth.isAuthenticated(Role.ADMIN), Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()
  const channel_list = await GroupService.getGroupInfoList(DBMySQL, req)
  output.adds(channel_list)
  res.json(output)
}))

export default routes
