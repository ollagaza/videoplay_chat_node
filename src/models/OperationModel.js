import ModelObject from '@/classes/ModelObject';
import role from '@/config/roles';
import Util from '@/utils/baseutil';
import OperationInfo from '@/classes/surgbook/OperationInfo';
import VideoModel from "@/models/xmlmodel/VideoModel";
import MemberModel from '@/models/MemberModel';
import StdObject from "../classes/StdObject";

export default class OperationModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'operation';
    this.selectable_fields = ['*'];
  }

  getOperationInfo = async (operation_seq, token_info) => {
    const where = {"seq": operation_seq};
    if (token_info.getRole() <= role.MEMBER) {
      where.member_seq = token_info.getId();
    }

    const oKnex = this.database.select(['*']);
    oKnex.from('operation');
    oKnex.leftOuterJoin("doctor", "doctor.MediaPath", "operation.media_path");
    oKnex.where(where);
    oKnex.first();

    const query_result = await oKnex;

    return await this.getOperationInfoWithXML(query_result, true);
  }

  getOperationInfoListPage = async (params, token_info, asc=false)  => {
    const page = params && params.page ? params.page : 1;
    const list_count = params && params.list_count ? params.list_count : 20;
    const page_count = params && params.page_count ? params.page_count : 10;

    const oKnex = this.database.select(['*']);
    oKnex.from('operation');
    oKnex.leftOuterJoin("doctor", "doctor.MediaPath", "operation.media_path");
    oKnex.whereIn('status', ['Y', 'T']);
    if (token_info.getRole() <= role.MEMBER) {
      oKnex.andWhere('member_seq', token_info.getId());
    }

    const order_by = {name:'seq', direction: 'DESC'};
    if (asc) {
      order_by.direction = 'ASC';
    }
    oKnex.orderBy(order_by.name, order_by.direction);

    const paging_result = await await this.queryPaginated(oKnex, list_count, page, page_count);

    const result = new Array();

    if (paging_result !== null && paging_result.data != null) {
      for (const key in paging_result.data) {
        let query_result = paging_result.data[key];
        result.push(this.getOperationInfoByResult(query_result));
      }
    }

    paging_result.data = result;
    return paging_result;
  }

  updateOperationInfo = async (operation_seq, operation_info) => {
    return await this.update({"seq": operation_seq}, operation_info.getQueryJson());
  }

  getOperationInfoByResult = (query_result) => {
    const operation_info = new OperationInfo(query_result);

    if (operation_info.media_root) {
      operation_info.media_directory = Util.getMediaDirectory(operation_info.media_root, operation_info.media_path);
      operation_info.url_prefix = Util.getUrlPrefix(operation_info.media_root, operation_info.media_path);
    }

    return operation_info;
  }

  getOperationInfoWithXML = async (query_result, import_xml=false) => {
    if (query_result == null) {
      return new OperationInfo(null);
    }

    const operation_info = this.getOperationInfoByResult(query_result);

    if (import_xml === true && operation_info.media_directory) {
      const video_info = await new VideoModel({ "database": this.database }).getVideoInfo(operation_info.media_directory);
      operation_info.setVideoInfo(video_info);

      if (video_info.video_name) {
        operation_info.origin_video_url = operation_info.url_prefix + "SEQ/" + video_info.video_name;
        operation_info.proxy_video_url = operation_info.url_prefix + "SEQ/" + video_info.video_name.replace(/^[a-zA-Z]+_/, 'Proxy_');
        operation_info.video_source = operation_info.media_directory + "SEQ\\" + video_info.video_name;
      }
    }

    return operation_info;
  }

  updateStatusDelete = async (operation_seq) => {
    return await this.update({"seq": operation_seq}, {status: 'D'});
  }

  updateStatusTrash = async (operation_seq, is_delete) => {
    return await this.update({"seq": operation_seq}, {status: is_delete ? 'D' : 'T'});
  }

  updateStatusFavorite = async (operation_seq, is_delete) => {
    return await this.update({"seq": operation_seq}, {is_favorite: is_delete ? 0 : 1});
  }

  updateClipCount = async (operation_seq, clip_count) => {
    return await this.update({"seq": operation_seq}, {clip_count: clip_count});
  }

  updateReportCount = async (operation_seq, report_count) => {
    return await this.update({"seq": operation_seq}, {report_count: report_count});
  }

  updateRequestStatus = async (operation_seq, status) => {
    return await this.update({"seq": operation_seq}, {request_status: status ? status.toUpperCase() : 'N'});
  }

  updateIndexCount = async (operation_seq, index_type, count) => {
    const params = {};
    params['index' + index_type + '_count'] = count;
    return await this.update({"seq": operation_seq}, params);
  }

  getStorageSummary = async  (token_info) => {
    const columns = ["sum(FileNo) as total_file_count", "sum(FileSize) as total_file_size", "sum(RunTime) as total_run_time"];
    const oKnex = this.database.select(this.arrayToSafeQuery(columns));
    oKnex.from('operation');
    oKnex.innerJoin("doctor", "doctor.MediaPath", "operation.media_path");
    if (token_info.getRole() <= role.MEMBER) {
      oKnex.where({member_seq: token_info.getId()});
    }
    oKnex.first();

    return await oKnex;
  }

  createOperation = async (body, member_seq) => {
    const operation_info = new OperationInfo().getByRequestBody(body).toJSON();
    const member_info = await new MemberModel({ database: this.database }).getMemberInfo(member_seq);
    if (!member_info || member_info.isEmpty()) {
      throw new StdObject(-1, '회원정보가 없습니다.', 401)
    }
    const user_media_path = member_info.user_media_path;
    operation_info.member_seq = member_seq;
    operation_info.media_path = user_media_path + operation_info.operation_code;
    operation_info.hospital_code = member_info.hospital_code;
    operation_info.depart_code = member_info.depart_code;

    return await this.create(operation_info, 'seq');
  }
}
