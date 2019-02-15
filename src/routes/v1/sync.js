import { Router } from 'express';
import _ from 'lodash';
import querystring from 'querystring';
import service_config from '@/config/service.config';
import Wrap from '@/utils/express-async';
import Util from '@/utils/baseutil';
import Auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import OperationModel from '@/models/OperationModel';
import OperationMediaModel from '@/models/OperationMediaModel';
import OperationStorageModel from '@/models/OperationStorageModel';
import IndexModel from '@/models/xmlmodel/IndexModel';
import ClipModel from '@/models/xmlmodel/ClipModel';
import ReportModel from "@/models/xmlmodel/ReportModel";
import VideoFileModel from '@/models/VideoFileModel';
import ReferFileModel from '@/models/ReferFileModel';
import OperationInfo from "@/classes/surgbook/OperationInfo";
import SmilInfo from "@/classes/surgbook/SmilInfo";
import VideoModel from '@/models/xmlmodel/VideoModel';
import log from "@/classes/Logger";
import IndexInfo from "@/classes/surgbook/IndexInfo";

const routes = Router();

const getHawkeyeXmlInfo = async (content_id, api_url, req, log_prefix) => {
  const service_info = service_config.getServiceInfo();

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
  log.d(req, `${log_prefix} hawkeye index2 list api url: ${index_list_api_url}`);

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
        const index_info = new IndexInfo().getFromHawkeyeXML(index_xml_list[i]);
        if (!index_info.isEmpty()) {
          index_file_list.push(index_info.getXmlJson());
        }
      }
    }
    _.sortBy(index_file_list, index_xml => Util.parseInt(index_xml.frame));
  }
  return {
    "IndexInfo": {
      "Index": index_file_list
    }
  };
};

