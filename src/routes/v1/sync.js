import { Router } from 'express';
import service_config from '@/config/service.config';
import { promisify } from 'util';
import Wrap from '@/utils/express-async';
import Util from '@/utils/baseutil';
import Auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import MemberModel from '@/models/MemberModel';
import OperationInfo from "@/classes/surgbook/OperationInfo";
import OperationModel from '@/models/OperationModel';
import OperationMediaModel from '@/models/OperationMediaModel';
import OperationStorageModel from '@/models/OperationStorageModel';
import OperationShareModel from '@/models/OperationShareModel';
import OperationShareUserModel from '@/models/OperationShareUserModel';
import IndexModel from '@/models/xmlmodel/IndexModel';
import ClipModel from '@/models/xmlmodel/ClipModel';
import VideoFileModel from '@/models/VideoFileModel';
import ReferFileModel from '@/models/ReferFileModel';
import ShareTemplate from '@/template/mail/share.template';

const routes = Router();

routes.post('/operation/:operation_seq(\\d+)', Auth.isAuthenticated(), Wrap(async(req, res) => {
  const operation_seq = req.params.operation_seq;
  await database.transaction(async(trx) => {
    const operation_info = await new OperationModel({ database: trx }).getOperationIn
  });

}));

export default routes;
