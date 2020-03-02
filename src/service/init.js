import MongoDB from '../database/mongo-db'
import ServiceConfig from '../service/service-config'
import CodeSceneService from './code/CodeSceneService'
import SocketManager from './socket-manager'
import BaseUtil from '../utils/baseutil'

const initDirectorys = async () => {
  const upload_full_path = ServiceConfig.get('common_root');
  if (!(await BaseUtil.fileExists(upload_full_path))) {
    await BaseUtil.createDirectory(upload_full_path);
  }
};

export default {
  init: async () => {
    await MongoDB.init()
    await ServiceConfig.init()
    await CodeSceneService.init()
    await initDirectorys()
    // await SocketManager.init()
  }
}
