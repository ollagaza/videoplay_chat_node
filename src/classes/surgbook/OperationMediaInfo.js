import JsonWrapper from '@/classes/JsonWrapper';

export default class OperationMediaInfo extends JsonWrapper {
  constructor(data = null, private_keys = []) {
    super(data, private_keys);

    this.setKeys([
      'seq', 'operation_seq', 'run_time', 'fps', 'width', 'height', 'total_frame',
      'origin_video_url', 'proxy_video_url', 'streaming_url', 'video_source'
    ]);
  }

  setUrl = (media_directory, url_prefix) => {
    this.origin_video_url = url_prefix + "SEQ/" + this.video_file_name;
    this.proxy_video_url = url_prefix + "SEQ/" + this.proxy_file_name;
    this.video_source = "SEQ\\" + this.video_file_name;
    this.origin_video_path = media_directory + this.video_source;
  };
}
