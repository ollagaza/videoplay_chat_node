import MySQLModel from '../../mysql-model'

export default class CodeSceneModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'code_scene'
    this.selectable_fields = ['*']
    this.log_prefix = '[CodeSceneModel]'
  }
}
