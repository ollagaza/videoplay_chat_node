import { Router } from 'express';
import Wrap from '../../utils/express-async';
import Auth from '../../middlewares/auth.middleware';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import MemberLogModel from '../../database/mysql/member/MemberLogModel';
import SocketManager from '../../service/socket-manager'
import Role from "../../constants/roles";
import Util from "../../utils/baseutil";
import GroupService from '../../service/member/GroupService';
import ProFileService from '../../service/mypage/ProFileService';
import ServiceConfig from "../../service/service-config";
import member_service from "../../service/member/MemberService";
import FollowService from "../../service/follow/FollowService";

const routes = Router();

routes.post('/notice', Wrap(async(req, res) => {
  req.accepts('application/json');
  const user_seq = req.body.seq;
  const output = new StdObject();

  await DBMySQL.transaction(async(transaction) => {
    const oMemberLogModel = new MemberLogModel(transaction);
    const lang = Auth.getLanguage(req);
    const result = await oMemberLogModel.getMemberLog(lang, user_seq);
    output.add("notices", result);
  });

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
    output.add('member_info', await member_service.getMemberInfo(DBMySQL, profile_info.member_seq))
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
    const user_seq = token_info.getId();
    const group_seq = token_info.getGroupSeq()
    const profile = JSON.parse(req.body.profile);
    const output = new StdObject()

    try {
      const member_info = await member_service.getMemberInfo(DBMySQL, user_seq);
      const profile_dir = ServiceConfig.get('media_root') + '/' + member_info.user_id + '/profile';
      const directory_exits = await Util.createDirectory(profile_dir);
      const move_file = await Util.renameFile(req.files.profile_image[0].path, `${profile_dir}/${req.files.profile_image[0].filename}`)

      await DBMySQL.transaction(async (transaction) => {
        profile.image = `/${member_info.user_id}/profile/${req.files.profile_image[0].filename}`;
        const result = await ProFileService.updateProFileInfo(transaction, group_seq, JSON.stringify(profile));
        output.add('result', result);
        output.add('profile', profile);
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
