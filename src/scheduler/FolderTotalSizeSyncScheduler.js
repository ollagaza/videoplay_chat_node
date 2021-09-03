import scheduler from 'node-schedule'
import log from '../libs/logger'
import OperationFolderService from "../service/operation/OperationFolderService";
import DBMySQL from "../database/knex-mysql";
import GroupModel from '../database/mysql/group/GroupModel'
import OperationService from "../service/operation/OperationService";

class FolderTotalSizeSyncSchedulerClass {
  constructor () {
    this.current_job = null
    this.log_prefix = '[FolderTotalSizeSyncScheduler]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('0 20 0 * * *', this.syncFolderTotalSize)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    this.syncFolderTotalSize()
  }

  stopSchedule = () => {
    if (this.current_job) {
      try {
        this.current_job.cancel()
        log.debug(this.log_prefix, '[stopSchedule]')
      } catch (error) {
        log.error(this.log_prefix, '[stopSchedule]', error)
      }
    }
    this.current_job = null
  }

  syncFolderTotalSize = () => {
    log.debug(this.log_prefix, '[syncFolderTotalSize]', 'start');
    (
      async () => {
        try {
          const group_model = new GroupModel(DBMySQL)
          const group_info_list = await group_model.getAllGroupInfo()
          const operation_folder_count = await OperationService.getOperationModeCountWithFolder()
          if (group_info_list && group_info_list.length > 0) {
            for (let i = 0; i < group_info_list.length; i++) {
              await OperationFolderService.syncFolderTotalSize(group_info_list[i].seq)
            }
          }
          if (operation_folder_count.video_counts.length > 0) {
            await OperationFolderService.updateContentCounts(DBMySQL, 'video_count', operation_folder_count.video_counts)
          }
          if (operation_folder_count.file_counts.length > 0) {
            await OperationFolderService.updateContentCounts(DBMySQL, 'file_count', operation_folder_count.file_counts)
          }
          log.debug(this.log_prefix, '[syncFolderTotalSize]', 'end');
        } catch (error) {
          log.error(this.log_prefix, '[syncFolderTotalSize]', error)
        }
      }
    )()
  }
}

const FolderTotalSizeSyncScheduler = new FolderTotalSizeSyncSchedulerClass()

export default FolderTotalSizeSyncScheduler
