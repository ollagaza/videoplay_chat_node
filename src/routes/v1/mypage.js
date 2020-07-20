import { Router } from 'express';
import Wrap from '../../utils/express-async';
import Auth from '../../middlewares/auth.middleware';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import SocketManager from '../../service/socket-manager'
import Role from "../../constants/roles";
import Util from "../../utils/baseutil";
import GroupService from '../../service/member/GroupService';
import ProFileService from '../../service/mypage/ProFileService';
import ServiceConfig from "../../service/service-config";
import member_service from "../../service/member/MemberService";
import FollowService from "../../service/follow/FollowService";
import MemberLogService from '../../service/member/MemberLogService';

const routes = Router();

routes.post('/notice', Wrap(async(req, res) => {
  req.accepts('application/json');
  const user_seq = req.body.seq;
  const output = new StdObject();

  const lang = Auth.getLanguage(req);
  const result = await MemberLogService.getNoticePageMemberLog(DBMySQL, user_seq, lang);
  output.add("notices", result);
  res.json(output);
}));

routes.post('/managechannel', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const group_seq = token_info.getGroupSeq()
  const output = new StdObject()

  output.add('group_counts', await GroupService.getGroupCountsInfo(DBMySQL, group_seq))
  output.add('profile_info', await ProFileService.getProFileInfo(DBMySQL, group_seq))

  res.json(output);
}));

routes.post('/getuserchannel', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const user_group_seq = token_info.getGroupSeq()
  const mento_group_seq = req.body.group_seq;
  let output = new StdObject()

  if (mento_group_seq !== undefined) {
    output.add('group_counts', await GroupService.getGroupCountsInfo(DBMySQL, mento_group_seq))
    const profile_info = await ProFileService.getProFileInfo(DBMySQL, mento_group_seq)
    output.add('profile_info', profile_info)
    output.add('member_info', await GroupService.getGroupInfoToGroupCounts(DBMySQL, mento_group_seq));
    output.add('followbutton', (await FollowService.getFollowing(DBMySQL, user_group_seq, mento_group_seq))[0])
  } else {
    throw new StdObject(-1, '잘못된 접근입니다', 400);
  }

  res.json(output);
}));

routes.post('/updateprofile',
  Auth.isAuthenticated(Role.LOGIN_USER),
  Util.common_path_upload.fields([{ name: 'profile_image' }]), Wrap(async(req, res) => {
    const token_info = req.token_info
    const group_seq = token_info.getGroupSeq()
    const upload_type = req.body.upload_type;
    let input_data = req.body.input_data;
    const output = new StdObject()

    try {
      if (upload_type === 'image') {
        const group_info = await GroupService.getGroupInfo(DBMySQL, group_seq);
        const profile_dir = ServiceConfig.get('media_root') + group_info.media_path + '/profile';
        const directory_exits = await Util.createDirectory(profile_dir);
        if (directory_exits && req.files.profile_image !== undefined) {
          await Util.renameFile(req.files.profile_image[0].path, `${profile_dir}/${req.files.profile_image[0].filename}`)
        }

        if (req.files.profile_image !== undefined) {
          input_data = `${group_info.media_path}/profile/${req.files.profile_image[0].filename}`;
        } else {
          input_data = '';
        }
      }

      await DBMySQL.transaction(async (transaction) => {
        const result = await ProFileService.updateProFileInfo(transaction, group_seq, upload_type, input_data);
        output.add('result', result);
      });
      res.json(output);
    } catch (e) {
      throw new StdObject(-1, e, 400);
    }
  }));

routes.post('/changeGroupCMFlag', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json')
  const token_info = req.token_info
  const group_seq = token_info.getGroupSeq()
  const json_flag = req.body.data;
  const output = new StdObject()

  try {
    await DBMySQL.transaction(async (transaction) => {
      const result = await ProFileService.changeCMFlag(transaction, group_seq, json_flag);
      output.add('result', result);
      output.add('send_flag', json_flag);
    });
    res.json(output);
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }
}));

export default routes;
