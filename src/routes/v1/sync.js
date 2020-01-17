import {Router} from 'express';
import _ from 'lodash';
import querystring from 'querystring';
import ServiceConfig from '@/config/service.config';
import Wrap from '@/utils/express-async';
import Util from '@/utils/baseutil';
import Auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import OperationModel from '@/models/OperationModel';
import OperationMediaModel from '@/models/OperationMediaModel';
import OperationStorageModel from '@/models/OperationStorageModel';
import VideoFileModel from '@/models/VideoFileModel';
import ReferFileModel from '@/models/ReferFileModel';
import OperationInfo from "@/classes/surgbook/OperationInfo";
import SmilInfo from "@/classes/surgbook/SmilInfo";
import log from "@/classes/Logger";
import IndexInfo from "@/classes/surgbook/IndexInfo";
import SendMail from '@/classes/SendMail';
import Constants from '@/config/constants';
import BatchOperationQueueModel from '@/models/batch/BatchOperationQueueModel';
import FileInfo from "@/classes/surgbook/FileInfo";
import { VideoIndexInfoModel } from '@/db/mongodb/model/VideoIndex';
import OperationService from '@/service/operation/OperationService';

const routes = Router();

const getHawkeyeXmlInfo = async (content_id, api_url, req, log_prefix) => {
  const service_info = ServiceConfig.getServiceInfo();

  const index_list_data = {
    "ContentID": content_id
  };
  const index_list_api_params = querystring.stringify(index_list_data);

  const index_list_api_options = {
    hostname: service_info.hawkeye_server_domain,
    port: service_info.hawkeye_server_port,
    path: api_url + '?' + index_list_api_params,
    method: 'GET'
  };
  const index_list_api_url = 'http://' + service_info.hawkeye_server_domain + ':' + service_info.hawkeye_server_port + api_url + '?' + index_list_api_params;
  log.d(req, `${log_prefix} hawkeye index list api url: ${index_list_api_url}`);

  const index_list_request_result = await Util.httpRequest(index_list_api_options, false);
  const index_list_xml_info = await Util.loadXmlString(index_list_request_result);
  if (!index_list_xml_info || index_list_xml_info.errorcode || Util.isEmpty(index_list_xml_info.errorreport) || Util.isEmpty(index_list_xml_info.errorreport.frameinfo)) {
    if (index_list_xml_info && index_list_xml_info.errorcode && index_list_xml_info.errorcode.state) {
      throw new StdObject(3, Util.getXmlText(index_list_xml_info.errorcode.state), 500);
    } else {
      throw new StdObject(3, "XML 파싱 오류", 500);
    }
  }

  let index_file_list = [];
  let frame_info = index_list_xml_info.errorreport.frameinfo;
  if (frame_info) {
    if (_.isArray(frame_info)) {
      frame_info = frame_info[0];
    }
    const index_xml_list = frame_info.item;
    if (index_xml_list) {
      for (let i = 0; i < index_xml_list.length; i++) {
        const index_info = await new IndexInfo().getFromHawkeyeXML(index_xml_list[i]);
        if (!index_info.isEmpty()) {
          // index_file_list.push(index_info.getXmlJson());
          index_file_list.push(index_info);
        }
      }
    }
    if (index_file_list.length > 2) {
      _.sortBy(index_file_list, index_info => Util.parseInt(index_info.frame));

      let prev_info = index_file_list[0];
      for (let i = 1; i < index_file_list.length; i++) {
        const current_info = index_file_list[i];
        prev_info.end_frame = current_info.start_frame - 1;
        prev_info.end_time = current_info.start_time;
        prev_info = current_info;
      }
    }
  }
  return index_file_list;
};

