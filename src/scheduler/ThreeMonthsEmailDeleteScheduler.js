import scheduler from 'node-schedule'
import log from '../libs/logger'
import SendMailService from "../service/etc/SendMailService";

class ThreeMonthsEmailDeleteScheduler {
  constructor () {
    this.current_job = null
    this.log_prefix = '[ThreeMonthsEmailDeleteScheduler]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('0 0,10,20,30,40,50 * * * *', this.ThreeMonthsEmailDelete)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    this.ThreeMonthsEmailDelete()
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

  ThreeMonthsEmailDelete = () => {
    log.debug(this.log_prefix, '[ThreeMonthsEmailDeleteScheduler]')
    SendMailService.ThreeMonthsEmailDelete()
  }
}

const threeMonths_email_delete_scheduler = new ThreeMonthsEmailDeleteScheduler()

export default threeMonths_email_delete_scheduler
