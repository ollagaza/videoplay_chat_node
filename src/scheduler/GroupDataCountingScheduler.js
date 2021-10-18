import scheduler from 'node-schedule'
import log from '../libs/logger'
import GroupChannelHomeService from "../service/group/GroupChannelHomeService";

class GroupDataCountingSchedulerClass {
  constructor () {
    this.current_job = null
    this.log_prefix = '[GroupDataCountingScheduler]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('0 15 0 * * *', this.syncGroupDataCounting)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    this.syncGroupDataCounting()
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

  syncGroupDataCounting = () => {
    log.debug(this.log_prefix, '[syncGroupDataCounting]', 'start');
    (
      async () => {
        try {
          await GroupChannelHomeService.updateGroupRecommendCount()
          await GroupChannelHomeService.updateGroupCounts()
          log.debug(this.log_prefix, '[syncGroupDataCounting]', 'end');
        } catch (error) {
          log.error(this.log_prefix, '[syncGroupDataCounting]', error)
        }
      }
    )()
  }
}

const GroupDataCountingScheduler = new GroupDataCountingSchedulerClass()

export default GroupDataCountingScheduler
