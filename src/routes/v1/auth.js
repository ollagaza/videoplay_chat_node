import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import DBMySQL from '../../database/knex-mysql'
import AuthService from '../../service/member/AuthService'
import MemberService from '../../service/member/MemberService'
import MemberLogService from '../../service/member/MemberLogService'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'

const routes = Router()

routes.post('/', Wrap(async (req, res) => {
  req.accepts('application/json')
  const member_info = await AuthService.login(DBMySQL, req)
  const output = await Auth.getTokenResult(res, member_info, member_info.used_admin !== 'A' ? Role.MEMBER : Role.ADMIN)
  let ip = ''
  if (req.headers['x-forwarded-for']) {
    if (req.headers['x-forwarded-for'].indexOf(',') !== -1) {
      ip = req.headers['x-forwarded-for'].split(',')[0]
    } else {
      ip = req.headers['x-forwarded-for']
    }
  } else {
    ip = req.connection.remoteAddress
  }
  await MemberLogService.createMemberLog(DBMySQL, null, member_info.seq, null, '0000', 'login', ip)
  output.add('notify', await MemberLogService.getNoticeListMemberLog(DBMySQL, member_info.seq))
  return res.json(output)
}))

routes.post('/token/refresh', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const token_info = req.token_info
  const member_seq = token_info.getId()

  const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)

  const output = await Auth.getTokenResult(res, member_info, member_info.used_admin !== 'A' ? Role.MEMBER : Role.ADMIN)
  return res.json(output)
}))

export default routes
