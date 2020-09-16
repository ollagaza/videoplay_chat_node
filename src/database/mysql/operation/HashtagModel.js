import MySQLModel from '../../mysql-model'

export default class HashtagModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'hashtag'
    this.selectable_fields = ['*']
    this.log_prefix = '[HashtagModel]'
  }

  createHashtag = async (tag) => {
    const sql = `
      INSERT INTO ${this.table_name} (\`hashtag\`)
      VALUES (?)
      ON DUPLICATE KEY UPDATE
        \`modify_date\` = current_timestamp()
    `
    const query_result = await this.database.raw(sql, [tag])

    if (!query_result || !query_result.length || !query_result[0]) {
      return false
    }
    return query_result[0].insertId
  }

  createHashtagList = async (tag_list) => {
    const result_list = []
    for (let i = 0; i < tag_list.length; i++) {
      const create_result = await this.createHashtag(tag_list[i])
      result_list.push(create_result)
    }
    return result_list
  }

  getSearchHashtag = async (sSearch) => {
    try {
      const query = this.database
        .select('*')
        .from('hashtag')
        .where('hashtag.hashtag', 'like', `%${sSearch}%`)
      return query
    } catch (e) {
      throw e
    }
  }
}