const syncOne = async (req, token_info, operation_seq) => {
  log.d(req, `sync_one[seq: ${operation_seq}] start`);
  const service_info = ServiceConfig.getServiceInfo();

  let content_id = null;
  let operation_info = null;
  let operation_media_info = null;

  let log_prefix = null;
  let is_sync_complete = false;

  await database.transaction(async(trx) => {
    const operation_model = new OperationModel({database: trx});
    const operation_media_model = new OperationMediaModel({database: trx});

    operation_info = await operation_model.getOperationInfo(operation_seq, token_info, false);
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(1, '수술정보가 존재하지 않습니다.', 400);
    }
    content_id = operation_info.content_id;
    if (Util.isEmpty(content_id)) {
      throw new StdObject(2, '등록된 컨텐츠 아이디가 없습니다.', 400);
    }

    log_prefix = `sync_one[seq: ${operation_seq}, content_id: ${content_id}]`;

    operation_media_info = await operation_media_model.getOperationMediaInfo(operation_info);

    is_sync_complete = operation_info.is_analysis_complete && operation_media_info.is_trans_complete;
    log.d(req, `${log_prefix} load operation infos. [is_sync_complete: ${is_sync_complete}]`);
  });

  if (!is_sync_complete) {
    log.d(req, `${log_prefix} sync is not complete [analysis: ${operation_info.is_analysis_complete}, trans: ${operation_media_info.is_trans_complete}]. process end`);
    return;
  }

  const trans_media_directory = Util.getMediaDirectory(ServiceConfig.get('trans_video_root'), operation_info.media_path);
  const media_directory = operation_info.media_directory;

  await OperationService.createOperationDirectory(operation_info);
  await OperationService.deleteMetaFiles(operation_info);

  log.d(req, `${log_prefix} hawkeye index list api`);

  const index_info_list = await getHawkeyeXmlInfo(content_id, service_info.hawkeye_index2_list_api, req, log_prefix);
  const index_count = index_info_list.length;
  let index_list_api_result = "인덱스2 개수: " + (index_count) + "개";
  log.d(req, `${log_prefix} hawkeye index2 list api result: [${index_list_api_result}]`);
  if (index_count > 0) {
    const index_info = index_info_list[index_count - 1];
    index_info.end_frame = operation_media_info.total_frame;
    index_info.end_time = operation_media_info.total_time;
  }

  const video_index_info = await VideoIndexInfoModel.findOneByOperation(operation_seq);
  if (video_index_info) {
    await VideoIndexInfoModel.updateIndexListByOperation(operation_seq, index_info_list);
  } else {
    await VideoIndexInfoModel.createVideoIndexInfoByOperation(operation_info, index_info_list);
  }

  const smil_info = await new SmilInfo().loadFromXml(trans_media_directory, operation_media_info.smil_file_name);
  const trans_video_directory = trans_media_directory + 'SEQ' + Constants.SEP;
  const video_directory = media_directory + 'SEQ' + Constants.SEP;
  const is_directory_sperated = trans_video_directory !== video_directory;
  const add_video_file_list = [];
  let origin_video_size = 0;
  let origin_video_count = 0;
  let trans_video_size = 0;
  let trans_video_count = 0;
  if (!smil_info.isEmpty()) {
    const video_model = await new VideoFileModel({ database });
    const media_path = Util.removePathSEQ(operation_info.media_path) + 'SEQ';

    const file_list = await Util.getDirectoryFileList(video_directory);
    for (let i = 0; i < file_list.length; i++) {
      const file = file_list[i];
      if (file.isFile()) {
        const file_name = file.name;
        const video_file_path = video_directory + file_name;
        const file_info = (await new FileInfo().getByFilePath(video_file_path, media_path, file_name)).toJSON();
        if (file_info.file_type === Constants.VIDEO) {
          if (!is_directory_sperated) {
            if (smil_info.isTransVideo(file_name) || file_name === operation_media_info.video_file_name) {
              trans_video_count++;
              trans_video_size += file_info.file_size;
              continue;
            }
          }
          origin_video_count++;
          origin_video_size += file_info.file_size;
          if (operation_info.created_by_user !== true) {
            file_info.thumbnail = await video_model.createVideoThumbnail(video_file_path, operation_info);
            add_video_file_list.push(file_info);
          }
        }
      }
    }
    if (is_directory_sperated) {
      const trans_video_file_list = await Util.getDirectoryFileList(trans_video_directory);
      for (let i = 0; i < trans_video_file_list.length; i++) {
        const trans_video_file = trans_video_file_list[i];
        if (trans_video_file.isFile()) {
          const trans_video_file_name = trans_video_file.name;
          const trans_video_file_path = trans_video_directory + trans_video_file_name;
          const file_info = (await new FileInfo().getByFilePath(trans_video_file_path, media_path, trans_video_file_name)).toJSON();
          if (file_info.file_type === Constants.VIDEO) {
            if (smil_info.isTransVideo(trans_video_file_name) || trans_video_file_name === operation_media_info.video_file_name) {
              trans_video_count++;
              trans_video_size += file_info.file_size;
            }
          }
        }
      }
    }
  }

  await database.transaction(async(trx) => {

    const operation_storage_model = new OperationStorageModel({database: trx});
    const operation_storage_info = await operation_storage_model.getOperationStorageInfoNotExistsCreate(operation_info);

    const storage_seq = operation_storage_info.seq;
    operation_info.storage_seq = storage_seq;

    await new VideoFileModel({database: trx}).syncVideoFiles(operation_info, add_video_file_list, storage_seq);

    const update_storage_info = {};
    update_storage_info.origin_video_size = Util.byteToMB(origin_video_size);
    update_storage_info.origin_video_count = origin_video_count;
    update_storage_info.trans_video_size = Util.byteToMB(trans_video_size);
    update_storage_info.trans_video_count = trans_video_count;
    update_storage_info.index1_file_size = 0;
    update_storage_info.index1_file_count = 0;
    update_storage_info.index2_file_size = 0;
    update_storage_info.index2_file_count = index_count;
    update_storage_info.report_count = 0;

    if (operation_info.created_by_user !== true) {
      const refer_sync_result = await new ReferFileModel({database: trx}).syncReferFiles(operation_info, storage_seq);
      update_storage_info.refer_file_size = Util.byteToMB(refer_sync_result.refer_file_size);
      update_storage_info.refer_file_count = refer_sync_result.refer_file_count;
    }

    await operation_storage_model.updateStorageInfo(storage_seq, update_storage_info);
    await operation_storage_model.updateStorageSummary(storage_seq);
    log.d(req, `${log_prefix} update storage info complete`);

    const operation_update_param = {};
    if (is_sync_complete) {
      operation_update_param.analysis_status = 'Y';
    } else {
      operation_update_param.analysis_status = operation_info.analysis_status === 'R' ? 'R' : 'N';
    }

    const operation_model = new OperationModel({database: trx});
    await operation_model.updateOperationInfo(operation_seq, new OperationInfo(operation_update_param));

    log.d(req, `${log_prefix} complete`);
  });

  if (is_sync_complete) {
    await new BatchOperationQueueModel({ database }).onJobComplete(operation_seq);
  }

  if (service_info.send_process_mail === 'Y' && is_sync_complete) {
    const send_mail = new SendMail();
    const mail_to = ["hwj@mteg.co.kr"];
    const subject = "동영상 분석 완료";
    let context = "";
    context += `완료 일자: ${Util.currentFormattedDate()}<br/>\n`;
    context += `수술명: ${operation_info.operation_name}<br/>\n`;
    context += `수술일자: ${operation_info.operation_date}<br/>\n`;
    context += `content_id: ${content_id}<br/>\n`;
    context += `큐레이션 URL: ${service_info.service_url}/v2/curation/${operation_seq}<br/>\n`;
    await send_mail.sendMailHtml(mail_to, subject, context);
  }
};

