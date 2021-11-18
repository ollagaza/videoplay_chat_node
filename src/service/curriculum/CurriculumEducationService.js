import _ from 'lodash'
import Util from '../../utils/Util'
import log from '../../libs/logger'
import DBMySQL from "../../database/knex-mysql";
import CurriculumEducationModel from "../../database/mysql/curriculum/CurriculumEducationModel";
import OperationMediaModel from "../../database/mysql/operation/OperationMediaModel";
import OperationModel from "../../database/mysql/operation/OperationModel";
import data from "../../routes/v1/data";
import {request} from "express";

const CurriculumEducationServiceClass = class {
  constructor() {
    this.log_prefix = '[CurriculumEducationServiceClass]'
  }

  getCurriculumEducationModel(database) {
    if (database) {
      return new CurriculumEducationModel(database);
    }
    return new CurriculumEducationModel(DBMySQL);
  }

  getOperationMediaModel(database) {
    if (database) {
      return new OperationMediaModel(database);
    }
    return new OperationMediaModel(DBMySQL);
  }

  getOperationModel = (database = null) => {
    if (database) {
      return new OperationModel(database)
    }
    return new OperationModel(DBMySQL)
  }

  getCurriculumEducation = async (database, education_seq) => {
    const edu_model = this.getCurriculumEducationModel(database)
    return edu_model.getCurriculumEducation(education_seq)
  }

  getCurriculumEducationList = async (database, curriculum_seq) => {
    const edu_model = this.getCurriculumEducationModel(database)
    return edu_model.getCurriculumEducationList(curriculum_seq)
  }

  getCurriculumEducationDetail = async (database, curriculum_seq, education_seq) => {
    const edu_model = this.getCurriculumEducationModel(database);
    const operation_model = this.getOperationModel(database);
    const education_list = await edu_model.getCurriculumEducationList(curriculum_seq);
    const education_info = await education_list.find(item => item.seq === Number(education_seq));
    if (education_info) {
      const operation_info = await operation_model.getOperationInfo(education_info.operation_seq, true);
      operation_info.media_info.setUrl(operation_info, education_info.start_time, education_info.end_time);
      return { list: education_list, target_stream: operation_info };
    } else {
      return {};
    }
  }

  addCurriculumEducation = async (database, request) => {
    const edu_model = this.getCurriculumEducationModel(database);
    const edu_list = await edu_model.getCurriculumEducationLastSort(request.curriculum_seq);
    if (edu_list) {
      request.sort = Number(edu_list.sort) + 1;
    }
    return await edu_model.addCurriculumEducation(request);
  }

  setCurriculumEducation = async (database, education_seq, request) => {
    const edu_model = this.getCurriculumEducationModel(database);
    return await edu_model.setCurriculumEducation(education_seq, request);
  }

  deleteCurriculumEducation = async (database, curriculum_seq, education_seq) => {
    const edu_model = this.getCurriculumEducationModel(database);
    if (await edu_model.deleteCurriculumEducation(education_seq)) {
      const edu_list = await edu_model.getCurriculumEducationList(curriculum_seq);
      for (let i = 1; i <= edu_list.length; i++) {
        if (i !== edu_list[i-1].sort) {
          await edu_model.updateCurriculumSort(edu_list[i-1].seq, i);
        }
      }
      return true;
    } else {
      return false;
    }
  }

  swapCurriculumEducationSort = async (database, curriculum_seq, current_seq, target_seq) => {
    const edu_model = this.getCurriculumEducationModel(database);
    const edu_list = await edu_model.getCurriculumEducationList(curriculum_seq);
    const current_info = await edu_list.find(item => Number(item.seq) === Number(current_seq));
    const target_info = await edu_list.find(item => Number(item.seq) === Number(target_seq));
    if (current_info && target_info) {
      const result_1 = await edu_model.updateCurriculumSort(Number(current_seq), target_info.sort);
      const result_2 = await edu_model.updateCurriculumSort(Number(target_seq), current_info.sort);
      if (result_1 && result_2) {
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }
}

const curriculum_education_service = new CurriculumEducationServiceClass()

export default curriculum_education_service
