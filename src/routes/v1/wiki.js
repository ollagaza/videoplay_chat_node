import {Router} from 'express';
import log from "../../libs/logger";
import wrap from '../../utils/express-async'
import StdObject from '../../wrapper/std-object'
import OperationExpansionDataService from "../../service/operation/OperationExpansionDataService"
import OperationAnalysisService from "../../service/operation/OperationAnalysisService"
import DBMySQL from '../../database/knex-mysql'
import Auth from '../../middlewares/auth.middleware'
import Role from "../../constants/roles"
import Util from '../../utils/baseutil'
import OperationService from '../../service/operation/OperationService'
import OperationClipService from '../../service/operation/OperationClipService'

const routes = Router();

const parsePageQuery = (req) => {
  const query = {};
  const count = req.query.count;
  const page = req.query.page;
  query.count = Util.parseInt(count, 0);
  query.page = Util.parseInt(page, 0);

  return query;
};

routes.get('/:code/newly', Auth.isAuthenticated(Role.DEFAULT), wrap(async (req, res) => {
  const code = req.params.code;
  const expansion_result = await OperationExpansionDataService.getNewlyExpansionDataList(DBMySQL, code, parsePageQuery(req));
  const result = new StdObject();
  result.add('result', expansion_result);
  res.json(result);
}));

routes.get('/:code/no_doc', Auth.isAuthenticated(Role.DEFAULT), wrap(async (req, res) => {
  const code = req.params.code;
  const expansion_result = await OperationExpansionDataService.getNoDocExpansionDataList(DBMySQL, code, parsePageQuery(req));
  log.d(req, expansion_result);
  const result = new StdObject();
  result.add('result', expansion_result);
  res.json(result);
}));

routes.get('/:code', Auth.isAuthenticated(Role.DEFAULT), wrap(async (req, res) => {
  const code = req.params.code;
  const search = req.query.search;
  const expansion_result = await OperationExpansionDataService.getOperationExpansionDataListByCode(DBMySQL, code, search, parsePageQuery(req));
  const result = new StdObject();
  result.add('result', expansion_result);
  res.json(result);
}));

routes.get('/contents/:wiki_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), wrap(async (req, res) => {
  const wiki_seq = req.params.wiki_seq;

  const result = new StdObject();

  const wiki_info = await OperationExpansionDataService.getOperationExpansionDataById(DBMySQL, wiki_seq);
  log.d(req, 'wiki_info', wiki_info)
  if (!wiki_info || wiki_info.isEmpty()) {
    result.error = 1
    result.message = '위키정보가 존재하지 않습니다.'
    result.httpStatusCode = 400

    res.json(result);
    return
  }
  const operation_info = await OperationService.getOperationInfo(DBMySQL, wiki_info.operation_seq, null, false, true)
  if (!operation_info || operation_info.isEmpty()) {
    result.error = 2
    result.message = '수술정보가 존재하지 않습니다.'
    result.httpStatusCode = 400

    res.json(result);
    return
  }
  const clip_list = await OperationClipService.findByOperationSeq(wiki_info.operation_seq)
  const analysis_result = await OperationAnalysisService.getOperationAnalysisByOperationSeq(wiki_info.operation_seq)

  result.add('operation_info', operation_info);
  result.add('clip_list', clip_list);
  result.add('analysis_result', analysis_result);

  res.json(result);
}));

routes.put('/document/:wiki_seq(\\d+)', Auth.isAuthenticated(Role.DEFAULT), wrap(async (req, res) => {
  const wiki_seq = req.params.wiki_seq;
  const document = req.body.document;
  const query_result = await OperationExpansionDataService.updateOperationExpansionDocumentById(DBMySQL, wiki_seq, document);
  const result = new StdObject();
  result.add('result', query_result);
  res.json(result);
}));

export default routes;