const reSync = async (req, operation_seq) => {
  const admin_member_info = {
    seq: 0,
    role: roles.ADMIN
  };
  const token_result = Auth.generateTokenByMemberInfo(admin_member_info);
  const token_info = token_result.token_info;

  let operation_info = null;
  let media_directory = null;
  let operation_media_info = null;

  await database.transaction(async(trx) => {
    const operation_model = new OperationModel({ database: trx });
    const operation_media_model = new OperationMediaModel({ database: trx });
    const operation_storage_model = new OperationStorageModel({ database: trx });

    operation_info = await operation_model.getOperationInfo(operation_seq, token_info, false);
    if (operation_info.isEmpty()) {
      throw new StdObject(-1, '수술정보가 존재하지 않습니다.', 400);
    }
    media_directory = operation_info.media_directory;
    if (!Util.fileExists(media_directory)) {
      throw new StdObject(-1, '디렉터리가 존재하지 않습니다.', 400);
    }

    operation_media_info = await operation_media_model.getOperationMediaInfo(operation_info);
    await operation_storage_model.getOperationStorageInfoNotExistsCreate(operation_info);
    if (operation_media_info.isEmpty()) {
      await operation_media_model.createOperationMediaInfo(operation_info);
    }

    const operation_update_param = {};
    operation_update_param.is_analysis_complete = 0;
    operation_update_param.analysis_status = 'N';
    await operation_model.updateOperationInfo(operation_seq, new OperationInfo(operation_update_param));
    await operation_media_model.reSetOperationMedia(operation_info, false);
  });

  const trans_video_directory = Util.getMediaDirectory(ServiceConfig.get('trans_video_root'), operation_info.media_path);

  // db 업데이트가 끝나면 기존 파일 정리.

  await OperationService.deleteOperationDirectory(operation_info);
  await OperationService.createOperationDirectory(operation_info);

  await VideoIndexInfoModel.deleteByOperation(operation_info.seq);
  await VideoIndexInfoModel.createVideoIndexInfoByOperation(operation_info);

  const seq_directory = media_directory + 'SEQ' + Constants.SEP;

  let smil_info = null;
  if (!operation_media_info.isEmpty()){
    if (!Util.isEmpty(operation_media_info.smil_file_name)) {
      smil_info = await new SmilInfo().loadFromXml(trans_video_directory, operation_media_info.smil_file_name);
      if (smil_info && smil_info.video_info_list && smil_info.video_info_list.length) {
        log.d(req, `SmilInfo [database: ${operation_media_info.smil_file_name}]`, smil_info.video_info_list.length);
      }
    }
    if (!Util.isEmpty(operation_media_info.video_file_name)) {
      await Util.deleteFile(seq_directory + operation_media_info.video_file_name);
    }
    if (!Util.isEmpty(operation_media_info.proxy_file_name)) {
      await Util.deleteFile(seq_directory + operation_media_info.proxy_file_name);
    }
  }

  if (!smil_info || smil_info.isEmpty()) {
    smil_info = await new SmilInfo().loadFromXml(trans_video_directory, ServiceConfig.get('default_smil_file_name'));
    if (smil_info && smil_info.video_info_list && smil_info.video_info_list.length) {
      log.d(req, `SmilInfo [database: ${ServiceConfig.get('default_smil_file_name')}]`, smil_info.video_info_list.length);
    }
  }

  if (smil_info && smil_info.video_info_list) {
    for (let i = 0; i < smil_info.video_info_list.length; i++) {
      const smil_video_info = smil_info.video_info_list[i];
      await Util.deleteFile(seq_directory + smil_video_info.file_name);
    }
  }

  const trans_reg = /^(Proxy|Trans)_/i;
  const file_list = await Util.getDirectoryFileList(seq_directory);
  for (let i = 0; i < file_list.length; i++) {
    const file = file_list[i];
    if (file.isFile()) {
      const target_file = seq_directory + Constants.SEP + file.name;
      if (trans_reg.test(file.name)) {
        await Util.deleteFile(target_file);
        continue;
      }
    }
  }
  await Util.deleteFile(seq_directory + ServiceConfig.get('default_smil_file_name'));
  await Util.deleteFile(media_directory + "Media.xml");

  const url = `${ServiceConfig.get('forward_api_server_url')}/operations/${operation_seq}/request/analysis`;
  return await Util.forward(url, 'POST', token_info.token);
};

