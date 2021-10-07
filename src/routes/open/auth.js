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
  const token_info = await Auth.getTokenResult(req, res, member_info, Role.MEMBER)
  if (token_info.error === 0) {
    token_info.add('member_info', member_info)
  }
  res.json(token_info)
}))

routes.get('/cookie', Wrap(async (req, res) => {
  res.json(await AuthService.authByCookie(req, res))
}))

routes.get('/refresh', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  res.json(await AuthService.authByCookie(req, res))
}))

export default routes
