import scheduler from 'node-schedule'
import log from '../libs/logger'
import SendMailService from "../service/etc/SendMailService";

class ThreeMonthsEmailDeleteSchedulerClass {
  constructor () {
    this.current_job = null
    this.log_prefix = '[ThreeMonthsEmailDeleteScheduler]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('0 35 2 * * *', this.deleteEmailBeforeThreeMonth)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    // this.deleteEmailBeforeThreeMonth()
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

  deleteEmailBeforeThreeMonth = () => {
    log.debug(this.log_prefix, '[deleteEmailBeforeThreeMonth]', 'start');
    (
      async () => {
        try {
          await SendMailService.ThreeMonthsEmailDelete()
          log.debug(this.log_prefix, '[deleteEmailBeforeThreeMonth]', 'end');
        } catch (error) {
          log.error(this.log_prefix, '[deleteEmailBeforeThreeMonth]', error)
        }
      }
    )()
  }
}

const ThreeMonthsEmailDeleteScheduler = new ThreeMonthsEmailDeleteSchedulerClass()

export default ThreeMonthsEmailDeleteScheduler
