import ServiceConfig from '../../../service/service-config';
import Constants from '../../../constants/constants'
import Role from '../../../constants/roles'
import MySQLModel from '../../mysql-model'
import Util from '../../../utils/baseutil'
import StdObject from '../../../wrapper/std-object'
import log from '../../../libs/logger'

import OperationMediaModel from './OperationMediaModel';
import OperationInfo from '../../../wrapper/operation/OperationInfo';
import MemberModel from '../member/MemberModel';

const join_select = [
  'operation.*', 'member.user_name', 'operation_storage.seq as storage_seq',
  'operation_storage.total_file_size', 'operation_storage.total_file_count', 'operation_storage.clip_count',
  'operation_storage.index2_file_count', 'operation_storage.origin_video_count', 'operation_storage.trans_video_count'
];

export default class OperationModel extends MySQLModel {
  constructor(database) {
    super(database)

    this.table_name = 'operation'
    this.selectable_fields = ['*']
    this.log_prefix = '[OperationModel]'
  }

  getOperation = async (where, import_media_info) => {
    const query = this.database.select(join_select);
    query.from('operation');
    query.innerJoin("member", "member.seq", "operation.member_seq");
    query.leftOuterJoin("operation_storage", "operation_storage.operation_seq", "operation.seq");
    query.where(where);
    query.first();

    const query_result = await query;

    return await this.getOperationInfoWithMediaInfo(query_result, import_media_info);
  };

  getOperationInfo = async (operation_seq) => {
    const where = {"operation.seq": operation_seq};
    return await this.getOperation(where, true);
  };

  getOperationInfoListPage = async (group_seq, page_params = {}, filter_params = {}, asc=false)  => {
    const page = page_params.page | 1;
    const list_count = page_params.list_count | 20;
    const page_count = page_params.page_count | 10;

    const query = this.database.select(join_select);
    query.from('operation');
    query.innerJoin("member", "member.seq", "operation.member_seq");
    query.leftOuterJoin("operation_storage", "operation_storage.operation_seq", "operation.seq");
    query.andWhere('group_seq', group_seq);
    query.whereIn('status', ['Y', 'T']);
    if (filter_params.analysis_complete) {
      query.andWhere('is_analysis_complete', Util.isTrue(filter_params.analysis_complete) ? 1 : 0);
    }
    if (filter_params.status) {
      query.andWhere('status', filter_params.status.toUpperCase());
    }

    const order_by = {name:'seq', direction: 'DESC'};
    if (asc) {
      order_by.direction = 'ASC';
    }
    query.orderBy(order_by.name, order_by.direction);

    const paging_result = await this.queryPaginated(query, list_count, page, page_count, page_params.no_paging);

    const result = [];

    if (paging_result && paging_result.data) {
      for (const key in paging_result.data) {
        let query_result = paging_result.data[key];
        result.push(this.getOperationInfoByResult(query_result));
      }
    }

    paging_result.data = result;
    return paging_result;
  };

  updateOperationInfo = async (operation_seq, operation_info) => {
    operation_info.setIgnoreEmpty(true);
    const update_params = operation_info.toJSON();
    update_params.modify_date = this.database.raw('NOW()');
    return await this.update({"seq": operation_seq}, update_params);
  };

  getOperationInfoByResult = (query_result) => {
    const service_info = ServiceConfig.getServiceInfo();
    query_result.media_root = service_info.media_root;

    const operation_info = new OperationInfo(query_result);

    if (operation_info.media_root) {
      operation_info.media_directory = Util.getMediaDirectory(service_info.media_root, operation_info.media_path);
      operation_info.trans_directory = Util.getMediaDirectory(service_info.trans_video_root, operation_info.media_path);
      operation_info.url_prefix = Util.getUrlPrefix(service_info.static_storage_prefix, operation_info.media_path);
      operation_info.vod_url_prefix = Util.getUrlPrefix(service_info.static_video_prefix, operation_info.media_path);
    }

    return operation_info;
  };

  getOperationInfoWithMediaInfo = async (query_result, import_media_info=false) => {
    if (query_result == null) {
      return new OperationInfo(null);
    }

    const operation_info = this.getOperationInfoByResult(query_result);

    if (import_media_info === true) {
      const media_info = await new OperationMediaModel(this.database).getOperationMediaInfo(operation_info);
      operation_info.setMediaInfo(media_info);
      operation_info.origin_video_path = operation_info.media_directory + media_info.video_source;
      operation_info.trans_video_path = operation_info.trans_directory + media_info.video_source;
    }

    return operation_info;
  };

  deleteOperation = async (operation_info) => {
    await this.delete({ "seq": operation_info.seq });
  };

  updateStatusNormal = async (operation_seq, member_seq) => {
    return await this.update({"seq": operation_seq, "member_seq": member_seq}, {status: 'Y', "modify_date": this.database.raw('NOW()')});
  };

  updateStatusTrash = async (operation_seq_list, member_seq, is_delete) => {
    return await this.updateIn("seq", operation_seq_list, {status: is_delete ? 'Y' : 'T', "modify_date": this.database.raw('NOW()')}, { member_seq });
  };

  updateStatusFavorite = async (operation_seq, is_delete) => {
    return await this.update({"seq": operation_seq}, {is_favorite: is_delete ? 0 : 1, "modify_date": this.database.raw('NOW()')});
  };

