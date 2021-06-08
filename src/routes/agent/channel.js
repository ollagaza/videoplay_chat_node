import {Router} from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from '../../constants/roles'
import StdObject from '../../wrapper/std-object'
import log from '../../libs/logger'
import DBMySQL from '../../database/knex-mysql'
import GroupService from '../../service/group/GroupService'
import {UserDataModel} from "../../database/mongodb/UserData";
import OperationFolderService from "../../service/operation/OperationFolderService";
import OperationService from "../../service/operation/OperationService";

const routes = Router()

routes.get('/', Auth.isAuthenticated(Role.AGENT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const agent_id = req.headers['agent-id']
  const output = new StdObject()

  if (token_info.getAgentId() !== agent_id) {
    return res.json(new StdObject(-1, '잘못된 요청입니다.', 403))
  }
  let { group_seq, member_seq } = GroupService.getBaseInfo(req)

  if (!group_seq) {
    group_seq = (await UserDataModel.findByMemberSeq(member_seq)).get('group_seq')
  }

  output.add('channel_list', await GroupService.getMemberGroupList(DBMySQL, member_seq, true))

  return res.json(output)
}))

routes.get('/:group_seq(\\d+)/folder', Auth.isAuthenticated(Role.AGENT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const agent_id = req.headers['agent-id']
  const output = new StdObject()

  if (token_info.getAgentId() !== agent_id) {
    return res.json(new StdObject(-1, '잘못된 요청입니다.', 403))
  }
  const { member_seq } = GroupService.getBaseInfo(req, false)
  const group_seq = req.params.group_seq

  if (group_seq) {
    output.add('folder_list', await OperationFolderService.getFolderListWithAgent(DBMySQL, group_seq, member_seq))
  } else {
    return res.json(new StdObject(-1, '채널정보가 없습니다.', 403))
  }

  return res.json(output)
}))

routes.post('/:group_seq(\\d+)/folder', Auth.isAuthenticated(Role.AGENT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const agent_id = req.headers['agent-id']
  const output = new StdObject()

  if (token_info.getAgentId() !== agent_id) {
    return res.json(new StdObject(-1, '잘못된 요청입니다.', 403))
  }
  const { member_seq } = GroupService.getBaseInfo(req, false)
  const group_seq = req.params.group_seq

  const parent_folder_seq = req.body.parent_folder_seq
  const folder_name = req.body.folder_name.trim()

  if (!parent_folder_seq) {
    return res.json(new StdObject(-1, '상위 폴더 정보가 없습니다.', 403))
  }

  if (!folder_name.trim()) {
    return res.json(new StdObject(-1, '생성할 폴더명이 입력되지 않았습니다.', 403))
  }

  const parent_folder_info = await OperationFolderService.getFolderInfo(DBMySQL, group_seq, parent_folder_seq)

  const request_body = {
    parent_folder_info,
    is_valid_folder_name: true,
    folder_info: {
      folder_name
    }
  }

  await OperationFolderService.createOperationFolder(DBMySQL, request_body, group_seq, member_seq)
  output.add('folder_list', await OperationFolderService.getFolderListWithAgent(DBMySQL, group_seq, member_seq))
  return res.json(output)
}))

routes.get('/:group_seq(\\d+)/operation', Auth.isAuthenticated(Role.AGENT), Wrap(async (req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const agent_id = req.headers['agent-id']
  const output = new StdObject()

  if (token_info.getAgentId() !== agent_id) {
    return res.json(new StdObject(-1, '잘못된 요청입니다.', 403))
  }
  const { group_seq, group_grade_number, group_member_info, is_group_admin, member_seq } = await GroupService.checkGroupAuth(DBMySQL, req, false, true, true)

  if (group_seq) {
    req.query.no_paging = 'y'
    output.add('operation_list', await OperationService.getOperationListByRequest(DBMySQL, group_seq, member_seq, group_member_info, group_grade_number, is_group_admin, req))
  } else {
    return res.json(new StdObject(-1, '채널정보가 없습니다.', 403))
  }

  return res.json(output)
}))

export default routes
