import MongoDB from '../database/mongo-db'
import ServiceConfig from '../service/service-config'
import CodeSceneService from './code/CodeSceneService'
import SocketManager from './socket_manager'

const init = async () => {
  await MongoDB.init()
  await ServiceConfig.init()
  await CodeSceneService.init()
  await SocketManager.init()
}

export default {
  init
}
