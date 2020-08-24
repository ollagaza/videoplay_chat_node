import { Router } from 'express';
import _ from 'lodash';
import log from '../../libs/logger'
import Wrap from '../../utils/express-async';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import Auth from "../../middlewares/auth.middleware";
import Role from "../../constants/roles";
import Util from "../../utils/baseutil";
import MongoDataService from '../../service/common/MongoDataService'
import HashtagService from '../../service/operation/HashtagService';
import MentoringService from "../../service/mentoring/MentoringService";
import MentoringCommentService from "../../service/mentoring/MentoringCommentService";
import FollowService from "../../service/follow/FollowService";
import OperationService from '../../service/operation/OperationService'
import OperationDataService from '../../service/operation/OperationDataService'
import ServiceConfig from "../../service/service-config";
import GroupService from "../../service/member/GroupService";
import ContentCountService from '../../service/member/ContentCountService'

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
    _.forEach(bestMentoResult, async (value) => {
      value.videos = await OperationDataService.getCompleteIsOpenVideoDataLists(value.group_seq, 3);
      if (value.profile_image_path !== null) {
        value.profile_image_url = Util.getUrlPrefix(ServiceConfig.get('static_storage_prefix'), value.profile_image_path)
      }
    })
    output.add('bestmentolist', bestMentoResult);

    const recommend_category = await ContentCountService.getRecommendCategorys(DBMySQL, group_seq);
    // log.debug('[mentoring_router]', 'recommend_category', recommend_category)
    const make_medical_list = await MongoDataService.getObjectData('medical', recommend_category);
    // log.debug('[mentoring_router]', 'make_medical_list', make_medical_list)
    output.add('recommend_category', make_medical_list);

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
  const send_group_seq = req.body.group_seq
  const output = new StdObject();

  try {
    output.add('operation_mento_receive_list', await MentoringService.getOperationMentoReceiveList(DBMySQL, send_group_seq === undefined ? group_seq : send_group_seq))
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

export default routes;
