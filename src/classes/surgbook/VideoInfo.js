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

  setByMediaXML = (media_xml_info) => {
    if (!media_xml_info) {
      return;
    }

    this.video_name = media_xml_info.node_text;
    this.fps = media_xml_info.node_attr.FPS;
    this.width = media_xml_info.node_attr.Width;
    this.height = media_xml_info.node_attr.Height;
    this.total_time = media_xml_info.node_attr.RunTime;
    this.total_frame = media_xml_info.node_attr.FrameNo;
  }

  getMediaXml = () => {
    return {
      "node_text": this.video_name,
      "node_attr": {
        "FPS": this.fps,
        "Width": this.width,
        "Height": this.height,
        "RunTime": this.total_time,
        "FrameNo": this.total_frame
      }
    }
  }
}
