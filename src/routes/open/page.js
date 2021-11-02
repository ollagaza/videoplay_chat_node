import { Router } from 'express'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import Wrap from '../../utils/express-async'
import OpenChannelManagerService from '../../service/open/OpenChannelManagerService'
import Util from '../../utils/Util'

const routes = Router()
const getStatusByDomain = async (request) => {
  const domain = request.params.domain
  const domain_status = await OpenChannelManagerService.getStatusByDomain(domain, request)
  domain_status.category_seq = Util.parseInt(request.params.category_seq, 0)
  domain_status.operation_seq = Util.parseInt(request.params.operation_seq, 0)

  return domain_status
}

routes.get('/:domain', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {
  const domain_status = await getStatusByDomain(req)
  res.json(await OpenChannelManagerService.getChannelSummary(domain_status))
}))

routes.get('/:domain/content', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {
  const domain_status = await getStatusByDomain(req)
  res.json(await OpenChannelManagerService.getOpenChannelContentInfo(domain_status.group_seq))
}))

routes.get('/:domain/:category_seq/video', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {
  const domain_status = await getStatusByDomain(req)
  res.json(await OpenChannelManagerService.getOpenChannelVideoList(domain_status.group_seq, domain_status.category_seq, req))
}))

routes.get('/:domain/video/:operation_seq(\\d+)', Auth.isAuthenticated(Role.ALL), Wrap(async (req, res) => {
  const domain_status = await getStatusByDomain(req)
  res.json(await OpenChannelManagerService.getOpenVideoInfo(domain_status.operation_seq, domain_status.is_join_channel))
}))

export default routes
