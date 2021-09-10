import _ from "lodash";
import { Router } from 'express'
import log from '../../libs/logger'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import Wrap from '../../utils/express-async'
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql'
import Util from "../../utils/Util"
import GroupService from "../../service/group/GroupService"

const routes = Router()

routes.get('/:channel_id', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {

}))

routes.get('/:channel_id/:category', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {

}))

routes.get('/:channel_id/video/:video_id', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {

}))

export default routes
