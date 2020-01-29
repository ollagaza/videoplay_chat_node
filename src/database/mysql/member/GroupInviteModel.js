import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import GroupInviteInfo from '../../../wrapper/member/GroupInviteInfo'

export default class GroupInviteModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'group_invite'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupInviteModel]'
  }

  getParams = (group_invite_info, is_set_modify_date = true, ignore_empty = true) => {
    if (!(group_invite_info instanceof GroupInviteInfo)) {
      group_invite_info = new GroupInviteInfo(group_invite_info)
    }
    group_invite_info.setIgnoreEmpty(ignore_empty)
    const params = group_invite_info.toJSON()
    if (Util.isNumber(params.confirm_date)) {
      params.confirm_date = this.database.raw(`FROM_UNIXTIME(${params.confirm_date})`)
    }
    if (is_set_modify_date) {
      params.modify_date = this.database.raw('NOW()')
    }
  }

  createGroupInvite = async (group_invite_info) => {
    const create_params = this.getParams(group_invite_info)
    const invite_seq = this.create(create_params, 'seq')
    group_invite_info.seq = invite_seq
    if (!(group_invite_info instanceof GroupInviteInfo)) {
      return new GroupInviteInfo(group_invite_info)
    }
    group_invite_info.addKey('seq')
    return group_invite_info
  }
}
