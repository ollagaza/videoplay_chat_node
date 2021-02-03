import scheduler from 'node-schedule'
import log from '../libs/logger'
import GroupService from '../service/group/GroupService'

class GroupMemberPuaseReset {
  constructor () {
    this.current_job = null
    this.log_prefix = '[GroupMemberPuaseReset]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('0 0 * * * *', this.GroupDataCounting)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    this.GroupDataCounting()
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

  GroupDataCounting = () => {
    GroupService.setMemberPauseReset();
  }
}

const group_member_pause_reset = new GroupMemberPuaseReset()

export default group_member_pause_reset
