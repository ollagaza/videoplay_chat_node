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
import Util from '../../utils/Util'
import GroupService from '../../service/group/GroupService'

const routes = Router()

routes.post('/', Wrap(async (req, res) => {
  req.accepts('application/json')
  const member_info = await AuthService.login(DBMySQL, req)
  const output = await Auth.getTokenResult(req, res, member_info, member_info.used_admin !== 'A' ? Role.MEMBER : Role.ADMIN)
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
  return res.json(await AuthService.authByToken(req, res))
}))

routes.get('/verify/sso', Wrap(async (req, res) => {
  if (!Util.trim(req.query.token)) {
    throw new StdObject(3001, '잘못된 요청입니다.', 403)
  }
  if (!Util.trim(req.query.id)) {
    throw new StdObject(3002, '잘못된 요청입니다.', 403)
  }
  const id = Util.trim(req.query.id)
  const verify_token_info = await Auth.verifyTokenByString(req.query.token)
  if (verify_token_info.error) {
    log.d(req, 3004, 'verify_token_info.error:', verify_token_info.error)
    throw new StdObject(3003, '잘못된 요청입니다.', 403)
  }
  const token_info = verify_token_info.get('token_info')
  if (token_info.role === Role.AGENT) {
    if (token_info.agent_id !== id) {
      log.d(req, 3004, 'token_info:', token_info, 'token_info.agent_id:', token_info.agent_id, 'id:', id)
      throw new StdObject(3011, '잘못된 요청입니다.', 403)
    }
  } else if (token_info.role === Role.BOX) {
    if (token_info.agent_id !== id) {
      log.d(req, 3004, 'token_info:', token_info, 'token_info.agent_id:', token_info.agent_id, 'id:', id)
      throw new StdObject(3011, '잘못된 요청입니다.', 403)
    }
  } else if (token_info.role === Role.API) {

  } else {
    log.d(req, 3004, 'token_info:', token_info)
    throw new StdObject(3021, '잘못된 요청입니다.', 403)
  }
  const member_seq = token_info.getId()
  const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)
  if (!member_info || member_info.isEmpty()) {
    throw new StdObject(3031, '회원정보가 존재하지 않습니다.', 403)
  }
  const member_status = MemberService.getMemberStateError(member_info)
  if (member_status.error) {
    throw member_status
  }
  const output = await Auth.getTokenResult(req, res, member_info, member_info.used_admin !== 'A' ? Role.MEMBER : Role.ADMIN)
  output.add('user_name', member_info.user_name)
  output.add('user_nickname', member_info.user_nickname)
  output.add('user_id', member_info.user_id)
  output.add('email_address', member_info.email_address)

  let user_data = await MemberService.getMemberMetadata(member_seq)
  if (user_data.toJSON) {
    user_data = user_data.toJSON()
  }
  output.add('user_data', user_data)
  let group_seq = Util.parseInt(req.query.group_seq, null)
  if (!group_seq) {
    group_seq = Util.parseInt(user_data.group_seq, null)
  }
  if (group_seq) {
    const group_member_info = await GroupService.getGroupMemberInfo(DBMySQL, group_seq, member_seq)
    output.add('group_info', group_member_info)
  }
  return res.json(output)
}))

export default routes
