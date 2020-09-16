import DBMySQL from '../../database/knex-mysql'
import CodeSceneModel from '../../database/mysql/code/CodeSceneModel'

const CodeSceneClass = class {
  constructor () {
    this.log_prefix = '[CodeSceneClass]'
    this.is_load_complete = false
    this.code_list = []
    this.code_map = {}
  }

  init = async () => {
    const code_scene_model = new CodeSceneModel(DBMySQL)
    const result_list = await code_scene_model.find()
    if (result_list && result_list.length) {
      for (let i = 0; i < result_list.length; i++) {
        const code_info = result_list[i]
        this.code_list.push(code_info)
        this.code_map[code_info.code] = code_info
      }
    }
    this.is_load_complete = true
  }

  isLoadComplete = () => this.is_load_complete
  getCodeList = () => this.code_list
  getCodeMap = () => this.code_map
  getCodeInfo = (code) => this.code_map[code]
  hasCode = (code) => this.code_map[code] !== null
}

const code_scene = new CodeSceneClass()
export default code_scene
