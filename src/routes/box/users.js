import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from "../../constants/roles"
import StdObject from '../../wrapper/std-object'
import log from "../../libs/logger"
import DBMySQL from '../../database/knex-mysql';
import GroupService from '../../service/member/GroupService'

const routes = Router();

routes.get('/', Auth.isAuthenticated(Role.BOX), Wrap(async(req, res) => {
  const token_info = req.token_info
  const machine_id = req.headers['machine-id'];
  log.d(req, token_info)
  if (token_info.getMachineId() !== machine_id) {
    return res.json(new StdObject(-1, "잘못된 요청입니다.", 403))
  }
  let user_list = null
  if (token_info.getGroupSeq() === 0) {
    user_list = await GroupService.getAllPersonalGroupUserListForBox(DBMySQL)
  }
  const output = new StdObject();
  output.add('user_list', user_list);

  return res.json(output);
}));

export default routes;
