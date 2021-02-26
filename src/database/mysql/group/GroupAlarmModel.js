import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'
import Constant from '../../../constants/constants'

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

  getAlarmFieldList = (member_seq) => {
    const field_list = ['seq', 'type', 'message', 'data', 'user_name', 'user_nickname', 'reg_date']
    field_list.push(this.database.raw('IF(JSON_EXTRACT(member_state, ?) = \'Y\', \'Y\', \'N\') AS is_read', [`$.m_${member_seq}.is_read`]))

    return field_list
  }

  getGroupAlarmList = async (group_seq, member_seq, grade_number, options) => {
    const page = options.page
    const limit = options.limit
    const order_id = options.order_id
    const order = options.order

    const query = this.database.select(this.getAlarmFieldList(member_seq))
      .from(this.table_name)
      .where('group_seq', group_seq)
      .where('grade', '<=', grade_number)
      .where(this.database.raw('(CASE JSON_CONTAINS(member_state, json_quote(?), ?) WHEN 1 THEN 1 ELSE 0 END) = ?', ['Y', `$.m_${member_seq}.is_delete`, 0]))
    if (options) {
      if (options.interval) {
        query.where(this.database.raw('date_format(date_sub(group_alarm.reg_date, interval ? day), \'%y%m%d\') <= date_format(now(), \'%y%m%d\')', [options.interval]))
      }
      if (options.search) {
        query.where('message', 'LIKE', `%${options.search}%`)
      }
    }
    if (!order_id) {
      query.orderBy([{ column: 'reg_date', order: 'desc' }])
    } else {
      query.orderBy([{ column: `${order_id}`, order }])
    }

    return this.queryPaginated(query, limit, page)
  }

  getNewGroupAlarmCount = async (group_seq, member_seq, grade_number, options) => {
    const query = this.getNewGroupAlarmQuery([this.database.raw('COUNT(*) AS total_count')], group_seq, member_seq, grade_number, options)
    query.first()
    const query_result = await query
    if (!query_result) return 0
    return Util.parseInt(query_result.total_count, 0)
  }

  getNewGroupAlarmList = async (group_seq, member_seq, grade_number, options) => {
    return this.getNewGroupAlarmQuery(this.getAlarmFieldList(member_seq), group_seq, member_seq, grade_number, options)
  }

  getNewGroupAlarmQuery = (select_field, group_seq, member_seq, grade_number, options) => {
    const query = this.database
      .select(select_field)
      .from(this.table_name)
      .where('group_seq', group_seq)
      .where('grade', '<=', grade_number)
      .where(this.database.raw('(CASE JSON_CONTAINS(member_state, json_quote(?), ?) WHEN 1 THEN 1 ELSE 0 END) = ?', ['Y', `$.m_${member_seq}.is_read`, 0]))
      // .where(this.database.raw('(CASE JSON_CONTAINS(member_state, json_quote(?), ?) WHEN 1 THEN 1 ELSE 0 END) = ?', ['Y', `$.m_${member_seq}.is_delete`, 0]))
    if (options.interval) {
      const recent_timestamp = Util.addDay(-(Util.parseInt(options.interval, 1)), Constant.TIMESTAMP)
      query.where(this.database.raw('group_alarm.reg_date >= ?', [recent_timestamp]))
    }

    return query
  }

  onGroupAlarmRead = async (group_seq, member_seq, grade_number, options) => {
    const member_key = this.getMemberKey(member_seq)
    const state = {}
    state[member_key] = { "is_read": "Y" }
    return this.updateMemberState(group_seq, grade_number, state, options)
  }

  onGroupAlarmDelete = async (group_seq, member_seq, grade_number, options) => {
    const member_key = this.getMemberKey(member_seq)
    const state = {}
    state[member_key] = { "is_delete": "Y" }
    return this.updateMemberState(group_seq, grade_number, state, options)
  }

  updateMemberState = async (group_seq, grade_number, state, options) => {
    const update_params = {
      member_state: this.database.raw('JSON_MERGE_PATCH(member_state, ?)', JSON.stringify(state))
    }

    const query = this.database
      .update(update_params)
      .from(this.table_name)
      .where('group_seq', group_seq)
      .where('grade', '<=', grade_number)

    if (options) {
      if (options.by_seq_list) {
        query.whereIn('seq', options.alarm_seq_list)
      } else if (options.by_min_seq) {
        query.where('seq', '>=', options.min_seq)
      } else if (options.by_seq) {
        query.where('seq', options.alarm_seq)
      }
    }
    return query
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

  deleteOLDAlarm = async (interval = 30) => {
    const recent_timestamp = Util.addDay(-(Util.parseInt(interval, 30)), Constant.TIMESTAMP)
    return this.database
      .from(this.table_name)
      .where('reg_date', '<=', recent_timestamp)
      .del()
  }

  getMemberKey = member_seq => `m_${member_seq}`
}
