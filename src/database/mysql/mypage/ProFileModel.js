import _ from 'lodash';
import ServiceConfig from '../../../service/service-config';
import Constants from '../../../constants/constants'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import StdObject from '../../../wrapper/std-object'
import log from "../../../libs/logger";

export default class ProFileModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'group_info'
    this.selectable_fields = ['seq', 'profile_image_path', 'member_seq', 'profile', 'is_channel', 'is_mentoring']
    this.log_prefix = '[ProFileModel]'
  }

  getProFileInfo = async group_seq => {
    return this.findOne({ seq: group_seq }, this.selectable_fields);
  };

  updateProFileInfo = async (group_seq, upload_type, input_data) => {
    return this.database.raw(`update group_info set profile = json_replace(profile, '$.${upload_type}', ?)`, input_data);
  }

  updateChannelFlag = async (group_seq, param) => {
    return this.update({ seq: group_seq }, { is_channel: param });
  }

  updateMentoFlag = async (group_seq, param) => {
    return this.update({ seq: group_seq }, { is_mentoring: param });
  }
}
