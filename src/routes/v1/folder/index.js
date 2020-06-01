import { Router } from 'express';
import Auth from '../../../middlewares/auth.middleware'
import Role from '../../../constants/roles'
import Wrap from '../../../utils/express-async'
import GroupService from '../../../service/member/GroupService'
import DBMySQL from '../../../database/knex-mysql'
import OperationFolderService from '../../../service/operation/OperationFolderService'
import StdObject from '../../../wrapper/std-object'
import log from '../../../libs/logger'
import Util from '../../../utils/baseutil'

const routes = Router();

routes.post('/', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const folder_info = await OperationFolderService.createOperationFolder(DBMySQL, req.body, group_seq)
  const output = new StdObject()
  output.add('folder_info', folder_info)
  res.json(output)
}))

routes.get('/relation(/:folder_seq(\\d+))?', Auth.isAuthenticated(Role.DEFAULT), Wrap(async (req, res) => {
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const folder_seq = Util.parseInt(req.params.folder_seq, null)
  let folder_info = null
  let parent_list = null
  if (folder_seq) {
    folder_info = await OperationFolderService.getFolderInfo(DBMySQL, group_seq, folder_seq)
    parent_list = await OperationFolderService.getParentFolderList(DBMySQL, group_seq, folder_info.parent_folder_list)
  }
  const child_folder_list = await OperationFolderService.getChildFolderList(DBMySQL, group_seq, folder_seq)
  const output = new StdObject()
  output.add('folder_info', folder_info)
  output.add('parent_list', parent_list)
  output.add('child_folder_list', child_folder_list)
  res.json(output)
}))

export default routes
