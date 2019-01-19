import { Router } from 'express';
import service_config from '@/config/service.config';
import { promisify } from 'util';
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

const routes = Router();

routes.post('/operation/:operation_seq(\\d+)', Auth.isAuthenticated(), Wrap(async(req, res) => {
  const token_info = req.token_info;
  const operation_seq = req.params.operation_seq;

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

    res.json(new StdObject());
  });

}));

export default routes;
