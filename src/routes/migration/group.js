import { Router } from 'express';
import Wrap from '../../utils/express-async';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import log from '../../libs/logger'
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import MemberService from '../../service/member/MemberService'
import GroupService from '../../service/member/GroupService'
import OperationService from '../../service/operation/OperationService'
import OperationClipService from '../../service/operation/OperationClipService'
import VideoProjectService from '../../service/video/VideoProjectService'

const routes = Router();

const create_new_group = async (req, transaction, member_info) => {
  const member_seq = member_info.seq
  const user_id = member_info.user_id
  const group_info = await GroupService.createPersonalGroup(transaction, member_info)
  log.d(req, '[create_new_group]', `[${user_id}]`, group_info.toJSON())
  const group_seq = group_info.seq
  await OperationService.migrationGroupSeq(transaction, member_seq, group_seq)
  await OperationClipService.migrationGroupSeq(member_seq, group_seq)
  await VideoProjectService.migrationGroupSeq(member_seq, group_seq)
  await GroupService.updateMemberUsedStorage(transaction, group_seq, member_seq)

  group_info.setIgnoreEmpty(true)
  return group_info
}

routes.post('/', Wrap(async(req, res) => {
  req.accepts('application/json');
  const new_group_info_list = []
  const recent_group_info_list = []
  await OperationService.migrationStorageSize(DBMySQL)
  const member_list = await MemberService.getMemberList(DBMySQL)
  for (let i = 0; i < member_list.length; i++) {
    await DBMySQL.transaction(async(transaction) => {
      const member_info = member_list[i]
      const member_seq = member_info.seq
      const user_id = member_info.user_id
      member_info.setIgnoreEmpty(true)
      log.d(req, '[member_info]', `[${user_id}]`, i, member_info.toJSON())

      await OperationService.migrationOriginVideoSize(transaction, member_seq)
      const group_list = await GroupService.getMemberGroupList(transaction, member_info.seq)
      if (!group_list || group_list.length <= 0) {
        const group_info = await create_new_group(req, transaction, member_info)
        new_group_info_list.push(group_info.toJSON())
      } else {
        let has_personal_group = false
        for (let j = 0; j < group_list.length; j++) {
          const group_info = group_list[j]
          log.d(req, '[group_info]', `[${user_id}]`, j, group_info.toJSON())
          const group_seq = group_info.group_seq
          if (group_info.group_type === 'P') {
            has_personal_group = true
            await VideoProjectService.migrationGroupSeq(member_seq, group_seq)
          }
          const operation_list_page = await OperationService.getOperationList(DBMySQL, group_seq)
          const operation_list = operation_list_page.data
          log.d(req, '[operation_list]', `[${user_id}]`, j, operation_list.length)
          for (let k = 0; k < operation_list.length; k++) {
            const operation_info = operation_list[k]
            const operation_seq = operation_info.seq
            operation_info.setIgnoreEmpty(true)
            log.d(req, '[operation_info]', `[${user_id}]`, k, operation_info.toJSON())
            await OperationClipService.migrationGroupSeqByOperation(operation_seq, group_seq)
          }
          await GroupService.updateMemberUsedStorage(transaction, group_seq, member_seq)
          recent_group_info_list.push(group_info)
        }
        if (!has_personal_group) {
          const group_info = await create_new_group(req, transaction, member_info)
          new_group_info_list.push(group_info.toJSON())
        }
      }
    })
  }
  await OperationService.migrationTotalFileSize(DBMySQL)
  const output = new StdObject()
  output.add('new_group_info_list', new_group_info_list)
  output.add('recent_group_info_list', recent_group_info_list)
  res.json(output)
}));

export default routes;
