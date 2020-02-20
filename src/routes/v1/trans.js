import { Router } from 'express';
import querystring from 'querystring';
import ServiceConfig from '../../service/service-config';
import Wrap from '../../utils/express-async';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import SendMail from '../../libs/send-mail';
import OperationModel from '../../database/mysql/operation/OperationModel';
import OperationMediaModel from '../../database/mysql/operation/OperationMediaModel';
import ServiceErrorModel from '../../database/mysql/service-error-model';
import { syncOne } from './sync';

const routes = Router();

const on_complete = Wrap(async(req, res) => {
  const token_info = req.token_info;
  const query_str = querystring.stringify(req.query);
  log.d(req, 'api 호출', query_str);

  const content_id = req.query.content_id;
  const video_file_name = req.query.video_file_name;
  const smil_file_name = req.query.smil_file_name;
  const error = req.query.error;
  const trans_info = {
    video_file_name: req.query.video_file_name,
    smil_file_name: req.query.smil_file_name,
    error: req.query.error,
  };

  let result = null;
  let operation_seq = null;
  try {
    if (Util.isEmpty(content_id) || Util.isEmpty(trans_info.video_file_name) || Util.isEmpty(trans_info.smil_file_name)) {
      throw new StdObject(1, '잘못된 파라미터', 400);
    }

    const operation_info = await new OperationModel(DBMySQL).getOperationInfoByContentId(content_id);
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(2, '등록된 컨텐츠가 없습니다.', 400);
    }
    await new OperationMediaModel(DBMySQL).updateTransComplete(operation_info, trans_info);
    operation_seq = operation_info.seq;

    await syncOne(req, token_info, operation_seq);

    result = new StdObject();
    log.d(req, '완료', result);
  } catch (error) {
    if(error instanceof StdObject) {
      result = error;
    } else {
      result = new StdObject(3, error.message, 500);
      result.stack = error.stack;
    }
    log.e(req, error);
    await new ServiceErrorModel(DBMySQL).createServiceError('trans', operation_seq, content_id, JSON.stringify(result));
  }

  res.json(result);
});

const on_error = Wrap(async(req, res) => {
  const query_str = querystring.stringify(req.query);
  log.d(req, '트랜스코딩 에러', query_str);

  const content_id = req.query.content_id;
  const message = req.query.message;

  if (Util.isEmpty(content_id)) {
    throw new StdObject(1, '잘못된 파라미터', 400);
  }

  const operation_model = new OperationModel(DBMySQL);
  const service_error_model = new ServiceErrorModel(DBMySQL);
  const operation_info = await operation_model.getOperationInfoByContentId(content_id);
  if (operation_info.isEmpty()) {
    await service_error_model.createServiceError('trans', null, content_id, message);
  } else {
    await operation_model.updateAnalysisStatus(operation_info.seq, 'E');
    await service_error_model.createServiceError('trans', operation_info.seq, content_id, message);
  }

  res.json(new StdObject());
});

routes.get('/complete', on_complete);
routes.post('/complete', on_complete);
routes.get('/error', on_error);
routes.post('/error', on_error);

export default routes;
