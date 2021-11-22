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
        duration: log_data.duration,
      }
    };
    if (log_data.play_ended) {
      _log_data[key].ended = true;
    }
    if (!log_info) {
      _log_data[key].first_play = true;
      const params = {
        member_seq,
        curriculum_seq,
        log_type,
        total_play_time: log_data.total_play_time,
        log_info: JSON.stringify(_log_data),
      }
      return await curriculum_log_model.createCurriculumLog(params);
    } else {
      const _log_info = JSON.parse(log_info.log_info);
      const find_key = Object.keys(_log_info).find(item => item === key)
      let all_total_time = 0;
      for (const obj_key in _log_info) {
        if (find_key && find_key === obj_key) continue;
        all_total_time += _log_info[obj_key].total_play_time;
      }
      if (find_key) {
        if (_log_info[find_key].first_play && log_data.play_ended) {
          _log_data[key].first_play = false;
          all_total_time += _log_data[key].total_play_time;
        } else if (!_log_info[find_key].first_play) {
          delete _log_data[key].total_play_time;
          all_total_time += _log_info[find_key].total_play_time;
        } else {
          all_total_time += _log_data[key].total_play_time;
        }
      } else {
        _log_data[key].first_play = true;
        all_total_time += _log_data[key].total_play_time;
      }
      return await curriculum_log_model.updateCurriculumLog(curriculum_seq, member_seq, all_total_time, _log_data);
    }
  }
}

const curriculum_log_service_class = new CurriculumLogServiceClass()

export default curriculum_log_service_class
