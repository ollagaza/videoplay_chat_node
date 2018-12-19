import ModelObject from '@/classes/ModelObject';
import Util from '@/utils/baseutil';
import MediaInfo from '@/classes/surgbook/MediaInfo';
import OperationInfo from '@/classes/surgbook/OperationInfo';
import VideoModel from "@/models/xmlmodel/VideoModel";

export default class DoctorModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'doctor';
    this.selectable_fields = ['*'];
    this.private_keys = ['media_root', 'media_path', 'media_directory', 'url_prefix', 'video_source'];
  }

  getMediaInfo = async (media_id, member_query=null) => {
    let query = null;
    if (member_query != null) {
      query = member_query;
      query.ID = media_id;
    } else {
      query = {"ID": media_id};
    }

    const doctor_info = await this.findOne(query);

    return await this.toMediaInfoWithXML(doctor_info, true);
  }

  getMediaInfoListPage = async (query, asc=false)  => {
    let order_by = {name:'ID', direction: 'DESC'};
    if (asc) {
      order_by.direction = 'ASC';
    }
    const doctor_info_list = await this.findPaginated(query, null, order_by);

    const result = new Array();

    if (doctor_info_list !== null && doctor_info_list.data != null) {
      for (const key in doctor_info_list.data) {
        let doctor_info = doctor_info_list.data[key];
        result.push(this.toMediaInfo(doctor_info));
      }
    }

    doctor_info_list.data = result;
    return doctor_info_list;
  }

  getOperationInfo = async (media_id) => {
    const doctor_info = await this.findOne({"ID": media_id});

    const operation_info = new OperationInfo();
    operation_info.setByDoctorInfo(doctor_info);

    return operation_info;
  }

  updateOperationInfo = async (media_id, operation_info) => {
    return await this.update({"ID": media_id}, operation_info.getQueryJson());
  }

  getBaseResult = (doctor_info) => {
    const result_data = {};

    result_data.media_id = doctor_info.ID;
    result_data.doctor_name = doctor_info.Name;

    result_data.media_root =  doctor_info.MediaRoot;
    result_data.media_path =  doctor_info.MediaPath;

    result_data.operation = doctor_info.Operation;
    result_data.operation_name = doctor_info.OpName;
    result_data.file_no = doctor_info.FileNo;
    result_data.file_size = doctor_info.FileSize;
    result_data.runtime = doctor_info.RunTime;
    result_data.clip_no = doctor_info.ClipNo;
    result_data.video_no = doctor_info.VideoNo;
    result_data.report_no = doctor_info.ReportNo;

    result_data.is_analysis = doctor_info.Analysis === 'Y';
    result_data.is_request = doctor_info.Request === 'Y';
    result_data.is_review = doctor_info.Review === 'Y';
    result_data.is_sharing = doctor_info.Sharing === 'Y';

    if (doctor_info._no) {
      result_data.list_no = doctor_info._no;
    }

    result_data.media_directory = Util.getMediaDirectory(result_data.media_root, result_data.media_path);
    result_data.url_prefix = Util.getUrlPrefix(result_data.media_root, result_data.media_path);

    return result_data;
  }

  toMediaInfo = (doctor_info) => {
    if (doctor_info == null) {
      return new MediaInfo(null);
    }

    return new MediaInfo(this.getBaseResult(doctor_info), this.private_keys);
  }

  toMediaInfoWithXML = async (doctor_info, import_xml=false) => {
    if (doctor_info == null) {
      return new MediaInfo(null);
    }

    const result_data = this.getBaseResult(doctor_info);

    if (import_xml === true) {
      const video_info = await new VideoModel({ "database": this.database }).getVideoInfo(result_data.media_directory);
      result_data.video_info = video_info;

      result_data.origin_video_url = result_data.url_prefix + "SEQ/" + video_info.video_name;
      result_data.proxy_video_url = result_data.url_prefix + "SEQ/" + video_info.video_name.replace(/^[a-zA-Z]+_/, 'Proxy_');
      result_data.video_source = result_data.media_directory + "SEQ\\" + video_info.video_name;
    }

    return new MediaInfo(result_data, this.private_keys);
  }

  updateClipCount = async (media_id, clip_count) => {
    await this.update({ID: media_id}, {ClipNo: clip_count});
  }

  updateReportCount = async (media_id, report_count) => {
    await this.update({ID: media_id}, {ReportNo: report_count});
  }

  updateRequestStatus = async (media_id, status) => {
    await this.update({ID: media_id}, {Request: status.toLowerCase() == 'y' ? 'Y' : 'N'});
  }
}