const syncOne = async (req, token_info, operation_seq) => {
  log.d(req, `sync_one[seq: ${operation_seq}] start`);
  await database.transaction(async(trx) => {
    const service_info = service_config.getServiceInfo();

    const operation_model = new OperationModel({ database: trx });
    const operation_media_model = new OperationMediaModel({ database: trx });
    const operation_storage_model = new OperationStorageModel({ database: trx });

    const operation_info = await operation_model.getOperationInfo(operation_seq, token_info, false);
    if (!operation_info || operation_info.isEmpty()) {
      throw new StdObject(1, '수술정보가 존재하지 않습니다.', 400);
    }
    const media_directory = operation_info.media_directory;
    const content_id = operation_info.content_id;
    if (Util.isEmpty(content_id)) {
      throw new StdObject(2, '등록된 컨텐츠 아이디가 없습니다.', 400);
    }

    const log_prefix = `sync_one[seq: ${operation_seq}, content_id: ${content_id}]`;

    Util.createDirectory(media_directory + "SEQ");
    Util.createDirectory(media_directory + "Custom");
    Util.createDirectory(media_directory + "REF");
    Util.createDirectory(media_directory + "Thumb");
    Util.createDirectory(media_directory + "Trash");

    await operation_media_model.syncMediaInfoByXml(operation_info);
    const operation_media_info = await operation_media_model.getOperationMediaInfo(operation_info);

    const is_sync_complete = operation_info.is_analysis_complete && operation_media_info.is_trans_complete;
    log.d(req, `${log_prefix} load operation infos. [is_sync_complete: ${is_sync_complete}]`);
    if (!is_sync_complete) {
      log.d(req, `${log_prefix} sync is not complete [analysis: ${operation_info.is_analysis_complete}, trans: ${operation_info.is_trans_complete}]. process end`);
      return;
    }

    const operation_storage_info = await operation_storage_model.getOperationStorageInfoNotExistsCreate(operation_info);

    log.d(req, `${log_prefix} hawkeye index list api`);

    const index2_xml_info = await getHawkeyeXmlInfo(content_id, service_info.hawkeye_index2_list_api, req, log_prefix);
    let index1_xml_info = null;
    try {
      index1_xml_info = await getHawkeyeXmlInfo(content_id, service_info.hawkeye_index1_list_api, req, log_prefix);
    } catch (error) {
      log.e(req, `${log_prefix} hawkeye index1 list api`, error);
    }

    Util.deleteFile(media_directory + "Index1.xml");
    Util.deleteFile(media_directory + "Index2.xml");
    Util.deleteFile(media_directory + "Custom.xml");
    Util.deleteFile(media_directory + "History.xml");
    Util.deleteFile(media_directory + "Report.xml");
    Util.deleteFile(media_directory + "Clip.xml");

    await Util.writeXmlFile(operation_info.media_directory, 'Index2.xml', index2_xml_info);
    let index_list_api_result = "인덱스2 개수: " + (index2_xml_info.IndexInfo.Index.length) + "개, path: " + operation_info.media_directory + 'Index2.xml';
    log.d(req, `${log_prefix} hawkeye index2 list api result: [${index_list_api_result}]`);

    if (index1_xml_info) {
      await Util.writeXmlFile(operation_info.media_directory, 'Index1.xml', index1_xml_info);
      index_list_api_result = "인덱스1 개수: " + (index1_xml_info.IndexInfo.Index.length) + "개, path: " + operation_info.media_directory + 'Index1.xml';
      log.d(req, `${log_prefix} hawkeye index1 list api result: [${index_list_api_result}]`);
    }

    const storage_seq = operation_storage_info.seq;
    operation_info.storage_seq = storage_seq;

    const video_sync_result = await new VideoFileModel({database: trx}).syncVideoFiles(operation_info, operation_media_info, storage_seq);
    const refer_sync_result = await new ReferFileModel({database: trx}).syncReferFiles(operation_info, storage_seq);

    const index1_info_list = await new IndexModel({ database: trx }).getIndexList(operation_info, 1);
    const index2_info_list = await new IndexModel({ database: trx }).getIndexList(operation_info, 2);
    const clip_info = await new ClipModel({ database: trx }).getClipInfo(operation_info);
    const sheet_list = await new ReportModel({ database: trx }).getReportInfo(operation_info);

    const index1_file_size = Util.getDirectoryFileSize(operation_info.media_directory + 'INX1');
    const index2_file_size = Util.getDirectoryFileSize(operation_info.media_directory + 'INX2');

    const update_storage_info = {};
    update_storage_info.origin_video_size = Util.byteToMB(video_sync_result.origin_video_size);
    update_storage_info.origin_video_count = video_sync_result.origin_video_count;
    update_storage_info.trans_video_size = Util.byteToMB(video_sync_result.trans_video_size);
    update_storage_info.trans_video_count = video_sync_result.trans_video_count;
    update_storage_info.refer_file_size = Util.byteToMB(refer_sync_result.refer_file_size);
    update_storage_info.refer_file_count = refer_sync_result.refer_file_count;
    update_storage_info.index1_file_size = Util.byteToMB(index1_file_size);
    update_storage_info.index1_file_count = index1_info_list.length;
    update_storage_info.index2_file_size = Util.byteToMB(index2_file_size);
    update_storage_info.index2_file_count = index2_info_list.length;
    update_storage_info.index3_file_count = clip_info.clip_list.length;
    update_storage_info.clip_count = clip_info.clip_seq_list.length;
    update_storage_info.report_count = sheet_list.length;

    await operation_storage_model.updateStorageInfo(storage_seq, update_storage_info);
    await operation_storage_model.updateStorageSummary(storage_seq);
    log.d(req, `${log_prefix} update storage info complete`);

    const operation_update_param = {};
    if (is_sync_complete) {
      operation_update_param.analysis_status = 'Y';
    } else {
      operation_update_param.analysis_status = operation_info.analysis_status === 'R' ? 'R' : 'N';
    }

    await operation_model.updateOperationInfo(operation_seq, new OperationInfo(operation_update_param));

    log.d(req, `${log_prefix} complete`);
  });
};

