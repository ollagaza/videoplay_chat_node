import _ from "lodash";
import { Router } from 'express'
import log from '../../../libs/logger'
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import StdObject from '../../../wrapper/std-object'
import DBMySQL from '../../../database/knex-mysql'
import Util from "../../../utils/Util"
import GroupService from "../../../service/group/GroupService"

const routes = Router()

routes.get('/open/page', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {

}))

routes.put('/open/page', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {

}))

routes.post('/open/page/banner', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {

}))

routes.post('/open/page/banner/upload', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {

}))

routes.delete('/open/page/banner/:banner_id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {

}))

routes.post('/open/page/category', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {

}))

routes.delete('/open/page/category', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {

}))

routes.put('/open/page/category/name', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {

}))

routes.post('/open/page/category/:category/video', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {

}))

routes.put('/open/page/category/:category/video/:video_id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {

}))

routes.delete('/open/page/category/:category/video/:video_id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {

}))


export default routes
