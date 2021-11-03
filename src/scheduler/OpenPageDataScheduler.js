import scheduler from 'node-schedule'
import log from '../libs/logger'
import OpenChannelManagerService from '../service/open/OpenChannelManagerService'

class OpenPageDataSchedulerClass {
  constructor () {
    this.current_job = null
    this.log_prefix = '[OpenPageDataScheduler]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('0 30 1 * * *', this.executeUpdateOpenPageData)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    this.executeUpdateOpenPageData()
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

  executeUpdateOpenPageData = () => {
    log.debug(this.log_prefix, '[executeUpdateOpenPageData]')
    OpenChannelManagerService.updateOpenPageData()
  }
}

const OpenPageDataScheduler = new OpenPageDataSchedulerClass()

export default OpenPageDataScheduler
