import scheduler from 'node-schedule'
import log from '../libs/logger'
import GroupService from '../service/group/GroupService'

class GroupMemberPauseResetSchedulerClass {
  constructor () {
    this.current_job = null
    this.log_prefix = '[GroupMemberPauseResetScheduler]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('* 0 0,1 * * *', this.resetGroupMemberPause)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    this.resetGroupMemberPause()
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

  resetGroupMemberPause = () => {
    log.debug(this.log_prefix, '[resetGroupMemberPause]', 'start');
    (
      async () => {
        try {
          await GroupService.setMemberPauseReset()
          log.debug(this.log_prefix, '[resetGroupMemberPause]', 'end');
        } catch (error) {
          log.error(this.log_prefix, '[resetGroupMemberPause]', error)
        }
      }
    )()
  }
}

const GroupMemberPauseResetScheduler = new GroupMemberPauseResetSchedulerClass()

export default GroupMemberPauseResetScheduler
