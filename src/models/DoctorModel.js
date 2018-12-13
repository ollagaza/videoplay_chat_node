import ModelObject from '@/classes/ModelObject';
import Util from '@/utils/baseutil';
import MediaInfo from '@/classes/surgbook/MediaInfo';

export default class DoctorModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'doctor';
    this.selectable_fields = ['*'];
  }

  getMediaInfo = async (media_id, member_query=null, import_patient=false) => {
    let query = null;
    if (member_query != null) {
      query = member_query;
      query.ID = media_id;
    } else {
      query = {"ID": media_id};
    }

    const doctor_info = await this.findOne(query);

    return await this.toMediaInfoWithXML(doctor_info, true, import_patient);
  }

  getMediaInfoList = async (query, columns=null) => {
    const doctor_info_list = await this.find(query, columns);

    const result = new Array();

    if (doctor_info_list !== null) {
      for (const key in doctor_info_list) {
        let doctor_info = doctor_info_list[key];
        result.push(this.toMediaInfo(doctor_info));
      }
    }

    return result;
  }

  getMediaInfoListPage = async (query, columns=null, orderby=null)  => {
    const doctor_info_list = await this.findPaginated(query, columns, orderby);

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

  updateOperationInfo = async (media_id, operation_info) => {
    const update_params = {
      "PID": operation_info.pid,
      "PName": operation_info.patient_name,
      "Age": operation_info.patient_age,
      "Sex": operation_info.patient_sex,
      "Race": operation_info.patient_race,
      "OpDate": operation_info.operation_date,
      "OpName": operation_info.operation_name,
      "PreOperative": operation_info.pre_operation,
      "PostOperative": operation_info.post_operation
    };

    const result = await this.update({"ID": media_id}, update_params);

    return result;
  }

  getBaseResult = (doctor_info) => {
    const result_data = {};

    result_data.media_id = doctor_info.ID;

    result_data._media_root =  doctor_info.MediaRoot;
    result_data._media_path =  doctor_info.MediaPath;

    result_data.is_operation = doctor_info.Operation;
    result_data.is_file_no = doctor_info.FileNo;
    result_data.is_file_size = doctor_info.FileSize;
    result_data.is_runtime = doctor_info.RunTime;
    result_data.is_clip_no = doctor_info.ClipNo;
    result_data.is_video_no = doctor_info.VideoNo;
    result_data.is_report_no = doctor_info.ReportNo;

    result_data.is_analysis = doctor_info.Analysis === 'Y';
    result_data.is_request = doctor_info.Request === 'Y';
    result_data.is_review = doctor_info.Review === 'Y';
    result_data.is_sharing = doctor_info.Sharing === 'Y';

    if (doctor_info._no) {
      result_data.no = doctor_info._no;
    }

    result_data._media_directory = Util.getMediaDirectory(result_data._media_root, result_data._media_path);
    result_data.url_prefix = Util.getUrlPrefix(result_data._media_root, result_data._media_path);

    return result_data;
  }

  toMediaInfo = (doctor_info) => {
    if (doctor_info == null) {
      return new MediaInfo(null);
    }

    return new MediaInfo(this.getBaseResult(doctor_info));
  }

  toMediaInfoWithXML = async (doctor_info, import_xml, import_patient=false) => {
    if (doctor_info == null) {
      return new MediaInfo(null);
    }

    const result_data = this.getBaseResult(doctor_info);

    if (import_patient === true) {
      result_data.operation_info = {};
      result_data.operation_info.pid = doctor_info.PID;
      result_data.operation_info.patient_name = doctor_info.PName;
      result_data.operation_info.patient_age = doctor_info.Age;
      result_data.operation_info.patient_sex = doctor_info.Sex;
      result_data.operation_info.patient_race = doctor_info.Race;
      result_data.operation_info.operation_date = doctor_info.OpDate;
      result_data.operation_info.operation_name = doctor_info.OpName;
      result_data.operation_info.pre_operation = doctor_info.PreOperative;
      result_data.operation_info.post_operation = doctor_info.PostOperative;
    }

    if (import_xml === true) {
      const media_xml = await Util.loadXmlFile(result_data._media_directory, 'Media');
      const media_xml_info = media_xml.MediaInfo.Media;

      result_data.video_info = {};
      result_data.video_info.video_name = media_xml_info.node_text;
      result_data.video_info.fps = media_xml_info.node_attr.FPS;
      result_data.video_info.width = media_xml_info.node_attr.Width;
      result_data.video_info.height = media_xml_info.node_attr.Height;
      result_data.video_info.total_time = media_xml_info.node_attr.RunTime;
      result_data.video_info.total_frame = media_xml_info.node_attr.FrameNo;

      result_data.video_url = result_data.url_prefix + "SEQ/" + result_data.video_info.video_name.replace(/^[a-zA-Z]+_/, 'Proxy_');
      result_data._video_source = result_data._media_directory + "SEQ\\" + result_data.video_info.video_name.replace(/^[a-zA-Z]+_/, 'Trans_');
    }

    return new MediaInfo(result_data);
  }
}
