import ModelObject from '@/classes/ModelObject';
import role from '@/config/roles';
import Util from '@/utils/baseutil';
import OperationInfo from '@/classes/surgbook/OperationInfo';
import MemberModel from '@/models/MemberModel';
import OperationMediaModel from '@/models/OperationMediaModel';
import StdObject from "@/classes/StdObject";
import service_config from '@/config/service.config';

const join_select = ['operation.*', 'member.user_name', 'operation_storage.total_file_size', 'operation_storage.total_file_count', 'operation_storage.seq as storage_seq', 'operation_storage.clip_count', 'operation_storage.report_count', 'operation_storage.service_video_count'];

export default class OperationModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'operation';
    this.selectable_fields = ['*'];
  }

  getOperation = async (where, import_media_info) => {
    const oKnex = this.database.select(join_select);
    oKnex.from('operation');
    oKnex.innerJoin("member", "member.seq", "operation.member_seq");
    oKnex.leftOuterJoin("operation_storage", "operation_storage.operation_seq", "operation.seq");
    oKnex.where(where);
    oKnex.first();

    const query_result = await oKnex;

    return await this.getOperationInfoWithMediaInfo(query_result, import_media_info);
  };

  getOperationInfo = async (operation_seq, token_info, check_owner=true) => {
    const where = {"operation.seq": operation_seq};
    if (check_owner && token_info.getRole() <= role.MEMBER) {
      where.member_seq = token_info.getId();
    }

    return await this.getOperation(where, true);
  };

  getOperationInfoListPage = async (params, token_info, search, asc=false)  => {
    const page = params && params.page ? params.page : 1;
    const list_count = params && params.list_count ? params.list_count : 20;
    const page_count = params && params.page_count ? params.page_count : 10;

    const oKnex = this.database.select(join_select);
    oKnex.from('operation');
    oKnex.innerJoin("member", "member.seq", "operation.member_seq");
    oKnex.leftOuterJoin("operation_storage", "operation_storage.operation_seq", "operation.seq");
    oKnex.whereIn('status', ['Y', 'T']);
    if (token_info.getRole() <= role.MEMBER) {
      oKnex.andWhere('member_seq', token_info.getId());
    }
    if (search) {
      oKnex.andWhere(this.database.raw(`(operation.operation_code LIKE '%${search}%' OR operation.operation_name LIKE '%${search}%')`));
    }

    const order_by = {name:'seq', direction: 'DESC'};
    if (asc) {
      order_by.direction = 'ASC';
    }
    oKnex.orderBy(order_by.name, order_by.direction);

    const paging_result = await await this.queryPaginated(oKnex, list_count, page, page_count, params.no_paging);

    const result = [];

    if (paging_result !== null && paging_result.data != null) {
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
    const service_info = service_config.getServiceInfo();
    query_result.media_root = service_info.media_root;

    const operation_info = new OperationInfo(query_result);

    if (operation_info.media_root) {
      operation_info.media_directory = Util.getMediaDirectory(operation_info.media_root, operation_info.media_path);
      operation_info.url_prefix = Util.getUrlPrefix(service_info.static_storage_prefix, operation_info.media_path);
    }

    return operation_info;
  };

  getOperationInfoWithMediaInfo = async (query_result, import_media_info=false) => {
    if (query_result == null) {
      return new OperationInfo(null);
    }

    const operation_info = this.getOperationInfoByResult(query_result);

    if (import_media_info === true) {
      const media_info = await new OperationMediaModel({ "database": this.database }).getOperationMediaInfo(operation_info);
      operation_info.setMediaInfo(media_info);
      operation_info.origin_video_path = operation_info.media_directory + operation_info.video_source;
    }

    return operation_info;
  };

  updateStatusDelete = async (operation_info, member_seq) => {
    const operation_seq = operation_info.seq;
    const delete_suffix = Math.floor(Date.now() / 1000) + '_' + operation_seq + '_' + member_seq + '_';

    const where = {"seq": operation_seq};
    const trash_path = delete_suffix + operation_info.operation_code;

    const update_params = {
      "status": 'D'
      , "modify_date": this.database.raw('NOW()')
      , "operation_code": this.database.raw(`CONCAT('${delete_suffix}', operation_code)`)
      , "media_path": trash_path
    };
    await this.update(where, update_params);

    const service_info = service_config.getServiceInfo();
    const trash_root = service_info.trash_root;
    if ( !( await Util.fileExists(trash_root) ) ) {
      await Util.createDirectory(trash_root);
    }
    if ( !( await Util.renameFile(operation_info.media_directory, trash_root + '\\' + trash_path) ) ){
      // throw new StdObject(-1, '파일 삭제 실패', 500);
    }

    return trash_path;
  };

  updateStatusTrash = async (operation_seq, is_delete) => {
    return await this.update({"seq": operation_seq}, {status: is_delete ? 'Y' : 'T', "modify_date": this.database.raw('NOW()')});
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

  createOperation = async (body, member_seq) => {
    const operation_info = new OperationInfo().getByRequestBody(body).toJSON();
    const member_info = await new MemberModel({ database: this.database }).getMemberInfo(member_seq);
    if (!member_info || member_info.isEmpty()) {
      throw new StdObject(-1, '회원정보가 없습니다.', 401)
    }
    const user_media_path = member_info.user_media_path;
    operation_info.member_seq = member_seq;
    operation_info.media_path = user_media_path + operation_info.operation_code + '\\SEQ\\';
    operation_info.hospital_code = member_info.hospital_code;
    operation_info.depart_code = member_info.depart_code;
    operation_info.created_by_user = 1;

    const operation_seq = await this.create(operation_info, 'seq');
    operation_info.seq = operation_seq;

    const service_info = service_config.getServiceInfo();
    const media_root = service_info.media_root;
    operation_info.media_directory = Util.getMediaDirectory(media_root, operation_info.media_path);

    return operation_info;
  };

  isDuplicateOperationCode = async (member_seq, operation_code) => {
    const where = {"member_seq": member_seq, "operation_code": operation_code};
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
}
