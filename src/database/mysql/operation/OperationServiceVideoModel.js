import MySQLModel from '../../mysql-model'

export default class OperationServiceVideoModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'operation_service_video'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationServiceVideoModel]'
  }

  createServiceVideo = async (operation_info, sub_content_id) => {
    const create_info = {
      operation_seq: operation_info.seq,
      sub_content_id: sub_content_id
    };
    return await this.create(create_info, 'seq');
  };
}