  updateRequestStatus = async (operation_seq, status) => {
    return await this.update({"seq": operation_seq}, {request_status: status ? status.toUpperCase() : 'N', "modify_date": this.database.raw('NOW()')});
  };

  updateAnalysisStatus = async (operation_seq, status) => {
    return await this.update({"seq": operation_seq}, {analysis_status: status ? status.toUpperCase() : 'N', "modify_date": this.database.raw('NOW()')});
  };

  updateSharingStatus = async (operation_seq, status) => {
    return await this.update({"seq": operation_seq}, {is_sharing: status ? 1 : 0, "modify_date": this.database.raw('NOW()')});
  };

  updateAnalysisComplete = async (operation_seq, status) => {
    return await this.update({"seq": operation_seq}, {is_analysis_complete: status ? 1 : 0, "modify_date": this.database.raw('NOW()')});
  };

  updateAnalysisProgress = async (operation_seq, progress) => {
    return await this.update({"seq": operation_seq}, {progress: progress, "modify_date": this.database.raw('NOW()')});
  };

  updateReviewStatus = async (operation_seq, status) => {
    return await this.update({"seq": operation_seq}, {is_review: status ? 1 : 0, "modify_date": this.database.raw('NOW()')});
  };

  createOperation = async (body, member_seq, created_by_user = true, status = null) => {
    const member_info = await new MemberModel(this.database).getMemberInfo(member_seq);
    if (!member_info || member_info.isEmpty()) {
      throw new StdObject(-1, '회원정보가 없습니다.', 401)
    }
    const operation_info = new OperationInfo().getByRequestBody(body).toJSON();
    const content_id = Util.getContentId();
    const user_media_path = member_info.user_media_path;
    operation_info.member_seq = member_seq;
    operation_info.media_path = user_media_path + 'operation' + Constants.SEP + content_id + Constants.SEP + 'SEQ' + Constants.SEP;
    operation_info.created_by_user = created_by_user ? 1 : 0;
    operation_info.content_id = content_id;
    if (status) {
      operation_info.status = status;
    }

    const operation_seq = await this.create(operation_info, 'seq');
    operation_info.seq = operation_seq;

    const service_info = ServiceConfig.getServiceInfo();
    const media_root = service_info.media_root;
    operation_info.media_root = media_root;
    operation_info.media_directory = Util.getMediaDirectory(media_root, operation_info.media_path);

    return operation_info;
  };

  createOperationNew = async (operation_info) => {
    const operation_seq = await this.create(operation_info, 'seq');
    operation_info.seq = operation_seq;

    return operation_info;
  };

  isDuplicateOperationCode = async (group_seq, member_seq, operation_code) => {
    const where = {"group_seq": group_seq, "member_seq": member_seq, "operation_code": operation_code};
    const total_count = await this.getTotalCount(where);

    return total_count > 0;
  };

  getOperationInfoByContentId = async (content_id) => {
    const where = {"content_id": content_id};
    return await this.getOperation(where, false);
  };

  getUnSyncOperationInfo = async (member_seq) => {
    const where = {"member_seq": member_seq, analysis_status: 'N', 'is_analysis_complete': 0, status: 'Y'};
    return await this.getOperation(where, false);
  };

  remove = async (operation_info, member_seq) => {
    const where = {"member_seq": member_seq, "seq": operation_info.seq};
    return await this.delete(where);
  };

  getGroupMemberOperationList = async (group_seq, member_seq) => {
    const filter = {
      group_seq,
      member_seq
    }
    const operation_list = []
    const query_result = await this.find(filter)
    if (query_result) {
      for (let i = 0; i < query_result.length; i++) {
        operation_list.push(this.getOperationInfoByResult(query_result[i]));
      }
    }
    return operation_list
  }

  setGroupMemberOperationState = async (group_seq, member_seq, status) => {
    const filter = {
      group_seq,
      member_seq
    }
    const params = {
      status,
      "modify_date": this.database.raw('NOW()')
    }
    return await this.update(filter, params);
  }

  getGroupTotalStorageUsedSize = async (group_seq) => {
    const filter = {
      group_seq
    }

    return await this.getGroupUsedStorageSize(filter)
  }

  getGroupMemberStorageUsedSize = async (group_seq, member_seq) => {
    const filter = {
      group_seq,
      member_seq
    }

    return await this.getGroupUsedStorageSize(filter)
  }

  getGroupUsedStorageSize = async (filter) => {
    const query = this.database.select([ this.database.raw('SUM(operation_storage.origin_video_size) AS total_size') ])
    query.from('operation')
    query.innerJoin("operation_storage", "operation_storage.operation_seq", "operation.seq")
    query.where(filter)
    query.whereIn('status', ['Y', 'T'])
    query.first()

    const query_result = await query
    log.debug(this.log_prefix, '[getGroupUsedStorageSize]', filter, query_result)
    if (!query_result || !query_result.total_size) {
      return 0
    }
    log.debug(this.log_prefix, '[getGroupUsedStorageSize - return]', filter, query_result.total_size, Util.parseInt(query_result.total_size))
    return Util.parseInt(query_result.total_size)
  }

  getOperationListByMemberSeq = async (member_seq) => {
    return await this.find({ member_seq })
  }

  migrationGroupSeq = async (member_seq, group_seq) => {
    return await this.update({"member_seq": member_seq}, { group_seq });
  }
}
