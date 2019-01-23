import _ from 'lodash';
import JsonWrapper from '@/classes/JsonWrapper';
import service_config from '@/config/service.config';
import Util from '@/utils/baseutil';

class SmilVideoInfo extends JsonWrapper {
  constructor(video_node) {
    const data = {};
    if (video_node && video_node.$) {
      data.file_name = video_node.$.src;
      data.resolution = parseInt(video_node.$.height, 10);
      data.width = parseInt(video_node.$.width, 10);
      data.height = parseInt(video_node.$.height, 10);
    }
    super(data, []);
  }
}

export default class SmilInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    if (!data) {
      data = {};
    }
    data.video_info_map = {};
    data.video_info_list = [];
    super(data, private_keys);
    this.is_empty = true;
  }

  loadFromXml = async (media_directory, smil_file_name) => {
    const smil_xml_info = await Util.loadXmlFile(media_directory + 'SEQ\\', smil_file_name);
    console.log(smil_xml_info.body);
    if (smil_xml_info && smil_xml_info.body) {
      const body_node = _.isArray(smil_xml_info.body) ? smil_xml_info.body[0] : smil_xml_info.body;
      const switch_node = _.isArray(body_node.switch) ? body_node.switch[0] : body_node.switch;
      const video_node_list = switch_node.video;


      console.log('step 1');

      if (video_node_list) {
        console.log('step 2');
        for (let i = 0; i < video_node_list.length; i++) {
          const video_info = new SmilVideoInfo(video_node_list[i]);
          this.video_info_map[video_info.file_name] = video_info;
          this.video_info_list.push(video_info);
          console.log(video_info);
        }
        this.is_empty = false;
      }
    }
    console.log(this.video_info_map);
    console.log(this.video_info_list);

    return this;
  };

  isTransVideo = (file_name) => {
    const video_info = this.video_info_map[file_name];
    return video_info && !video_info.isEmpty();
  };

  findProxyVideoFile = () => {
    const proxy_max_resolution = service_config.get('proxy_max_resolution') ? parseInt(service_config.get('proxy_max_resolution'), 10) : 360;
    let proxy_file_name = null;
    let max_resolution = 0;
    let min_resolution = 0;
    let min_file_name = null;
    for (let i = 0; i < this.video_info_list.length; i++) {
      const video_info = this.video_info_list[i];
      const resolution = video_info.resolution;
      if (resolution <= proxy_max_resolution) {
        if (resolution > max_resolution) {
          max_resolution = resolution;
          proxy_file_name = video_info.file_name;
        }
      } else {
        if (min_resolution == 0 || resolution < min_resolution) {
          min_resolution = resolution;
          min_file_name = video_info.file_name;
        }
      }
    }

    if (proxy_file_name == null) {
      proxy_file_name = min_file_name;
    }
    return proxy_file_name;
  };
}
