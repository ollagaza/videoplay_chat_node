import MySQLModel from '../../mysql-model'

export default class OpenChannelCategoryModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'open_channel_category'
    this.selectable_fields = ['*']
    this.log_prefix = '[OpenChannelModel]'
  }  
}
