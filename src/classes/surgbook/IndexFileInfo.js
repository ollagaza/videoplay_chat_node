export default class IndexFileInfo {
  constructor(video_name, job_id, frame, index_type) {
    this.video_name = video_name; // member table seq
    this.job_id = job_id; // 권한 코드. 나중에 쓸지도 모름.
    this.frame = frame;
    if (index_type === '0x80000000') {
      this.index_type = 1;
      this.index_name = 'INX1';
    } else if (index_type === '0x00000004') {
      this.index_type = 2;
      this.index_name = 'INX2';
    } else {
      this.index_type = NaN;
      this.index_name = null;
    }
  }

  getVideoName() {
    return this.video_name;
  }

  getJobId() {
    return this.job_id;
  }

  getFrame() {
    return this.frame;
  }

  getIndexType() {
    return this.index_type;
  }

  getIndexName() {
    return this.index_name;
  }
}
