import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'

export default class GroupSurgboxModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'group_surgbox'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupSurgboxModel]'
  }

  checkDuplicate = async (group_seq, machine_id) => {
    const query_result = await this.findOne({ group_seq, machine_id }, ['COUNT(*) AS total_count'])
    return !query_result || Util.parseInt(query_result.total_count) === 0

  }

  createGroupSurgboxInfo = async (group_surgbox_info) => {
    return this.create(group_surgbox_info, 'seq')
  }

  getGroupSurgboxInfoList = async (group_seq) => {
    return this.find({ group_seq })
  }

  deleteGroupSurgboxInfo = async (seq) => {
    return this.delete({ seq })
  }

  getBoxGroupList = async (machine_id) => {
    return this.find({ machine_id }, ['group_seq'])
  }
}
