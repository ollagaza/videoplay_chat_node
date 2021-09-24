import _ from "lodash";
import { Router } from 'express'
import log from '../../libs/logger'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import Wrap from '../../utils/express-async'
import OpenChannelManagerService from '../../service/group/OpenChannelManagerService'

const routes = Router()
const getStatusByDomain = async (request) => {
  const domain = request.params.domain
  return await OpenChannelManagerService.getStatusByDomain(domain, request)
}

routes.get('/:domain', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {
  const domain_status = await getStatusByDomain(req)
  res.json(await OpenChannelManagerService.getChannelSummary(domain_status))
}))

routes.get('/:domain/info', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {
  const domain_status = await getStatusByDomain(req)
  res.json(await OpenChannelManagerService.getOpenChannelInfo(domain_status.group_seq))
}))


routes.get('/:domain/video', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {

}))

routes.get('/:domain/:category_seq(\\d+)', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {

}))

routes.get('/:domain/video/:video_id', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {

}))

export default routes
