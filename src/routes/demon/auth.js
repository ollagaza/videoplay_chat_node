import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import MemberModel from '../../database/mysql/member/MemberModel'

const routes = Router()

routes.post('/', Wrap(async (req, res) => {
  req.accepts('application/json')

  if (!req.body || !req.body.user_id) {
    const output = new StdObject(-1, '잘못된 요청입니다.', 400)
    return res.json(output)
  }

  const user_id = req.body.user_id
  const member_model = new MemberModel(DBMySQL)
  const member_info = await member_model.findOne({ 'user_id': user_id })

  if (member_info == null || member_info.user_id !== user_id) {
    throw new StdObject(-1, '등록된 회원 정보가 없습니다.', 400)
  }

  const output = await Auth.getTokenResult(res, member_info, Role.API)

  return res.json(output)
}))

export default routes
