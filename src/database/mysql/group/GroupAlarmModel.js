import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'

export default class GroupAlarmModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'group_alarm'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupAlarmModel]'
  }

  createGroupAlarm = async (create_params) => {
    return this.create(create_params, 'seq')
  }

  getGroupAlarmList = async (group_seq, grade, member_seq, options) => {
    const page = options.page
    const limit = options.limit
    const order_id = options.order_id
    const order = options.order

    const select_for_list = ['seq', 'type', 'data', 'reg_date']
    select_for_list.push(this.database.raw('IF(JSON_EXTRACT(member_state, ?) = \'Y\', \'Y\', \'N\') AS is_read', [`$.m_${member_seq}.is_read`]))
    const query = this.database.select(select_for_list)
    query.where('group_seq', group_seq)
    query.where('grade', '<=', grade)
    query.where(this.database.raw('(CASE JSON_CONTAINS(member_state, json_quote(?), ?) WHEN 1 THEN 1 ELSE 0 END) = ?'), ['Y', `$.m_${member_seq}.is_delete`, 0])
    if (options) {
      if (options.interval) {
        query.andWhere(this.database.raw('date_format(date_sub(group_alarm.reg_date, interval ? day), \'%y%m%d\') <= date_format(now(), \'%y%m%d\')'), options.interval)
      }
    }
    if (!order_id) {
      query.orderBy([{ column: 'reg_date', order: 'desc' }])
    } else {
      query.orderBy([{ column: `${order_id}`, order }])
    }

    return this.queryPaginated(query, limit, page)
  }

  getNewGroupAlarmCount = async (group_seq, grade, member_seq, options) => {
    const query = this.database.select(this.database.raw('COUNT(*) AS total_count'))
    query.where('group_seq', group_seq)
    query.where('grade', '<=', grade)
    query.where(this.database.raw('(CASE JSON_CONTAINS(member_state, json_quote(?), ?) WHEN 1 THEN 1 ELSE 0 END) = ?'), ['Y', `$.m_${member_seq}.is_read`, 0])
    query.where(this.database.raw('(CASE JSON_CONTAINS(member_state, json_quote(?), ?) WHEN 1 THEN 1 ELSE 0 END) = ?'), ['Y', `$.m_${member_seq}.is_delete`, 0])
    if (options.interval) {
      query.andWhere(this.database.raw('date_format(date_sub(group_alarm.reg_date, interval ? day), \'%y%m%d\') <= date_format(now(), \'%y%m%d\')'), options.interval)
    }
    query.first()
    const query_result = await query
    if (!query_result) return 0
    return Util.parseInt(query_result.total_count, 0)
  }

  onGroupAlarmRead = async (alarm_seq, member_seq) => {
    const member_state = await this.getMemberState(alarm_seq, member_seq)
    if (!member_state) return
    const member_key = this.getMemberKey(member_seq)
    member_state[member_key].is_read = 'Y'
    await this.update({ seq: alarm_seq }, { member_state: JSON.stringify(member_state) })
  }

  onGroupAlarmDelete = async (alarm_seq, member_seq) => {
    const member_state = await this.getMemberState(alarm_seq, member_seq)
    if (!member_state) return
    const member_key = this.getMemberKey(member_seq)
    member_state[member_key].is_delete = 'Y'
    await this.update({ seq: alarm_seq }, { member_state: JSON.stringify(member_state) })
  }

  getMemberState = async (alarm_seq, member_seq) => {
    const alarm = await this.findOne({ seq: alarm_seq }, ['seq', 'member_state'])
    if (!alarm || alarm.seq) return null
    const member_state = alarm.member_state ? JSON.parse(alarm.member_state) : {}
    const member_key = this.getMemberKey(member_seq)
    if (!member_state[member_key]) {
      member_state[member_key] = {
        is_read: 'N',
        is_delete: 'N'
      }
    }
    return member_state
  }

  getMemberKey = member_seq => `m_${member_seq}`
}
