import scheduler from 'node-schedule'
import log from '../libs/logger'
import SendMailService from "../service/etc/SendMailService";

class ReservationEmailSchedulerClass {
  constructor () {
    this.current_job = null
    this.log_prefix = '[ReservationEmailScheduler]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('0 7,17,27,37,47,57 * * * *', this.sendReservationEmail)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    // this.sendReservationEmail()
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
    log.debug(this.log_prefix, '[sendReservationEmail]', 'start');
    (
      async () => {
        try {
          await SendMailService.sendReservationEmail()
          log.debug(this.log_prefix, '[sendReservationEmail]', 'end');
        } catch (error) {
          log.error(this.log_prefix, '[sendReservationEmail]', error)
        }
      }
    )()
  }
}

const ReservationEmailScheduler = new ReservationEmailSchedulerClass()

export default ReservationEmailScheduler
