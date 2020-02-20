import ServiceConfig from '../../../service/service-config';
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import OperationMediaInfo from '../../../wrapper/operation/OperationMediaInfo';
import SmilInfo from '../../../wrapper/xml/SmilInfo';

export default class OperationMediaModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'operation_media'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationMediaModel]'
  }

  getOperationMediaInfo = async (operation_info) => {
    const media_info = new OperationMediaInfo(await this.findOne({operation_seq: operation_info.seq}));
    if (!media_info.isEmpty()) {
      media_info.setUrl(operation_info);
    }
    return media_info;
  };

  createOperationMediaInfo = async (operation_info) => {
    const create_params = {
      operation_seq: operation_info.seq
    };
    return await this.create(create_params, 'seq');
  };

  updateTransComplete = async (operation_seq, update_params) => {
    return await this.update({ operation_seq }, update_params);
  };

  reSetOperationMedia = async (operation_info) => {
    const update_params = {
      "video_file_name": null,
      "proxy_file_name": null,
      "fps": 0,
      "width": 0,
      "height": 0,
      "total_time": 0,
      "total_frame": 0,
      "smil_file_name": null,
      "is_trans_complete": 0,
      "thumbnail": null,
      "modify_date": this.database.raw('NOW()')
    };
    return await this.update({operation_seq: operation_info.seq}, update_params);
  }
}
