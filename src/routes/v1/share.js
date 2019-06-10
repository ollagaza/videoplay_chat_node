import {Router} from 'express';
import Wrap from '@/utils/express-async';
import Auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import MemberModel from '@/models/MemberModel';
import OperationModel from '@/models/OperationModel';
import OperationShareModel from '@/models/OperationShareModel';
import OperationShareUserModel from '@/models/OperationShareUserModel';
import log from "@/classes/Logger";

const routes = Router();

const getShareObject = async (share_info, token_info) => {
  const member_seq = token_info.getId();
  const share_seq = share_info.seq;

  let auth_type = 0;
  if (!token_info.isAdmin() && share_info.owner_member_seq != member_seq) {
    const member_info = await new MemberModel({ database }).getMemberInfo(member_seq);
    auth_type = await new OperationShareUserModel({ database }).getUserAuthType(share_seq, member_info.email_address);
  } else {
    auth_type = 3;
  }

  if (auth_type <= 0) {
    throw new StdObject(-1, '시청 권한이 없습니다.', 403);
  }

  const operation_info = await new OperationModel({ database }).getOperationInfo(share_info.operation_seq, token_info, false);

  share_info.auth_type = auth_type;
  share_info.media_info = operation_info.media_info;

  return new StdObject().add('share_info', share_info);
}

routes.get('/:share_seq(\\d+)', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const share_seq = req.params.share_seq;

  const share_info = await new OperationShareModel({ database }).getShareInfoBySeq(share_seq);
  if (share_info.isEmpty()) {
    throw new StdObject(-1, '등록된 공유 정보가 없습니다.', 400);
  }

  res.json(await getShareObject(share_info, token_info));
}));

routes.get('/link/:share_key', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const share_key = req.params.share_key;

  const share_info = await new OperationShareModel({ database }).getShareInfoByShareKey(share_key);
  if (share_info.isEmpty()) {
    throw new StdObject(-1, '등록된 공유 정보가 없습니다.', 400);
  }

  res.json(await getShareObject(share_info, token_info));
}));

routes.put('/:share_seq/view', Auth.isAuthenticated(roles.LOGIN_USER), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const share_seq = req.params.share_seq;
  const member_seq = token_info.getId();

  const member_info = await new MemberModel({ database }).getMemberInfo(member_seq);
  try {
    // 시청 횟수 증가. 에러나도 무시
    await new OperationShareUserModel({ database }).increaseViewCount(share_seq, member_info.email_address);
    await new OperationShareModel({ database }).increaseViewCount(share_seq);
  } catch (error) {
    log.e(req, error);
  }

  res.json(new StdObject());
}));

export default routes;
