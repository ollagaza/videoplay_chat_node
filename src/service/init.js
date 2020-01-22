import MongoDB from '../database/mongo-db'
import ServiceConfig from '../service/service-config'
import CodeSceneService from './code/CodeSceneService'
import SocketManager from './socket-manager'

export default {
  init: async () => {
    await MongoDB.init()
    await ServiceConfig.init()
    await CodeSceneService.init()
    await SocketManager.init()
  }
}
