import log from '../libs/logger'
import config from '../config/config'
import FolderTotalSizeSyncScheduler from "../scheduler/FolderTotalSizeSyncScheduler"
import ReservationEmailScheduler from "../scheduler/ReservationEmailScheduler"
import ThreeMonthsEmailDeleteScheduler from "../scheduler/ThreeMonthsEmailDeleteScheduler"
import GroupDataCountingScheduler from "../scheduler/GroupDataCountingScheduler"
import GroupInfoMemberCountSyncScheduler from "../scheduler/GroupInfoMemberCountSyncScheduler"
import GroupMemberPauseResetScheduler from "../scheduler/GroupMemberPauseResetScheduler"
import GroupAlarmDeleteScheduler from '../scheduler/GroupAlarmDeleteScheduler'
import OperationDataCountingScheduler from "../scheduler/OperationDataCountingScheduler"
import OpenPageDataScheduler from '../scheduler/OpenPageDataScheduler'

const SchedulerManagerClass = class {
  constructor() {
    this.log_prefix = '[SchedulerManagerClass]'
  }

  init = () => {
    log.debug(this.log_prefix, process.env.SERVER_MODE)
    if (config.isDemon()) {
      FolderTotalSizeSyncScheduler.startSchedule()
      ReservationEmailScheduler.startSchedule()
      ThreeMonthsEmailDeleteScheduler.startSchedule()
      GroupInfoMemberCountSyncScheduler.startSchedule()
      GroupMemberPauseResetScheduler.startSchedule()
      GroupAlarmDeleteScheduler.startSchedule()
      OperationDataCountingScheduler.startSchedule()
      GroupDataCountingScheduler.startSchedule()
    }
    OpenPageDataScheduler.startSchedule()
  }
}

const SchedulerManager = new SchedulerManagerClass()

export default SchedulerManager
