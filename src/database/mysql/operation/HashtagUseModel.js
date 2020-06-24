import MySQLModel from '../../mysql-model'
import log from '../../../libs/logger'

export default class HashtagUseModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'hashtag_use'
    this.selectable_fields = ['*']
    this.log_prefix = '[HashtagUseModel]'
    this.TYPE_OPERATION_DATA = 'O'
  }

  getTargetType = (type = null) => {
    if (!type) {
      return this.TYPE_OPERATION_DATA
    }
    return this.TYPE_OPERATION_DATA
  }

  deleteUnUseTagList = async (tag_list, seq, type = null) => {
    const query = this.database
      .from(this.table_name)
      .whereNotIn('hashtag_seq', tag_list)
      .andWhere('target_seq', seq)
      .andWhere('target_type', this.getTargetType(type))
      .del()
    await query
  }

  updateHashtagUseOne = async (group_seq, tag_seq, seq, type = null) => {
    const target_type = this.getTargetType(type)
    const sql = `
      INSERT INTO ${this.table_name} (\`hashtag_seq\`, \`target_seq\`, \`target_type\`, \`group_seq\`)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`modify_date\` = current_timestamp()
    `
    const query_result = await this.database.raw(sql, [tag_seq, seq, target_type, group_seq])
    if (!query_result || !query_result.length || !query_result[0]) {
      return false
    }
    return query_result[0].affectedRows > 0
  }

  updateHashtagUseList = async (group_seq, tag_seq_list, seq, type = null) => {
    const target_type = this.getTargetType(type)
    const values = []
    let sql = `
      INSERT INTO ${this.table_name} (\`hashtag_seq\`, \`target_seq\`, \`target_type\`, \`group_seq\`)
      VALUES `
    for (let i = 0; i < tag_seq_list.length; i++) {
      if (i !== 0) {
        sql += ', '
      }
      sql += '(?, ?, ?, ?)'
      values.push(tag_seq_list[i])
      values.push(seq)
      values.push(target_type)
      values.push(group_seq)
    }
    sql += `
      ON DUPLICATE KEY UPDATE
        \`modify_date\` = current_timestamp()
    `
    const query_result = await this.database.raw(sql, values)
    if (!query_result || !query_result.length || !query_result[0]) {
      return false
    }
    return query_result[0].affectedRows > 0
  }

  updateHashtagCount = async (tag_seq_list) => {
    const sql = `
      update hashtag,
        (
          select hashtag_seq, count(*) as cnt
          from hashtag_use
          where hashtag_seq in (${tag_seq_list.join(', ')})
          group by hashtag_seq
        ) as u
      set hashtag.use_count = u.cnt
      where hashtag.seq = u.hashtag_seq
    `
    const query_result = await this.database.raw(sql)
    if (!query_result || !query_result.length || !query_result[0]) {
      return false
    }
    return query_result[0].affectedRows > 0
  }

  updateHashtagCountAll = async () => {
    const sql = `
      update hashtag,
        (
          select hashtag_seq, count(*) as cnt
          from hashtag_use
          group by hashtag_seq
        ) as u
      set hashtag.use_count = u.cnt
      where hashtag.seq = u.hashtag_seq
    `
    const query_result = await this.database.raw(sql)
    if (!query_result || !query_result.length || !query_result[0]) {
      return false
    }
    log.debug(this.log_prefix, '[updateHashtagCountAll]', query_result[0])
    return query_result[0].affectedRows > 0
  }


  getGroupHashtagCount = async (group_seq, limit = 10, type = null) => {
    const target_type = this.getTargetType(type)
    const query = this.database
      .select('hashtag.hashtag as tag_name', 'hashtag.seq as tag_seq', this.database.raw('count(*) as cnt'))
      .from('hashtag_use')
      .innerJoin('hashtag', { "hashtag.seq": "hashtag_use.hashtag_seq" })
      .where('hashtag_use.group_seq', group_seq)
      .andWhere('hashtag_use.target_type', target_type)
      .groupBy('hashtag.seq')
      .orderBy("cnt", "DESC")
    if (limit) {
      query.limit(limit)
    }

    const query_result = await query
    if (!query_result || !query_result.length || !query_result[0]) {
      return false
    }
    log.debug(this.log_prefix, '[]', query_result)
    return query_result
  }
}
