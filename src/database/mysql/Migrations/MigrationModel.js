import MySQLModel from '../../mysql-model'

export default class MigrationModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.log_prefix = '[MigrationModel]'
  }

  createGroupCounts = async () => {
    try {
      return this.database.raw('INSERT INTO group_counts (group_seq)\n' +
        'SELECT seq FROM group_info\n' +
        'WHERE seq NOT IN (SELECT group_seq FROM group_counts)')
    } catch (e) {
      throw e
    }
  }

  createContentCounts = async () => {
    try {
      return this.database.raw('INSERT INTO content_counts (group_seq)\n' +
        'SELECT seq FROM group_info\n' +
        'WHERE seq NOT IN (SELECT group_seq FROM content_counts)')
    } catch (e) {
      throw e
    }
  }
}

