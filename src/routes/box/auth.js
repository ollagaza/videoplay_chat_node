import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import StdObject from '../../wrapper/std-object'
import Role from '../../constants/roles'

const routes = Router()

routes.post('/', Wrap(async (req, res) => {
  req.accepts('application/json')

  const machine_id = req.headers['machine-id']
  if (!machine_id) {
    const output = new StdObject(-1, '잘못된 요청입니다.', 400)
    return res.json(output)
  }

  // const member_model = new MemberModel({ database });
  // const member_info = await member_model.findOne({"user_id": user_id});
  //
  // if (member_info == null || member_info.user_id !== user_id) {
  //   throw new StdObject(-1, "등록된 회원 정보가 없습니다.", 400);
  // }
  const machine_info = {}
  machine_info.seq = 1
  machine_info.machine_id = machine_id

  const output = await Auth.getTokenByRole(req, machine_info, Role.AGENT)
  return res.json(output)
}))

export default routes
