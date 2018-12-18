import _ from 'lodash';
import JsonWrapper from '@/classes/JsonWrapper';

/**
 * @swagger
 * definitions:
 *  VideoInfo:
 *    type: "object"
 *    properties:
 *      video_name:
 *        type: "string"
 *        description: "비디오 파일 명"
 *      fps:
 *        type: "number"
 *        description: "비디오 프레임 레이트"
 *      width:
 *        type: "number"
 *        description: "비디오 폭 (px)"
 *      height:
 *        type: "number"
 *        description: "비디오 높이 (px)"
 *      total_time:
 *        type: "string"
 *        description: "비디오의 총 재생 시간 (sec)"
 *      total_frame:
 *        type: "string"
 *        description: "비디오의 총 프레임 수"
 *
 */

export default class VideoInfo extends JsonWrapper {
  constructor(data=null, private_keys=[]) {
    super(data, private_keys);
    this.setKeys(['video_name', 'fps', 'width', 'height', 'total_time', 'total_frame']);
  }

  setByXML = (media_xml_info) => {
    if (!media_xml_info) {
      return this;
    }

    if (_.isArray(media_xml_info)) {
      media_xml_info = media_xml_info[0];
    }

    this.video_name = media_xml_info._;
    this.fps = media_xml_info.$.FPS;
    this.width = media_xml_info.$.Width;
    this.height = media_xml_info.$.Height;
    this.total_time = media_xml_info.$.RunTime;
    this.total_frame = media_xml_info.$.FrameNo;

    return this;
  }

  getXmlInfo = () => {
    return {
      "_": this.video_name,
      "$": {
        "FPS": this.fps,
        "Width": this.width,
        "Height": this.height,
        "RunTime": this.total_time,
        "FrameNo": this.total_frame
      }
    }
  }
}
