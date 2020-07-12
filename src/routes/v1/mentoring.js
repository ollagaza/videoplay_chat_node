import { Router } from 'express';
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import Auth from "../../middlewares/auth.middleware";
import Role from "../../constants/roles";
import _ from 'lodash';
import MongoDataService from '../../service/common/MongoDataService'
import HashtagService from '../../service/operation/HashtagService';
import MentoringService from "../../service/mentoring/MentoringService";
import FollowService from "../../service/follow/FollowService";
import OperationService from '../../service/operation/OperationService'
import OperationDataService from '../../service/operation/OperationDataService'
import Util from "../../utils/baseutil";
import ServiceConfig from "../../service/service-config";
import GroupService from "../../service/member/GroupService";
import baseutil from "../../utils/baseutil";
import OperationClipService from '../../service/operation/OperationClipService'


const routes = Router();

routes.post('/getbasicmentopage', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async (req,res) => {
  try {
    const token_info = req.token_info;
    const group_seq = token_info.getGroupSeq()
    const output = new StdObject()
    output.add('medical', await MentoringService.getOpenMentoCategorys(DBMySQL))
    output.add('followinglist', await FollowService.getFollowingLists(DBMySQL, group_seq))
    output.add('group_count_info', await GroupService.getGroupCountsInfo(DBMySQL, group_seq));
    res.json(output);
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }
}))

routes.post('/getmentolist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const token_info = req.token_info;
  const group_seq = token_info.getGroupSeq()
  const output = new StdObject();
  const category_code = req.body.category_code;

  try {
    const bestMentoResult = await MentoringService.getBestMentoringLists(DBMySQL, category_code, group_seq)
    _.forEach(bestMentoResult, (value) => {
      if (value.profile_image_path !== null) {
        value.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), value.profile_image_path)
      }
    })
    output.add('bestmentolist', bestMentoResult);

    const recommendMentoResult = await MentoringService.getRecommendMentoringLists(DBMySQL, category_code)
    _.forEach(recommendMentoResult, (value) => {
      if (value.profile_image_path !== null) {
        value.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), value.profile_image_path)
      }
    })
    output.add('recommendmento', recommendMentoResult);
    res.json(output);
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }
}));

routes.post('/searchkeyword', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const sSearch = req.body.sSearch;

  try {
    const searchMentoResult = await MentoringService.getSearchMentoringLists(DBMySQL, sSearch)
    _.forEach(searchMentoResult, (value) => {
      value.profile_image_url = value.profile_image_path !== null ? Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), value.profile_image_path) : null
    })
    output.add('search_member', searchMentoResult);
    output.add('search_hashtag', await HashtagService.getSearchHashtag(DBMySQL, sSearch));
    output.add('search_category', await MongoDataService.getSearchData('medical', sSearch))
    res.json(output);
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }
}));

routes.post('/operationmentoreceivelist', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const token_info = req.token_info;
  const group_seq = token_info.getGroupSeq()
  const output = new StdObject();

  try {
    output.add('operation_mento_receive_list', await MentoringService.getOperationMentoReceiveList(DBMySQL, group_seq))
    res.json(output);
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }
}));

routes.post('/reject_operation', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const output = new StdObject();
  const operation_data_seq = req.body.operation_data_seq;
  try {
    const result = await OperationDataService.setRejectMentoring(operation_data_seq);
    res.json(output);
  } catch (e) {
    throw new StdObject(-1, e, 400);
  }
}));

routes.get('/view/:operation_data_seq(\\d+)', Auth.isAuthenticated(Role.LOGIN_USER), Wrap(async(req, res) => {
  req.accepts('application/json');
  const { group_seq } = await GroupService.checkGroupAuth(DBMySQL, req, true, true, true)
  const operation_data_seq = req.params.operation_data_seq;

  const operation_data_info = await OperationDataService.getOperationData(DBMySQL, operation_data_seq)
  if (!operation_data_info || operation_data_info.isEmpty()) {
    throw new StdObject(-1, '등록된 정보가 없습니다.', 400)
  }
  if (operation_data_info.mento_group_seq !== group_seq && operation_data_info.group_seq !== group_seq) {
    throw new StdObject(-2, '접근 권한이 없습니다.', 403)
  }
  const { operation_info } = await OperationService.getOperationInfoNoAuth(DBMySQL, operation_data_info.operation_seq)
  if (!operation_info || operation_info.isEmpty()) {
    throw new StdObject(-3, '등록된 수술이 없습니다.', 400)
  }
  const clip_list = await OperationClipService.findByOperationSeq(operation_data_info.operation_seq);
  const group_info = await GroupService.getGroupInfoToGroupCounts(DBMySQL, operation_data_info.operation_seq)

  const output = new StdObject();
  output.add('operation_info', operation_info);
  output.add('operation_data_info', operation_data_info);
  output.add('clip_list', clip_list);
  output.add('group_info', group_info);

  res.json(output);
}));

export default routes;