routes.post('/operation/:operation_seq(\\d+)/resync', Auth.isAuthenticated(), Wrap(async(req, res) => {
  const operation_seq = req.params.operation_seq;
  const forward_result = await reSync(req, operation_seq);
  if (typeof forward_result === 'string') {
    res.json(JSON.parse(forward_result));
  } else {
    res.json(forward_result);
  }
}));

routes.post('/operation/:operation_seq(\\d+)/refresh', Auth.isAuthenticated(), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  await syncOne(req, token_info, operation_seq);
  res.json(new StdObject());
}));

routes.post('/operation/resync/member/:member_seq(\\d+)', Auth.isAuthenticated(), Wrap(async(req, res) => {
  const member_seq = req.params.member_seq;

  res.json(new StdObject());

  const operation_model = new OperationModel({ database });
  let is_finish = false;
  let sync_count = 0;

  while (!is_finish) {
    const operation_info = await operation_model.getUnSyncOperationInfo(member_seq);
    if (!operation_info || operation_info.isEmpty()) {
      is_finish = true;
      break;
    }
    const operation_seq = operation_info.seq;
    try {
      const sync_result = await reSync(req, operation_seq);
      let json_result = null;
      if (typeof sync_result === 'string') {
        json_result = JSON.parse(sync_result);
      } else {
        json_result = sync_result;
      }
      if (json_result.error !== 0) {
        is_finish = true;
        log.e(req, json_result);
      } else {
        sync_count++;
        log.d(req, `[count: ${sync_count}, operation_seq: ${operation_seq}]`);
      }
    } catch (error) {
      is_finish = true;
      log.d(req, error);
    }
  }
}));

export default routes;
export { syncOne, reSync };
