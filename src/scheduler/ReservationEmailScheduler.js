import scheduler from 'node-schedule'
import log from '../libs/logger'
import SendMailService from "../service/etc/SendMailService";

class ReservationEmailScheduler {
  constructor () {
    this.current_job = null
    this.log_prefix = '[VacsScheduler]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('0 0,10,20,30,40,50 * * * *', this.sendReservationEmail)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    this.sendReservationEmail()
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

  sendReservationEmail = () => {
    log.debug(this.log_prefix, '[sendReservationEmail]')
    SendMailService.sendReservationEmail()
  }
}

const reservation_Email_scheduler = new ReservationEmailScheduler()

export default reservation_Email_scheduler
