import _ from "lodash";
import { Router } from 'express'
import log from '../../../../../libs/logger'
import Auth from '../../../../../middlewares/auth.middleware'
import Role from '../../../../../constants/roles'
import Wrap from '../../../../../utils/express-async'
import StdObject from '../../../../../wrapper/std-object'
import DBMySQL from '../../../../../database/knex-mysql'
import Util from "../../../../../utils/Util"
import GroupService from "../../../../../service/group/GroupService"
import OpenChannelManagerService from '../../../../../service/group/OpenChannelManagerService'

const routes = Router()

const checkGroupAuth = async (req) => {
  const group_auth = await GroupService.checkGroupAuth(DBMySQL, req, true, true, false)
  if (!group_auth.is_group_admin) {
    throw new StdObject(3001, '채널 관리자만 접근 가능합니다.', 403)
  }
  return group_auth
}

/*
    const group_auth_result = {
      token_info: null,
      member_seq: null,
      group_seq: null,
      member_info: null,
      group_member_info: null,
      is_active_group_member: null,
      is_group_admin: null,
      is_group_manager: null,
      group_grade: null,
      group_grade_number: null
    }
 */

routes.get('/', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  res.json(await OpenChannelManagerService.getOpenChannelInfo(group_auth.group_seq))
}))

routes.get('/domain/verify/:domain', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  res.json(await OpenChannelManagerService.verifyChannelDomain(req.params.domain, group_auth.group_seq))
}))

routes.post('/banner', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  res.json(await OpenChannelManagerService.addBanner(group_auth.group_seq, req, res))
}))
routes.put('/banner/order', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  res.json(await OpenChannelManagerService.modifyBannerOrder(group_auth.group_seq, req))
}))
routes.put('/banner/:banner_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  res.json(await OpenChannelManagerService.modifyBannerInfo(group_auth.group_seq, req.params.banner_seq, req))
}))
routes.delete('/banner/:banner_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  res.json(await OpenChannelManagerService.deleteBanner(group_auth.group_seq, req.params.banner_seq))
}))

routes.get('/category/name/verify', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  res.json(await OpenChannelManagerService.verifyCategoryName(group_auth.group_seq, req.query.category_name))
}))
routes.post('/category', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  res.json(await OpenChannelManagerService.createCategory(group_auth.group_seq, req))
}))
routes.put('/category/:category_id/name', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)

}))
routes.delete('/category/:category_id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)

}))

routes.get('/category/:category/video', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  res.json(await OpenChannelManagerService.getOpenChannelVideoList(group_auth.group_seq, req.params.category, req))
}))
routes.post('/category/:category/video', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)

}))
routes.put('/video/:operation_data_seq/limit', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  res.json(await OpenChannelManagerService.setVideoPlayLimit(group_auth.group_seq, req.params.operation_data_seq, req))
}))
routes.delete('/video/:category_id', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  const group_auth = await checkGroupAuth(req)
  res.json(await OpenChannelManagerService.deleteVideo(group_auth.group_seq, req.params.category_id, req))
}))


export default routes
