import scheduler from 'node-schedule'
import log from '../libs/logger'
import GroupChannelHomeService from "../service/group/GroupChannelHomeService";
import OperationDataService from "../service/operation/OperationDataService";

class OperationDataCountingSchedulerClass {
  constructor () {
    this.current_job = null
    this.log_prefix = '[OperationDataCountingSchedulerClass]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('0 0 4 * * Sun', this.syncOperationDataCounting)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    this.syncOperationDataCounting()
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

  syncOperationDataCounting = () => {
    log.debug(this.log_prefix, '[syncOperationDataCounting]', 'start');
    (
      async () => {
        try {
          await OperationDataService.updateOperationDataCounts()
          log.debug(this.log_prefix, '[syncOperationDataCounting]', 'end');
        } catch (error) {
          log.error(this.log_prefix, '[syncOperationDataCounting]', error)
        }
      }
    )()
  }
}

const OperationDataCountingScheduler = new OperationDataCountingSchedulerClass()

export default OperationDataCountingScheduler
