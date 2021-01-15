import _ from "lodash";
import { Router } from 'express'
import Auth from '../../../middlewares/auth.middleware'
import Util from '../../../utils/baseutil'
import log from '../../../libs/logger'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import StdObject from '../../../wrapper/std-object'
import DBMySQL from '../../../database/knex-mysql'
import baseutil from "../../../utils/baseutil";
import GroupService from "../../../service/group/GroupService";

const routes = Router()

routes.get('/', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const { group_seq, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, false)
  const output = new StdObject()

  res.json(output)
}))

export default routes
