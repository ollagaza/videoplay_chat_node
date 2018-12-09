import Util from '@/utils/baseutil';
import database from '@/config/database';
import DoctorModel from '@/models/DoctorModel';

export default class Media {
  #media_root;
  #media_path;
  #media_directory;
  #video_name;
  #video_source;

  constructor(media_id) {
    this.media_id = media_id;
  }

  async init(options={}) {
    const doctor_model = await new DoctorModel( {database} ).findOne({"ID": this.media_id});
    this.#media_root =  doctor_model.MediaRoot;
    this.#media_path =  doctor_model.MediaPath;
    this.#media_directory = Util.getMediaDirectory(this.#media_root, this.#media_path);
    this.media_url_prefix = Util.getUrlPrefix(this.#media_root, this.#media_path);

    const media_xml = await Util.loadXmlFile(this.media_root, this.media_path, 'Media');
    const media_xml_info = media_xml.MediaInfo.Media;

    this.#video_name = media_xml_info.node_text;
    this.fps =  media_xml_info.node_attr.FPS;
    this.width =  media_xml_info.node_attr.Width;
    this.height =  media_xml_info.node_attr.Height;
    this.total_time =  media_xml_info.node_attr.RunTime;
    this.total_frame =  media_xml_info.node_attr.FrameNo;

    this.video_url = this.media_url_prefix + this.#video_name.replace(/^[a-zA-Z]+_/, 'Proxy_');
    this.#video_source = this.#media_directory + this.#video_name.replace(/^[a-zA-Z]+_/, 'Trans_');

    if (options.is_set_patient_info === true) {
      this.pid = doctor_model.PID;
      this.patient_name = doctor_model.PName;
      this.patient_age = doctor_model.Age;
      this.patient_sex = doctor_model.Sex;
      this.patient_race = doctor_model.Race;
      this.operation_date = doctor_model.OpDate;
      this.operation_name = doctor_model.OpName;
      this.pre_operation = doctor_model.PreOperative;
      this.post_operation = doctor_model.PostOperative;
    }
  }

  getMediaRoot() {
    return this.#media_root;
  }

  getMediaPath() {
    return this.#media_path;
  }

  getMediaDirectory() {
    return this.#media_directory;
  }

  getVideoName() {
    return this.#video_name;
  }

  getVideoSource() {
    return this.#video_source;
  }

  getUrlPrefix() {
    return this.media_url_prefix;
  }
}
