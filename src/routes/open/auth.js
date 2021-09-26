import _ from "lodash";
import { Router } from 'express'
import log from '../../libs/logger'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import Wrap from '../../utils/express-async'
import AuthService from '../../service/member/AuthService'
import DBMySQL from '../../database/knex-mysql'
import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'
import MemberService from '../../service/member/MemberService'
import logger from '../../libs/logger'

const routes = Router()

routes.post('/', Wrap(async (req, res) => {
  req.accepts('application/json')
  const member_info = await AuthService.login(DBMySQL, req)
  res.json(await Auth.getTokenResult(res, member_info, Role.MEMBER))
}))

routes.get('/refresh/:refresh_token', Wrap(async (req, res) => {
  const refresh_token = Util.trim(req.params.refresh_token)
  if (!refresh_token) {
    throw new StdObject(9001, '잘못된 접근입니다.', 403)
  }
  const refresh_data = Util.decrypt(refresh_token)
  if (!refresh_token) {
    throw new StdObject(9002, '잘못된 접근입니다.', 403)
  }
  let refresh_info = null
  try {
    refresh_info = JSON.parse(refresh_data)
  } catch (e) {
    logger.e(req, refresh_data, e)
    throw new StdObject(9003, '잘못된 접근입니다.', 403)
  }
  if (!refresh_info) {
    throw new StdObject(9002, '잘못된 접근입니다.', 403)
  }
  const member_seq = refresh_info.id
  const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)
  const output = await Auth.getTokenResult(res, member_info, Role.MEMBER)
  return res.json(output)
}))

export default routes
