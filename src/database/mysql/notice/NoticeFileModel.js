import MySQLModel from '../../mysql-model'

export default class NoticeFileModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'notice_file'
    this.selectable_fields = ['*']
    this.log_prefix = '[NoticeFileModel]'
  }

  createNoticeFile = async (notice_file_info) => {
    notice_file_info.setIgnoreEmpty(true)
    const create_params = notice_file_info.toJSON()
    return this.create(create_params, 'seq')
  }

  deleteNoticeFile = async (file_seq) => {
    return this.delete({ seq: file_seq })
  }

  getFileCount = async (notice_seq) => {
    const result = this.findOne({ notice_seq }, [this.database.raw('COUNT(*) AS total_count')])
    if (result && result.total_count) {
      return result.total_count
    }
    return 0
  }
}
