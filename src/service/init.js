import MongoDB from '../database/mongo-db'
import ServiceConfig from '../service/service-config'
import NaverArchiveStorageService from './storage/naver-archive-storage-service'
import NaverObjectStorageService from './storage/naver-object-storage-service'
import SocketManager from './socket-manager'
import VacsScheduler from '../scheduler/VacsScheduler'
import ReservationEmailScheduler from "../scheduler/ReservationEmailScheduler";
import ThreeMonthsEmailDeleteScheduler from "../scheduler/ThreeMonthsEmailDeleteScheduler";
import MongoDataService from './common/MongoDataService'
import Util from '../utils/baseutil'
import log from '../libs/logger'

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
    await initDirectories()
    await SocketManager.init()
    await MongoDataService.init()
    if (ServiceConfig.isVacs() === false) {
      await NaverArchiveStorageService.init()
      await NaverObjectStorageService.init()
      ReservationEmailScheduler.startSchedule()
      ThreeMonthsEmailDeleteScheduler.startSchedule()
    } else {
      VacsScheduler.startSchedule()
    }
    log.debug('[InitService]', 'init complete')
  }
}
