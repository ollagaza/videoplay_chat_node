import MySQLModel from '../../mysql-model'
import Util from '../../../utils/Util'
import Constants from '../../../constants/constants'

export default class GroupDataModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'group_data'
    this.selectable_fields = ['*']
    this.log_prefix = '[GroupDataModel]'
    this.FIELD_RECENT = 'recent_list'
    this.FIELD_MOST_VIEW = 'most_view_list'
    this.FIELD_MOST_RECOMMEND = 'most_recommend_list'
    this.FIELD_MOST_COMMENT = 'most_comment_list'
    this.field_map = {
      'recent_list': true,
      'most_view_list': true,
      'most_recommend_list': true,
      'most_comment_list': true
    }
  }

  updateData = async (group_seq, data_map) => {
    if (!data_map || typeof data_map !== 'object') return 0
    const key_list = Object.keys(data_map)
    if (!key_list || !key_list.length) return 0
    const data_key_list = []
    const value_list = [group_seq]
    for (let i = 0; i < key_list.length; i++) {
      if (this.field_map[key_list[i]] === true && data_map[data_key_list[i]]) {
        data_key_list.push(key_list[i])
      }
    }
    if (data_key_list.length <= 0) return 0

    let field = '`group_seq`'
    let value = '?'
    for (let i = 0; data_key_list.length; i++) {
      field += `, ${data_key_list[i]}`
      value += ', ?'
      let data = data_map[data_key_list[i]]
      if (typeof data === 'object') data = JSON.stringify(data)
      value_list.push(data)
    }

    let sql = ''
    sql += `
      INSERT INTO ${this.table_name} ( ${field} )
      VALUES ( ${value} )
      ON DUPLICATE KEY UPDATE`
    for (let i = 0; data_key_list.length; i++) {
      sql += `
        \`${data_key_list[i]}\` = VALUES(\`${data_key_list[i]}\`),
      `
    }
    sql += `
        \`modify_date\` = current_timestamp()
    `
    const query_result = await this.database.raw(sql, value_list)
    if (!query_result || !query_result.length || !query_result[0]) {
      return false
    }
    return query_result[0].affectedRows > 0
  }
}
