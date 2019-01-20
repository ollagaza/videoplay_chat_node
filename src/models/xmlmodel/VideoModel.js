import ModelObject from '@/classes/ModelObject';
import Util from '@/utils/baseutil';
import VideoInfo from "@/classes/surgbook/VideoInfo";

export default class VideoModel extends ModelObject {
  constructor(...args) {
    super(...args);
  }

  getVideoInfo = async (media_directory) => {
    const video_info = new VideoInfo();

    const media_xml = await Util.loadXmlFile(media_directory, 'Media.xml');

    if (media_xml && media_xml.MediaInfo) {
      const media_xml_info = media_xml.MediaInfo.Media;
      video_info.getFromXML(media_xml_info);
    }

    return video_info;
  };
}
