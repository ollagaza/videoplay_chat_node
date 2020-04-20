import MongoDB from '../database/mongo-db'
import ServiceConfig from '../service/service-config'
import CodeSceneService from './code/CodeSceneService'
import NaverArchiveStorageService from './storage/naver-archive-storage-service'
import NaverObjectStorageService from './storage/naver-object-storage-service'
import SocketManager from './socket-manager'
import Util from '../utils/baseutil'

const initDirectories = async () => {
  await Util.createDirectory(ServiceConfig.get('common_root'));
  await Util.createDirectory(ServiceConfig.get('temp_directory_root'));
};

export default {
  init: async () => {
    await MongoDB.init()
    await ServiceConfig.init()
    await CodeSceneService.init()
    await initDirectories()
    await SocketManager.init()
    if (ServiceConfig.isVacs() === false) {
      await NaverArchiveStorageService.init()
      await NaverObjectStorageService.init()
    }
  }
}
