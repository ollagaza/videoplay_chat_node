import scheduler from 'node-schedule';
import log from "../libs/logger";
import VacsService from '../service/vacs/VacsService'

class VacsScheduler {
  constructor() {
    this.current_job = null;
    this.log_prefix = '[VacsScheduler]';
  }

  startSchedule = () => {
    try {
      if (this.current_job) {
        log.debug(this.log_prefix, '[startSchedule] cancel. current_job is not null');
      } else {
        this.current_job = scheduler.scheduleJob('0 0,10,20,30,40,50 * * * *', this.executeUpdateStorageInfo);
        log.debug(this.log_prefix, '[startSchedule]');
      }
    } catch (error) {
      log.error(this.log_prefix, '[startSchedule]', error);
    }
    this.executeUpdateStorageInfo()
  };

  stopSchedule = () => {
    if (this.current_job) {
      try {
        this.current_job.cancel();
        log.debug(this.log_prefix, '[stopSchedule]');
      } catch (error) {
        log.error(this.log_prefix, '[stopSchedule]', error);
      }
    }
    this.current_job = null;
  };

  executeUpdateStorageInfo = () => {
    log.debug(this.log_prefix, '[executeUpdateStorageInfo]');
    VacsService.updateStorageInfo()
  };
}

const vacs_scheduler = new VacsScheduler();

export default vacs_scheduler;
