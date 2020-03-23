import _ from "lodash"
import Util from '../../utils/baseutil'
import StdObject from '../../wrapper/std-object'
import { OperationAnalysisModel } from '../../database/mongodb/OperationAnalysisModel'
import log from "../../libs/logger"

const OperationAnalysisClass = class {
  constructor() {
  }

  getUpdatePayload = (summary, analysis_data) => {
    const payload = {};
    if (!Util.isEmpty(summary)) {
      _.merge(payload, summary);
    }
    if (!Util.isEmpty(analysis_data)) {
      payload.analysis_data = analysis_data;
    }
    payload.modify_date = Date.now();
    return payload;
  };

  createOperationAnalysis = async (operation_info, summary, analysis_data) => {
    if (Util.isEmpty(operation_info)) {
      throw new StdObject(-1, '수술정보가 없습니다.');
    }
    if (Util.isEmpty(summary)) {
      throw new StdObject(-1, '통계 정보가 없습니다.');
    }
    if (Util.isEmpty(analysis_data)) {
      throw new StdObject(-1, '통계 상세 정보가 없습니다.');
    }

    const analysis_info = this.getUpdatePayload(summary, analysis_data);
    analysis_info.operation_seq = operation_info.seq;
    analysis_info.member_seq = operation_info.member_seq;
    analysis_info.content_id = operation_info.content_id;
    log.d(null, analysis_info, operation_info.toJSON());

    return await OperationAnalysisModel.createOperationAnalysis(analysis_info);
  };

  getOperationAnalysisById = async ( analysis_id ) => {
    return await OperationAnalysisModel.findOneById( analysis_id );
  };

  getOperationAnalysisByOperationSeq = async ( operation_seq ) => {
    return await OperationAnalysisModel.findByOperationSeq( operation_seq );
  };

  updateOperationAnalysisById = async ( analysis_id, summary, analysis_data ) => {
    const update = this.getUpdatePayload(summary, analysis_data);
    return await OperationAnalysisModel.updateOperationAnalysis( analysis_id, update );
  };

  updateOperationAnalysisOperationSeq = async ( operation_seq, summary, analysis_data ) => {
    const update = this.getUpdatePayload(summary, analysis_data);
    return await OperationAnalysisModel.updateOperationAnalysisOperationSeq( operation_seq, update );
  };

  deleteOperationAnalysisById = async ( analysis_id ) => {
    return await OperationAnalysisModel.deleteById( analysis_id );
  };

  deleteOperationAnalysisOperationSeq = async ( operation_seq ) => {
    return await OperationAnalysisModel.deleteByOperationSeq( operation_seq );
  };
};

const operation_analysis_service = new OperationAnalysisClass();

export default operation_analysis_service;
