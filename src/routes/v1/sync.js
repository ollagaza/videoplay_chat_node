import { Router } from 'express';
import service_config from '@/config/service.config';
import Wrap from '@/utils/express-async';
import Util from '@/utils/baseutil';
import Auth from '@/middlewares/auth.middleware';
import roles from "@/config/roles";
import database from '@/config/database';
import StdObject from '@/classes/StdObject';
import ContentIdManager from '@/classes/ContentIdManager';
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



const routes = Router();

const sync_one = async (token_info, operation_seq, content_id) => {
  await database.transaction(async(trx) => {
    const operation_model = new OperationModel({ database: trx });
    const operation_media_model = new OperationMediaModel({ database: trx });
    const operation_storage_model = new OperationStorageModel({ database: trx });

    const operation_info = await operation_model.getOperationInfo(operation_seq, token_info, false);
    const media_directory = operation_info.media_directory;

    Util.createDirectory(media_directory + "SEQ");
    Util.createDirectory(media_directory + "Custom");
    Util.createDirectory(media_directory + "REF");
    Util.createDirectory(media_directory + "Thumb");
    Util.createDirectory(media_directory + "Trash");

    await operation_media_model.syncMediaInfoByXml(operation_info);
    const operation_media_info = await operation_media_model.getOperationMediaInfo(operation_info);
    const operation_storage_info = await operation_storage_model.getOperationStorageInfoNotExistsCreate(operation_info);

    const storage_seq = operation_storage_info.seq;
    operation_info.storage_seq = storage_seq;

    const video_sync_result = await new VideoFileModel({database: trx}).syncVideoFiles(operation_info, operation_media_info, storage_seq);
    const refer_sync_result = await new ReferFileModel({database: trx}).syncReferFiles(operation_info, storage_seq);

    const index1_info_list = await new IndexModel({ database: trx }).getIndexlist(operation_info, 1);
    const index2_info_list = await new IndexModel({ database: trx }).getIndexlist(operation_info, 2);
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

    const operation_update_param = {};
    if (content_id) {
      operation_update_param.content_id = content_id;
    } else if (Util.isEmpty(operation_info.content_id)) {
      operation_update_param.content_id = await ContentIdManager.getContentId();
    }
    if (operation_info.is_analysis_complete > 0 && operation_media_info.is_trans_complete) {
      operation_update_param.analysis_status = 'Y';
    } else {
      operation_update_param.analysis_status = operation_info.analysis_status === 'R' ? 'R' : 'N';
    }

    await operation_model.updateOperationInfo(operation_seq, new OperationInfo(operation_update_param));
  });
};

routes.post('/operation/:operation_seq(\\d+)/resync', Auth.isAuthenticated(), Wrap(async(req, res) => {
  let token_info = req.token_info;
  const operation_seq = req.params.operation_seq;
  const admin_member_info = {
    seq: 0,
    role: roles.ADMIN,
    hospital_code: 'XXXX',
    depart_code: 'ZZZ'
  };
  const token_result = Auth.generateTokenByMemberInfo(admin_member_info);
  token_info = token_result.token_info;

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
    await operation_media_model.updateAnalysisComplete(operation_seq, false);

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
        log.d(req, `SmilInfo [database: ${operation_media_info.smil_file_name}]`, smil_info);
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
  const forward_result = await Util.forward(url, 'POST', token_info.token);
  res.json(forward_result);
}));

routes.post('/operation/:operation_seq(\\d+)/execute', Auth.isAuthenticated(), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

  await sync_one(token_info, operation_seq, null);
  res.json(new StdObject());
}));

export default routes;
export {sync_one};
