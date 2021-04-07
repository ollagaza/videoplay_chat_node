import Util from '../utils/Util'
import log from '../libs/logger'
import MongoDB from '../database/mongo-db'
import ServiceConfig from "./service-config";
import NaverArchiveStorageService from './storage/naver-archive-storage-service'
import NaverObjectStorageService from './storage/naver-object-storage-service'
import SocketManager from './socket-manager'
import VacsScheduler from '../scheduler/VacsScheduler'
import MongoDataService from './common/MongoDataService'
import SchedulerManager from './scheduler-manager'
import Member from "./member_list";

const initDirectories = async () => {
  await Util.createDirectory(ServiceConfig.get('common_root'))
  await Util.createDirectory(ServiceConfig.get('temp_directory_root'))
}

export default {
  init: async () => {
    log.debug('[InitService]', 'init start')
    await MongoDB.init()
    await MongoDB.defaultMongoCollections()
    await ServiceConfig.init()
    await Member.init()
    await initDirectories()
    await SocketManager.init()
    await MongoDataService.init()
    SchedulerManager.init()
    if (ServiceConfig.isVacs() === false) {
      await NaverArchiveStorageService.init()
      await NaverObjectStorageService.init()
    } else {
      VacsScheduler.startSchedule()
    }
    log.debug('[InitService]', 'init complete')
  }
}
