import MySQLModel from '../../mysql-model'

export default class BatchOperationQueueModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'batch_operation_queue'
    this.selectable_fields = ['*']
    this.log_prefix = '[BatchOperationQueueModel]'
  }

  verifyKey = async (member_seq, key) => {
    const count = await this.getTotalCount({"member_seq": member_seq, "key": key});
    return count <= 0;
  };

  push = async (member_seq, key, data) => {
    if (typeof data !== 'string') {
      data = JSON.stringify(data);
    }
    const create_info = {
      member_seq,
      key,
      "data": data
    };
    return await this.create(create_info, 'seq');
  };

  pop = async () => {
    const sync_info = await this.findOne({status: 'N'});
    if (sync_info && sync_info.seq > 0) {
      await this.updateStatus(sync_info, 'P');
      return sync_info;
    } else {
      return null;
    }
  };

  updateStatus = async (sync_info, status, is_complete = false, error = null) => {
    const error_str = this.getErrorString(error);
    const update_params = {
      "status": status,
      "is_complete": is_complete ? 1 : 0,
      "error": error_str,
      "modify_date": this.database.raw('NOW()')
    };
    await this.update({"seq": sync_info.seq}, update_params);
  };

  onJobStart = async (sync_info, operation_seq) => {
    const update_params = {
      "status": 'S',
      "operation_seq": operation_seq,
      "modify_date": this.database.raw('NOW()')
    };
    await this.update({"seq": sync_info.seq}, update_params);
  };

  onJobFinish = async (sync_info) => {
    const update_params = {
      "status": 'F',
      "modify_date": this.database.raw('NOW()')
    };
    await this.update({"seq": sync_info.seq}, update_params);
  };

  onJobComplete = async (operation_seq) => {
    const update_params = {
      "status": 'Y',
      "is_complete": 1,
      "modify_date": this.database.raw('NOW()')
    };
    await this.update({"operation_seq": operation_seq}, update_params);
  };

  onJobError = async (sync_info, error) => {
    const error_str = this.getErrorString(error);
    const update_params = {
      "status": 'E',
      "is_complete": 0,
      "error": error_str,
      "modify_date": this.database.raw('NOW()')
    };
    await this.update({"seq": sync_info.seq}, update_params);
  };

  onJobErrorByOperationSeq = async (operation_seq, error) => {
    const error_str = this.getErrorString(error);
    const update_params = {
      "status": 'E',
      "is_complete": 0,
      "error": error_str,
      "modify_date": this.database.raw('NOW()')
    };
    await this.update({"operation_seq": operation_seq}, update_params);
  };

  getErrorString = (error) => {
    if (!error) {
      return null;
    }
    if (typeof error !== 'string') {
      if (error.stack) {
        error = JSON.stringify(error.stack);
      } else if (error.toJSON) {
        error = JSON.stringify(error.toJSON());
      } else {
        error = JSON.stringify(error);
      }
    }
    return error;
  };
}
