import { Router } from 'express'
import Wrap from '../../utils/express-async'
import Auth from '../../middlewares/auth.middleware'
import Role from "../../constants/roles"
import StdObject from '../../wrapper/std-object'
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger"
import Util from '../../utils/baseutil'
import ServiceConfig from '../../service/service-config'
import OperationService from '../../service/operation/OperationService'
import GroupService from '../../service/member/GroupService'
import MemberService from '../../service/member/MemberService'
import OperationModel from '../../database/mysql/operation/OperationModel'

const routes = Router();

const checkMachine = async (request) => {
  const token_info = request.token_info
  const machine_id = request.headers['machine-id'];
  log.d(request, token_info)
  if (token_info.getMachineId() !== machine_id) {
    throw new StdObject(-1, "잘못된 요청입니다.", 403)
  }
}

const getUserTokenInfo = async (request) => {
  const user_token = await Auth.verifyTokenByString(request.headers['user-token'])
  if (user_token.error !== 0) {
    throw user_token
  }
  return user_token.get('token_info')
}

routes.post('/start', Auth.isAuthenticated(Role.BOX), Wrap(async(req, res) => {
  req.accepts('application/json')
  await checkMachine(req)
  const user_token_info = await getUserTokenInfo(req)
  log.d(req, '[user_token_info]', user_token_info)
  const member_seq = user_token_info.getId()
  const member_info = await MemberService.getMemberInfo(DBMySQL, member_seq)
  const group_seq = user_token_info.setGroupSeq()
  const group_member_info = await GroupService.getGroupMemberInfo(DBMySQL, group_seq, member_seq)
  if (group_member_info.isEmpty()) {
    throw new StdObject(-2, "등록된 회원이 아닙니다.", 403)
  }

  const current_date = Util.currentFormattedDate('yyyy-mm-dd HH:MM:ss');
  const operation_name = req.body && req.body.operation_name ? req.body.operation_name : `SurgBox_${current_date}`;
  const operation_date = current_date.substr(0, 10);
  const hour = current_date.substr(11, 2);
  const minute = current_date.substr(14, 2);
  const operation_data = {
    "operation_code": operation_name,
    "operation_name":  operation_name,
    "operation_date": operation_date,
    "hour": hour,
    "minute": minute,
  };

  // (database, group_member_info, member_seq, operation_data, operation_metadata)

  const create_operation_result = await OperationService.createOperation(DBMySQL, member_info, group_member_info, operation_data, {}, 'D');
  const output = new StdObject();
  output.add('operation_id', create_operation_result.get('operation_seq'));
  output.add('operation_name', operation_name);
  res.json(output);
}));

routes.post('/:operation_seq(\\d+)/upload', Auth.isAuthenticated(Role.BOX), Wrap(async(req, res) => {
  await checkMachine(req)

  const operation_seq = req.params.operation_seq;
  const file_type = 'video';
  const operation_info = await OperationService.getOperationInfo(DBMySQL, operation_seq, null, false, false)
  log.d(req, 'operation_info', operation_info)
  const upload_result = await OperationService.uploadOperationFileAndUpdate(DBMySQL, req, res, operation_info, file_type, 'file');

  const output = new StdObject();
  output.add('upload_seq', upload_result.upload_seq);
  output.add('url', upload_result.file_url);
  output.add('file_path', upload_result.file_path);
  res.json(output);
}));

routes.put('/:operation_seq(\\d+)/end', Auth.isAuthenticated(Role.BOX), Wrap(async(req, res) => {
  await checkMachine(req)
  const operation_seq = req.params.operation_seq;
  await OperationService.requestAnalysis(DBMySQL, null, operation_seq, false)
  await new OperationModel(DBMySQL).updateStatusTrash([ operation_seq ], null, true);

  const output = new StdObject()
  output.add('url', ServiceConfig.get('service_url') + `/v2/curation/${operation_seq}`);
  res.json(output);
}));

export default routes;
