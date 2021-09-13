import MySQLModel from '../../../mysql-model'

export default class OpenChannelModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = null
    this.selectable_fields = ['*']
    this.log_prefix = '[OpenChannelModel]'
  }

  getOpenChannelInfo = async (group_seq) => {

  }
}
