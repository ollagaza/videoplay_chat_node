import scheduler from 'node-schedule'
import log from '../libs/logger'
import GroupAlarmModel from '../database/mysql/group/GroupAlarmModel'
import DBMySQL from '../database/knex-mysql'
import ServiceConfig from '../service/service-config'
import Util from '../utils/Util'

class GroupAlarmDeleteSchedulerClass {
  constructor () {
    this.current_job = null
    this.log_prefix = '[GroupAlarmDeleteSchedulerClass]'
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null')
      } else {
        this.current_job = scheduler.scheduleJob('0 45 3 * * *', this.deleteOldGroupAlarm)
        log.debug(this.log_prefix, '[startSchedule]')
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error)
    }
    this.deleteOldGroupAlarm()
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

  deleteOldGroupAlarm = () => {
    log.debug(this.log_prefix, '[deleteOldGroupAlarm]', 'start');
    (
      async () => {
        try {
          const model = new GroupAlarmModel(DBMySQL)
          const interval = Util.parseInt(ServiceConfig.get('group_alarm_delete'), 30)
          await model.deleteOLDAlarm(interval)
          log.debug(this.log_prefix, '[deleteOldGroupAlarm]', 'end');
        } catch (error) {
          log.error(this.log_prefix, '[deleteOldGroupAlarm]', error)
        }
      }
    )()
  }
}

const GroupAlarmDeleteScheduler = new GroupAlarmDeleteSchedulerClass()

export default GroupAlarmDeleteScheduler
