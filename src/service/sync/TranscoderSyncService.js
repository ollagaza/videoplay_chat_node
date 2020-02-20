import { Router } from 'express';
import querystring from 'querystring';
import ServiceConfig from '../../service/service-config';
import Wrap from '../../utils/express-async';
import Util from '../../utils/baseutil';
import Auth from '../../middlewares/auth.middleware';
import StdObject from '../../wrapper/std-object';
import DBMySQL from '../../database/knex-mysql';
import log from "../../libs/logger";
import OperationService from '../operation/OperationService'
import OperationMediaService from '../operation/OperationMediaService'
import SendMail from '../../libs/send-mail';
import OperationModel from '../../database/mysql/operation/OperationModel';
import OperationMediaModel from '../../database/mysql/operation/OperationMediaModel';
import ServiceErrorModel from '../../database/mysql/service-error-model';

const TranscoderSyncServiceClass = class {
  constructor () {
    this.log_prefix = '[TranscoderSyncService]'
  }

  getOperationInfo = async (database, content_id) => {
    return await OperationService.getOperationInfoByContentId(database, content_id)
  }

  onTranscodingComplete = async (database, content_id, video_file_name, smil_file_name, error) => {
    if (Util.isEmpty(content_id) || Util.isEmpty(video_file_name) || Util.isEmpty(smil_file_name)) {
      throw new StdObject(1, '잘못된 파라미터', 400);
    }
    const { operation_info, operation_model } = await this.getOperationInfo(content_id)
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(2, '등록된 컨텐츠가 없습니다.', 400);
    }
    await OperationMediaService.updateTranscodingComplete(database, operation_info, video_file_name, smil_file_name)
  }
}

const transcoder_sync_service = new TranscoderSyncServiceClass()
export default transcoder_sync_service
