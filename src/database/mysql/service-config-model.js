import MySQLModel from '../mysql-model'

export default class ServiceConfigModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'service_config'
    this.selectable_fields = ['*']
    this.log_prefix = '[ServiceConfigModel]'
  }
}
