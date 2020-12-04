import MySQLModel from '../../mysql-model'

export default class NoticeFileModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'notice_file'
    this.selectable_fields = ['*']
    this.log_prefix = '[NoticeFileModel]'
  }

  createNoticeFile = async (notice_file_info) => {
    return this.create(notice_file_info, 'seq')
  }

  getNoticeFile = async (notice_seq, notice_file_seq) => {
    return this.findOne({ seq: notice_file_seq, notice_seq })
  }

  deleteNoticeFile = async (notice_seq, notice_file_seq) => {
    return this.delete({ seq: notice_file_seq, notice_seq })
  }

  getFileCount = async (notice_seq) => {
    const result = await this.findOne({ notice_seq }, [this.database.raw('COUNT(*) AS total_count')])
    if (result && result.total_count) {
      return result.total_count
    }
    return 0
  }

  getFileList = async (notice_seq) => {
    return this.find({ notice_seq })
  }
}