const reSync = async (req) => {
  const operation_seq = req.params.operation_seq;
  const admin_member_info = {
    seq: 0,
    role: roles.ADMIN,
    hospital_code: 'XXXX',
    depart_code: 'ZZZ'
  };
  const token_result = Auth.generateTokenByMemberInfo(admin_member_info);
  const token_info = token_result.token_info;

  await database.transaction(async(trx) => {
    const operation_model = new OperationModel({ database: trx });
    const operation_media_model = new OperationMediaModel({ database: trx });
    const operation_storage_model = new OperationStorageModel({ database: trx });

    const operation_info = await operation_model.getOperationInfo(operation_seq, token_info, false);
    if (operation_info.isEmpty()) {
      throw new StdObject(-1, '수술정보가 존재하지 않습니다.', 400);
    }
    const operation_media_info = await operation_media_model.getOperationMediaInfo(operation_info);
    await operation_storage_model.getOperationStorageInfoNotExistsCreate(operation_info);
    if (operation_media_info.isEmpty()) {
      await operation_media_model.createOperationMediaInfo(operation_info);
    }

    const operation_update_param = {};
    operation_update_param.is_analysis_complete = 0;
    operation_update_param.analysis_status = 'N';
    await operation_model.updateOperationInfo(operation_seq, new OperationInfo(operation_update_param));
    await operation_media_model.reSetOperationMedia(operation_info, false);

    const media_directory = operation_info.media_directory;

    // db 업데이트가 끝나면 기존 파일 정리.
    await Util.deleteDirectory(media_directory + "Custom");
    await Util.deleteDirectory(media_directory + "Trash");
    await Util.deleteDirectory(media_directory + "INX1");
    await Util.deleteDirectory(media_directory + "INX2");
    await Util.deleteDirectory(media_directory + "INX3");

    Util.createDirectory(media_directory + "SEQ");
    Util.createDirectory(media_directory + "Custom");
    Util.createDirectory(media_directory + "REF");
    Util.createDirectory(media_directory + "Thumb");
    Util.createDirectory(media_directory + "Trash");

    Util.deleteFile(media_directory + "Index.xml");
    Util.deleteFile(media_directory + "Index1.xml");
    Util.deleteFile(media_directory + "Index2.xml");
    Util.deleteFile(media_directory + "Clip.xml");
    Util.deleteFile(media_directory + "Custom.xml");
    Util.deleteFile(media_directory + "History.xml");
    Util.deleteFile(media_directory + "Report.xml");

    const seq_directory = media_directory + 'SEQ\\';
    let smil_info = null;
    log.d(req, operation_media_info);
    if (!operation_media_info.isEmpty()){
      if (!Util.isEmpty(operation_media_info.smil_file_name)) {
        smil_info = await new SmilInfo().loadFromXml(media_directory, operation_media_info.smil_file_name);
        log.d(req, `SmilInfo [database: ${operation_media_info.smil_file_name}]`, smil_info.video_info_list.length);
        if (smil_info.video_info_list) {
          for (let i = 0; i < smil_info.video_info_list.length; i++) {
            const smil_video_info = smil_info.video_info_list[i];
            Util.deleteFile(seq_directory + smil_video_info.file_name);
          }
        }
      }
      if (!Util.isEmpty(operation_media_info.video_file_name)) {
        Util.deleteFile(seq_directory + operation_media_info.video_file_name);
      }
      if (!Util.isEmpty(operation_media_info.proxy_file_name)) {
        Util.deleteFile(seq_directory + operation_media_info.proxy_file_name);
      }
    }

    if (!smil_info) {
      smil_info = await new SmilInfo().loadFromXml(media_directory, service_config.get('default_smil_file_name'));
      log.d(req, `SmilInfo [config: ${service_config.get('default_smil_file_name')}]`, smil_info);
    }

    if (smil_info && smil_info.video_info_list) {
      for (let i = 0; i < smil_info.video_info_list.length; i++) {
        const smil_video_info = smil_info.video_info_list[i];
        Util.deleteFile(seq_directory + smil_video_info.file_name);
      }
    }

    const video_info = await new VideoModel({ database: trx }).getVideoInfo(media_directory);
    if (!video_info.isEmpty()) {
      if (!Util.isEmpty(video_info.video_name)) {
        Util.deleteFile(seq_directory + video_info.video_name);
        Util.deleteFile(seq_directory + video_info.video_name.replace(/^[a-zA-Z]+_/, 'Proxy_'));
      }
    }
    Util.deleteFile(seq_directory + service_config.get('default_smil_file_name'));
    Util.deleteFile(media_directory + "Media.xml");
  });

  const url = `${service_config.get('forward_api_server_url')}/operations/${operation_seq}/request/analysis`;
  return await Util.forward(url, 'POST', token_info.token);
}

routes.post('/operation/:operation_seq(\\d+)/resync', Auth.isAuthenticated(), Wrap(async(req, res) => {
  const forward_result = reSync(req);
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

export default routes;
export {syncOne};
