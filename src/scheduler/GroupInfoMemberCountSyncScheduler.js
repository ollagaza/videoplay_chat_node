import scheduler from 'node-schedule'
import log from '../libs/logger'
import GroupService from "../service/group/GroupService";
import GroupChannelHomeService from "../service/group/GroupChannelHomeService";

class GroupInfoMemberCountSyncSchedulerClass {
  constructor () {
    this.current_job = null
    this.log_prefix = '[GroupInfoMemberCountSyncScheduler]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('0 10 0 * * *', this.syncGroupMemberCount)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    // this.syncGroupMemberCount()
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

  syncGroupMemberCount = () => {
    log.debug(this.log_prefix, '[GroupMemberCountSync]', 'start');
    (
      async () => {
        try {
          await GroupService.GroupMemberCountSync()
          log.debug(this.log_prefix, '[syncGroupMemberCount]', '[GroupService.GroupMemberCountSync]', 'end');
        } catch (error) {
          log.error(this.log_prefix, '[syncGroupMemberCount]', '[GroupService.GroupMemberCountSync]', error)
        }
        try {
          await GroupChannelHomeService.GroupMemberDataCounting()
          log.debug(this.log_prefix, '[syncGroupMemberCount]', '[GroupChannelHomeService.GroupMemberDataCounting]', 'end');
        } catch (error) {
          log.error(this.log_prefix, '[syncGroupMemberCount]', '[GroupChannelHomeService.GroupMemberDataCounting]', error)
        }
        log.debug(this.log_prefix, '[syncGroupMemberCount]', 'end');
      }
    )()
  }
}

const GroupInfoMemberCountSyncScheduler = new GroupInfoMemberCountSyncSchedulerClass()

export default GroupInfoMemberCountSyncScheduler
