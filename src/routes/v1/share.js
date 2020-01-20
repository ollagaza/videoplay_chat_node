import { Router } from 'express';
import Wrap from '../../utils/express-async';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import MemberModel from '../../database/mysql/member/MemberModel';
import OperationModel from '../../database/mysql/operation/OperationModel';
import OperationShareModel from '../../database/mysql/operation/OperationShareModel';
import OperationShareUserModel from '../../database/mysql/operation/OperationShareUserModel';

const routes = Router();

const getShareObject = async (share_info, token_info) => {
  const member_seq = token_info.getId();
  const share_seq = share_info.seq;

  let auth_type = 0;
  if (!token_info.isAdmin() && share_info.owner_member_seq != member_seq) {
    const member_info = await new MemberModel(DBMySQL).getMemberInfo(member_seq);
    auth_type = await new OperationShareUserModel(DBMySQL).getUserAuthType(share_seq, member_info.email_address);
  } else {
    auth_type = 3;
  }

  if (auth_type <= 0) {
    throw new StdObject(-1, '시청 권한이 없습니다.', 403);
  }

  const operation_info = await new OperationModel(DBMySQL).getOperationInfo(share_info.operation_seq, token_info, false);

  share_info.auth_type = auth_type;
  share_info.media_info = operation_info.media_info;

  return new StdObject().add('share_info', share_info);
}

routes.get('/:share_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const share_seq = req.params.share_seq;

  const share_info = await new OperationShareModel(DBMySQL).getShareInfoBySeq(share_seq);
  if (share_info.isEmpty()) {
    throw new StdObject(-1, '등록된 공유 정보가 없습니다.', 400);
  }

  res.json(await getShareObject(share_info, token_info));
}));

routes.get('/link/:share_key', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const share_key = req.params.share_key;

  const share_info = await new OperationShareModel(DBMySQL).getShareInfoByShareKey(share_key);
  if (share_info.isEmpty()) {
    throw new StdObject(-1, '등록된 공유 정보가 없습니다.', 400);
  }

  res.json(await getShareObject(share_info, token_info));
}));

routes.put('/:share_seq/view', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const share_seq = req.params.share_seq;
  const member_seq = token_info.getId();

  const member_info = await new MemberModel(DBMySQL).getMemberInfo(member_seq);
  try {
    // 시청 횟수 증가. 에러나도 무시
    await new OperationShareUserModel(DBMySQL).increaseViewCount(share_seq, member_info.email_address);
    await new OperationShareModel(DBMySQL).increaseViewCount(share_seq);
  } catch (error) {
    log.e(req, error);
  }

  res.json(new StdObject());
}));

export default routes;
