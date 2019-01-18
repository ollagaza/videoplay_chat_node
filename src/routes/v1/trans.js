import { Router } from 'express';
import Wrap from '@/utils/express-async';
import Auth from '@/middlewares/auth.middleware';
import Util from '@/utils/baseutil';
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import OperationModel from '@/models/OperationModel';
import OperationMediaModel from '@/models/OperationMediaModel';


const routes = Router();

routes.post('/status/:content_id', Auth.isAuthenticated(), Wrap(async(req, res) => {
  req.accepts('application/json');

  const content_id = req.params.content_id;
  const trans_info = req.body;
  if (trans_info && !trans_info.error) {
    console.log(trans_info);

    if (Util.isEmpty(trans_info) || Util.isEmpty(trans_info.video_file_name) || Util.isEmpty(trans_info.smil_file_name)) {
      throw new StdObject(1, '잘못된 파라미터', 400);
    }

    const operation_info = await new OperationModel({ database }).getOperationInfoByContentId(content_id);
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(2, '등록된 컨텐츠가 없습니다.', 400);
    }

    console.log(operation_info.toJSON());
    await new OperationMediaModel({ database }).updateTransComplete(operation_info, trans_info);
  }

  res.json(new StdObject());
}));

export default routes;
