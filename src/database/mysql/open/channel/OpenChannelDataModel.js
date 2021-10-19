import MySQLModel from '../../../mysql-model'

export default class OpenChannelDataModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'open_channel_data'
    this.selectable_fields = ['*']
    this.log_prefix = '[OpenChannelDataModel]'
    this.FIELD_COUNT_VIEW = 'view_count'
    this.FIELD_COUNT_COMMENT = 'comment_count'
    this.FIELD_COUNT_RECOMMEND = 'recommend_count'
    this.FIELD_LIST_RECENT = 'recent_list'
    this.FIELD_LIST_MOST_VIEW = 'most_view_list'
    this.FIELD_LIST_MOST_RECOMMEND = 'most_recommend_list'
    this.FIELD_LIST_MOST_COMMENT = 'most_comment_list'
    this.field_map = {
      'view_count': true,
      'comment_count': true,
      'recommend_count': true,
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
      const key = key_list[i]
      if (this.field_map[key] === true && data_map[key]) {
        data_key_list.push(key)
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
