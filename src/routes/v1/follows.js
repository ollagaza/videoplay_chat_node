import { Router } from 'express';
import Wrap from '../../utils/express-async';
import Auth from '../../middlewares/auth.middleware';
import Role from "../../constants/roles";
import StdObject from '../../wrapper/std-object';
import Util from "../../utils/baseutil";
import DBMySQL from "../../database/knex-mysql";
import ServiceConfig from "../../service/service-config";
import FollowService from "../../service/follow/FollowService";
import GroupService from "../../service/member/GroupService";
import MemberLogService from "../../service/member/MemberLogService";

const routes = Router();

routes.post('/followlists', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  try {
    const token_info = req.token_info;
    const login_group_seq = token_info.getGroupSeq();
    const inquiry_group_seq = req.body.group_seq
    const result = new StdObject();

    if (inquiry_group_seq === login_group_seq) {
      result.add('follower', await FollowService.getFollowerLists(DBMySQL, inquiry_group_seq));
      result.add('following', await FollowService.getFollowingLists(DBMySQL, inquiry_group_seq));
    } else {
      result.add('follower', await FollowService.getInquiryFollowerLists(DBMySQL, login_group_seq, inquiry_group_seq));
      result.add('following', await FollowService.getInquiryFollowingLists(DBMySQL, login_group_seq, inquiry_group_seq));
    }

    result.add('group_count_info', await GroupService.getGroupCountsInfo(DBMySQL, inquiry_group_seq));
    res.json(result);
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }
}));

routes.post('/registfollow', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  try {
    const token_info = req.token_info;
    const group_seq = token_info.getGroupSeq();
    const follower_seq = req.body.follower_seq;
    const group_info = await GroupService.getGroupInfo(DBMySQL, group_seq);
    const follower_info = await GroupService.getGroupInfo(DBMySQL, follower_seq);

    await DBMySQL.transaction(async (transaction) => {
      const following = {
        group_seq: group_seq,
        following_seq: follower_seq,
      };
      const following_result = await FollowService.RegistFollowing(transaction, following)

      const follower = {
        group_seq: follower_seq,
        follower_seq: group_seq,
      };
      const follower_result = await FollowService.RegistFollower(transaction, follower)

      const group_info_following_result = await GroupService.UpdateGroupInfoAddCnt(transaction, group_seq, 'following');
      const group_info_follower_result = await GroupService.UpdateGroupInfoAddCnt(transaction, follower_seq, 'follower');

      const log_text = `${group_info.group_name}님 께서 ${follower_info.group_name}님을 팔로우 하셨습니다.`;
      await MemberLogService.createMemberLog(DBMySQL, group_seq, null, '0000', log_text, null, 1, 0);
    });

    const result = new StdObject();
    res.json(result);
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }
}));

routes.post('/unregistfollow', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req, res) => {
  try {
    const token_info = req.token_info;
    const group_seq = token_info.getGroupSeq();
    const follower_seq = req.body.follower_seq;

    await DBMySQL.transaction(async (transaction) => {
      const following_info = {
        group_seq: group_seq,
        following_seq: follower_seq,
      };
      const following_result = await FollowService.UnRegistFollowing(transaction, following_info)

      const follower_info = {
        group_seq: follower_seq,
        follower_seq: group_seq,
      };
      const follower_result = await FollowService.UnRegistFollower(transaction, follower_info)

      const group_info_following_result = await GroupService.UpdateGroupInfoMinusCnt(transaction, group_seq, 'following');
      const group_info_follower_result = await GroupService.UpdateGroupInfoMinusCnt(transaction, follower_seq, 'follower');
    });

    const result = new StdObject();
    res.json(result);
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }
}));

export default routes;
