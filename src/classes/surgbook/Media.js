import Util from '@/utils/baseutil';
import database from '@/config/database';
import DoctorModel from '@/models/DoctorModel';
import StdObject from "../StdObject";

export default class Media {
  constructor(media_id) {
    this.media_id = media_id;
  }

  async getMedia(options={}) {
    const doctor_info = await new DoctorModel( {database} ).findOne({"ID": this.media_id});

    const _media_root =  doctor_info.MediaRoot;
    const _media_path =  doctor_info.MediaPath;
    const _media_directory = Util.getMediaDirectory(_media_root, _media_path);
    this.url_prefix = Util.getUrlPrefix(_media_root, _media_path);

    const media_xml = await Util.loadXmlFile(_media_directory, 'Media');
    const media_xml_info = media_xml.MediaInfo.Media;

    const _video_name = media_xml_info.node_text;
    this.fps =  media_xml_info.node_attr.FPS;
    this.width =  media_xml_info.node_attr.Width;
    this.height =  media_xml_info.node_attr.Height;
    this.total_time =  media_xml_info.node_attr.RunTime;
    this.total_frame =  media_xml_info.node_attr.FrameNo;

    this.video_url = this.url_prefix + "SEQ/" + _video_name.replace(/^[a-zA-Z]+_/, 'Proxy_');
    const _video_source = _media_directory + "SEQ\\" + _video_name.replace(/^[a-zA-Z]+_/, 'Trans_');

    if (options.patient === true) {
      this.pid = doctor_info.PID;
      this.patient_name = doctor_info.PName;
      this.patient_age = doctor_info.Age;
      this.patient_sex = doctor_info.Sex;
      this.patient_race = doctor_info.Race;
      this.operation_date = doctor_info.OpDate;
      this.operation_name = doctor_info.OpName;
      this.pre_operation = doctor_info.PreOperative;
      this.post_operation = doctor_info.PostOperative;
    }

    Object.assign(this, {
      getMediaRoot() {
        return _media_root;
      },
      getMediaPath() {
        return _media_path;
      },
      getMediaDirectory() {
        return _media_directory;
      },
      getVideoName() {
        return _video_name;
      },
      getVideoSource() {
        return _video_source;
      }
    });

    return this;
  }

  updateOperationInfo = async (operation_info) => {
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

    let result = null;

    await database.transaction(async(trx) => {
      const doctor_model = new DoctorModel( { database: trx } );
      result = await doctor_model.update({"ID": this.media_id}, update_params);
    });

    return result;
  }
}
