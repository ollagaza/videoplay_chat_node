import scheduler from 'node-schedule'
import log from '../libs/logger'
import OperationFolderService from "../service/operation/OperationFolderService";
import DBMySQL from "../database/knex-mysql";

class FolderTotalSizeSyncScheduler {
  constructor () {
    this.current_job = null
    this.log_prefix = '[FolderTotalSizeSyncScheduler]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('* 0 0 * * *', this.FolderTotalSizeSync)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    // this.FolderTotalSizeSync()
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

  FolderTotalSizeSync = () => {
    log.debug(this.log_prefix, '[FolderTotalSizeSyncScheduler]')
    OperationFolderService.SyncFolderTotalSize(DBMySQL)
  }
}

const folder_total_size_sync_scheduler = new FolderTotalSizeSyncScheduler()

export default folder_total_size_sync_scheduler
