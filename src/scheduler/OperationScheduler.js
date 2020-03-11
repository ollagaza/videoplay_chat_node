import path from 'path';
import scheduler from 'node-schedule';
import ServiceConfig from '../service/service-config';
import Auth from '../middlewares/auth.middleware';
import Role from "../constants/roles";
import Constants from '../constants/constants';
import Util from '../utils/baseutil';
import StdObject from '../wrapper/std-object';
import DBMySQL from '../database/knex-mysql';
import OperationService from '../service/operation/OperationService';
import BatchOperationQueueModel from '../database/mysql/batch/BatchOperationQueueModel';
import OperationModel from '../database/mysql/operation/OperationModel';
import OperationMediaModel from '../database/mysql/operation/OperationMediaModel';
import OperationStorageModel from '../database/mysql/operation/OperationStorageModel';
import VideoFileModel from '../database/mysql/file/VideoFileModel';
import { VideoIndexInfoModel } from '../database/mongodb/VideoIndex';
import FileInfo from "../wrapper/file/FileInfo";

import log from "../libs/logger";

class OperationScheduler {
  constructor() {
    this.current_job = null;
    this.is_process = false;
    this.log_prefix = 'OperationScheduler';
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.d(null, this.log_prefix, 'startSchedule cancel. current_job is not null');
      } else {
        this.current_job = scheduler.scheduleJob('30 10,40 * * * *', this.onNewJob);
        log.d(null, this.log_prefix, 'startSchedule');
      }
    } catch (error) {
      log.e(null, this.log_prefix, 'startSchedule', error);
    }
  };

  stopSchedule = () => {
    if (this.current_job) {
      try {
        this.current_job.cancel();
        log.d(null, this.log_prefix, 'stopSchedule');
      } catch (error) {
        log.e(null, this.log_prefix, 'stopSchedule', error);
      }
    }
    this.current_job = null;
  };

  onNewJob = () => {
    log.d(null, this.log_prefix, 'onNewJob start', this.is_process);
    if (this.is_process) {
      return;
    }
    this.is_process = true;
    (
      async () => {
        await this.nextJob();
      }
    )()
  };

  nextJob = async () => {
    this.stopSchedule();
    log.d(null, this.log_prefix, 'executeNextJob start');
    try{
      let sync_info = null;
      await DBMySQL.transaction(async(transaction) => {
        const sync_model = new BatchOperationQueueModel(transaction);
        sync_info = await sync_model.pop();
      });

      log.d(null, this.log_prefix, 'executeNextJob', 'pop', sync_info);
      if (sync_info) {
        (
          async () => {
            log.d(null, this.log_prefix, 'executeNextJob', 'execute jop', sync_info);
            await this.executeJob(sync_info);
          }
        )();
      } else {
        log.d(null, this.log_prefix, 'executeNextJob', 'has no jop');
        this.is_process = false;
        this.startSchedule();
      }
    } catch (error) {
      log.e(null, this.log_prefix, 'executeNextJob', error);
      this.is_process = false;
      this.startSchedule();
    }
    log.d(null, this.log_prefix, 'executeNextJob end');
  };

  executeJob = async (sync_info) => {
    // log.d(null, this.log_prefix, 'executeJob start', sync_info);
    // const data = JSON.parse(sync_info.data);
    // let operation_info = null;
    // let is_success = false;
    // try {
    //   await DBMySQL.transaction(async(transaction) => {
    //     const sync_model = new BatchOperationQueueModel(transaction);
    //     operation_info = await this.createOperation(transaction, sync_info);
    //     await sync_model.onJobStart(sync_info, operation_info.seq);
    //     sync_info.operation_seq = operation_info.seq;
    //   });
    //
    //   await this.copyFiles(data, operation_info);
    //   const sync_model = new BatchOperationQueueModel(DBMySQL);
    //   await sync_model.updateStatus(sync_info, 'C');
    //
    //   is_success = true;
    // } catch (error) {
    //   await this.onExecuteError(sync_info, error, operation_info);
    //   log.e(null, this.log_prefix, 'executeNextJob - create', error);
    // }
    //
    // if (is_success) {
    //   try {
    //     await new OperationStorageModel(DBMySQL).updateUploadFileSize(operation_info.storage_seq, 'video');
    //     const request_result = await this.requestAnalysis(operation_info.seq);
    //     const sync_model = new BatchOperationQueueModel(DBMySQL);
    //     if (request_result.error === 0) {
    //       await sync_model.updateStatus(sync_info, 'R');
    //     } else {
    //       await sync_model.updateStatus(sync_info, 'RE', false, request_result);
    //     }
    //   } catch (error) {
    //     log.e(null, this.log_prefix, 'executeNextJob - request error', error);
    //   } finally {
    //     if (operation_info) {
    //       try {
    //         await new OperationModel(DBMySQL).updateStatusNormal(operation_info.seq, sync_info.member_seq);
    //       } catch (error) {
    //         log.e(null, this.log_prefix, 'executeNextJob - OperationModel.updateStatusNormal', error);
    //       }
    //     }
    //   }
    // }
    //
    // log.d(null, this.log_prefix, 'executeJob end', sync_info);
    // this.onExecuteJobComplete();
  };

  // createOperation = async (transaction, sync_info) => {
  //   log.d(null, this.log_prefix, 'createOperation start', sync_info);
  //   const operation_model = new OperationModel(transaction);
  //   const operation = {
  //     "operation_code": sync_info.key,
  //     "operation_name": sync_info.key,
  //     "operation_date": Util.today()
  //   };
  //   const operation_info = await operation_model.createOperation(null, operation, sync_info.member_seq, true, 'D');
  //   if (!operation_info || !operation_info.seq) {
  //     throw new StdObject(-1, '수술정보 입력에 실패하였습니다.', 500)
  //   }
  //   const media_seq = await new OperationMediaModel(transaction).createOperationMediaInfo(operation_info);
  //   const storage_seq = await new OperationStorageModel(transaction).createOperationStorageInfo(operation_info);
  //   await VideoIndexInfoModel.createVideoIndexInfoByOperation(operation_info);
  //
  //   await OperationService.createOperationDirectory(operation_info);
  //
  //   operation_info.media_seq = media_seq;
  //   operation_info.storage_seq = storage_seq;
  //
  //   log.d(null, this.log_prefix, 'createOperation end', sync_info, operation_info);
  //   return operation_info;
  // };
  //
  // copyFiles = async (data, operation_info) => {
  //   log.d(null, this.log_prefix, 'copyFiles start', data, operation_info);
  //
  //   if (!Util.isArray(data)) {
  //     throw new StdObject(-2, '대상 파일 목록이 없습니다.', 400);
  //   }
  //   const video_directory = operation_info.media_directory + 'SEQ';
  //   const video_file_list = [];
  //   for (let i = 0; i < data.length; i++) {
  //     const origin_file = data[i];
  //     if (!(await Util.fileExists(origin_file))) {
  //       log.d(null, this.log_prefix, 'copyFiles - file not exists', origin_file);
  //       continue;
  //     }
  //     const file_name = path.basename(origin_file);
  //     const file_info = await new FileInfo().getByFilePath(origin_file, video_directory, file_name);
  //     log.d(null, this.log_prefix, 'copyFiles - file_info', origin_file, file_info.toJSON());
  //     if (file_info.file_type === Constants.VIDEO) {
  //       const copy_file_name = 'copy_' + file_name;
  //       const video_file_path = video_directory + '/' + copy_file_name;
  //       log.d(null, this.log_prefix, 'copyFiles - copy', origin_file, video_file_path);
  //       const copy_result = await Util.copyFile(origin_file, video_file_path);
  //       if (!copy_result) {
  //         throw new StdObject(-3, '비디오 파일 복사 실패.', 400);
  //       }
  //       if (!(await Util.fileExists(video_file_path))) {
  //         throw new StdObject(-4, '비디오 파일 복사 실패.', 400);
  //       }
  //       const media_path = Util.removePathSEQ(operation_info.media_path) + 'SEQ';
  //       file_info.full_path = video_file_path;
  //       file_info.file_name = copy_file_name;
  //       file_info.file_path = media_path + '/' + copy_file_name;
  //       video_file_list.push(file_info);
  //
  //       log.d(null, this.log_prefix, 'copyFiles - copy complete', origin_file, video_file_path);
  //     }
  //   }
  //   if (video_file_list.length <= 0) {
  //     throw new StdObject(-4, '비디오파일이 없습니다.', 400);
  //   }
  //   try {
  //     const video_file_model = new VideoFileModel(DBMySQL);
  //     for (let i = 0; i < video_file_list.length; i++) {
  //       const file_info = video_file_list[i];
  //       log.d(null, this.log_prefix, 'copyFiles - create thumbnail', file_info.full_path);
  //       file_info.thumbnail = await video_file_model.createVideoThumbnail(file_info.full_path, operation_info)
  //     }
  //
  //     await DBMySQL.transaction(async(transaction) => {
  //       const video_file_model = new VideoFileModel(transaction);
  //       for (let i = 0; i < video_file_list.length; i++) {
  //         const file_info = video_file_list[i];
  //         log.d(null, this.log_prefix, 'copyFiles - add video file info', file_info.full_path);
  //         await video_file_model.createVideoFileByFileInfo(operation_info, operation_info.storage_seq, file_info, false);
  //       }
  //     });
  //   } catch (error) {
  //     for (let i = 0; i < video_file_list.length; i++) {
  //       await Util.deleteFile(video_file_list[i].full_path);
  //     }
  //     throw error;
  //   }
  //
  //   log.d(null, this.log_prefix, 'copyFiles end', data, operation_info);
  // };
  //
  // requestAnalysis = async (operation_seq) => {
  //   log.d(null, this.log_prefix, 'requestAnalysis start', operation_seq);
  //
  //   const admin_member_info = {
  //     seq: 0,
  //     role: Role.ADMIN
  //   };
  //   const token_result = Auth.generateTokenByMemberInfo(admin_member_info);
  //   const token_info = token_result.token_info;
  //
  //   const url = `${ServiceConfig.get('forward_api_server_url')}/operations/${operation_seq}/request/analysis`;
  //   let request_result = await Util.forward(url, 'POST', token_info.token);
  //   if (typeof request_result === 'string') {
  //     request_result = JSON.parse(request_result);
  //   }
  //
  //   log.d(null, this.log_prefix, 'requestAnalysis', url, request_result);
  //   return request_result;
  // };
  //
  // onExecuteJobComplete = () => {
  //   (
  //     async () => {
  //       log.d(null, this.log_prefix, 'onExecuteJobComplete');
  //       await this.nextJob();
  //     }
  //   )();
  // };
  //
  // onExecuteError = async (sync_info, error, operation_info = null) => {
  //   log.e(null, this.log_prefix, 'onExecuteError', error, operation_info);
  //   try {
  //     const sync_model = new BatchOperationQueueModel(DBMySQL);
  //     await sync_model.onJobError(sync_info, error);
  //     if (operation_info) {
  //       const operation_model = new OperationModel(DBMySQL);
  //       await operation_model.remove(operation_info, sync_info.member_seq)
  //       await Util.deleteDirectory(operation_info.media_directory);
  //     }
  //   } catch (error) {
  //     log.e(null, this.log_prefix, 'onExecuteError update error', error);
  //   }
  // };
}

const operationScheduler = new OperationScheduler();

export default operationScheduler;
