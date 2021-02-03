import scheduler from 'node-schedule'
import log from '../libs/logger'
import GroupService from "../service/group/GroupService";

class GroupInfoMemberCountSyncScheduler {
  constructor () {
    this.current_job = null
    this.log_prefix = '[GroupInfoMemberCountSyncScheduler]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('* 0 0 * * *', this.GroupMemberCountSync)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    this.GroupMemberCountSync()
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

  GroupMemberCountSync = () => {
    log.debug(this.log_prefix, '[GroupInfoMemberCountSyncScheduler]')
    GroupService.GroupMemberCountSync()
  }
}

const group_info_member_count_scheduler = new GroupInfoMemberCountSyncScheduler()

export default group_info_member_count_scheduler