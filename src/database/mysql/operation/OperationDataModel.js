import MySQLModel from '../../mysql-model'

export default class OperationDataModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'operation_data'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationDataModel]'
  }

  createOperationData = async (operation_data) => {
    operation_data.modify_date = this.database.raw('NOW()')
    return await this.create(operation_data, 'seq')
  }
}
