import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import StdObject from '../../wrapper/std-object'
import Util from '../../utils/Util'
import AuthService from '../../service/member/AuthService'
import {UserDataModel} from "../../database/mongodb/UserData";
import Role from '../../constants/roles'

const routes = Router()

routes.post('/', Wrap(async (req, res) => {
  req.accepts('application/json')

  const request_body = req.body
  const agent_id = req.headers['agent-id']
  if (!agent_id || Util.isEmpty(request_body)) {
    const output = new StdObject(2001, '잘못된 요청입니다.', 400)
    return res.json(output)
  }
  const member_info = await AuthService.login(null, req)
  member_info.agent_id = agent_id

  const output = await Auth.getTokenByRole(req, member_info, Role.AGENT)
  const group_seq = (await UserDataModel.findByMemberSeq(member_info.seq)).get('group_seq')
  output.add('group_seq', group_seq)
  return res.json(output)
}))

export default routes
