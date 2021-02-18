import log from '../libs/logger'
import FolderTotalSizeSyncScheduler from "../scheduler/FolderTotalSizeSyncScheduler";
import ReservationEmailScheduler from "../scheduler/ReservationEmailScheduler";
import ThreeMonthsEmailDeleteScheduler from "../scheduler/ThreeMonthsEmailDeleteScheduler";
import GroupDataCountingScheduler from "../scheduler/GroupDataCountingScheduler";
import GroupInfoMemberCountSyncScheduler from "../scheduler/GroupInfoMemberCountSyncScheduler";
import GroupMemberPuaseResetScheduler from "../scheduler/GroupMemberPuaseResetScheduler";

const SchedulerManagerClass = class {
  constructor() {
    this.log_prefix = '[SchedulerManagerClass]'
  }

  init = () => {
    log.debug(this.log_prefix, process.env.SERVER_MODE)
    if (process.env.SERVER_MODE !== 'demon') {
      FolderTotalSizeSyncScheduler.startSchedule()
      ReservationEmailScheduler.startSchedule()
      ThreeMonthsEmailDeleteScheduler.startSchedule()
      GroupDataCountingScheduler.startSchedule()
      GroupInfoMemberCountSyncScheduler.startSchedule()
      GroupMemberPuaseResetScheduler.startSchedule()
    }
  }
}

const scheduler_manager = new SchedulerManagerClass()

export default scheduler_manager
