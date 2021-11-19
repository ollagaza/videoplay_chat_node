import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import DBMySQL from "../../database/knex-mysql";

import StdObject from "../../wrapper/std-object";
import ServiceConfig from "../service-config";
import CurriculumModel from "../../database/mysql/curriculum/CurriculumModel";
import CurriculumEducationModel from "../../database/mysql/curriculum/CurriculumEducationModel";
import CurriculumLogModel from "../../database/mysql/curriculum/CurriculumLogModel";
import CurriculumResultModel from "../../database/mysql/curriculum/CurriculumResultModel";

const CurriculumLogServiceClass = class {
  constructor() {
    this.log_prefix = '[CurriculumLogServiceClass]'
  }

  getCurriculumLogModel(database) {
    if (database) {
      return new CurriculumLogModel(database);
    }
    return new CurriculumLogModel(DBMySQL);
  }

  getCurriculumModel(database) {
    if (database) {
      return new CurriculumModel(database);
    }
    return new CurriculumModel(DBMySQL);
  }

  getCurriculumLog = async (database, curriculum_seq, member_seq, log_type = 1) => {
    const curriculum_log_model = this.getCurriculumLogModel();
    return await curriculum_log_model.getCurriculumLog(member_seq, curriculum_seq, log_type);
  }

  setCurriculumLog = async (database, curriculum_seq, member_seq, log_type = 1, log_data) => {
    const curriculum_log_model = this.getCurriculumLogModel();
    const log_info = await this.getCurriculumLog(database, curriculum_seq, member_seq, 1);
    const key = `education_${log_data.education_seq}`;
    const _log_data = {
      [key]: {
        total_play_time: log_data.total_play_time,
        last_current_time: log_data.last_current_time,
      }
    };
    const params = {
      member_seq,
      curriculum_seq,
      log_type,
      log_info: JSON.stringify(_log_data),
    }
    if (!log_info) {
      _log_data[key].first_play = true;
      return await curriculum_log_model.createCurriculumLog(params);
    } else {
      const _log_info = JSON.parse(log_info.log_info);
      const find_key = Object.keys(_log_info).find(item => item === key)
      if (find_key) {
        return await curriculum_log_model.updateCurriculumLog(curriculum_seq, member_seq, _log_data);
      } else {
        _log_data[key].first_play = true;
        return await curriculum_log_model.updateCurriculumLog(curriculum_seq, member_seq, _log_data);
      }
    }
    return log_info;
  }
}

const curriculum_log_service_class = new CurriculumLogServiceClass()

export default curriculum_log_service_class
