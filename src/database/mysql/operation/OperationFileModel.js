import MySQLModel from '../../mysql-model'

export default class OperationFileModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'operation_file'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationFileModel]'
  }

  createOperationFile = async (operation_file_info) => {
    return this.create(operation_file_info, 'seq')
  }

  getOperationFileList = async (operation_seq) => {
    return this.find({operation_seq}, this.selectable_fields, [{ column: 'file_path', order: 'asc' }, { column: 'file_name', order: 'asc' }])
  }

  deleteFile = async (file_seq, operation_seq) => {
    return this.delete({ seq: file_seq, operation_seq})
  }

  deleteFolder = async (operation_seq, file_path) => {
    return this.database
      .from(this.table_name)
      .where('operation_seq', operation_seq)
      .where('file_path', 'LIKE', `${file_path}%`)
      .del()
  }

  moveFolder = async (operation_seq, file_path, move_path) => {
    const update_params = {
      file_path: this.database.raw('REPLACE(file_path, ?, ?)', file_path, move_path)
    }
    return this.database
      .update(update_params)
      .from(this.table_name)
      .where('operation_seq', operation_seq)
      .where('file_path', 'LIKE', `${file_path}%`)
  }
}
