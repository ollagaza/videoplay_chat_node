import MySQLModel from '../../mysql-model'
import StdObject from '../../../wrapper/std-object'

export default class GroupMessageModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'group_message'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupMessageModel]'
  }

  getGroupMessageOne = async (group_seq, message_seq) => {
    return await this.findOne({ message_seq, group_seq })
  }

  getGroupMessageList = async (group_seq, paging = {}, order = null) => {
    return await this.findPaginated({ group_seq }, null, order, null, paging)
  }

  sendMessage = async (message_info) => {
    return this.create(message_info, 'seq')
  }

  delMessage = async (message_seq) => {
    return this.update({ seq: message_seq }, { is_del: 1 })
  }

}
