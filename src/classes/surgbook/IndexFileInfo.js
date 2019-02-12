const index_file_regexp = /(.+\.[a-z0-9]+)?_?([0-9]+)_([0-9]+)_(0x[0-9]+)_0\.jpg$/i;

export default class IndexFileInfo {
  constructor(file_name) {
    if (!file_name) {
      return;
    }

    const matches = file_name.match(index_file_regexp);
    if (matches == null || matches.length == 0) {
      return;
    }

    this.video_name = matches[1];
    this.job_id = matches[2];
    this.frame = parseInt(matches[3]);
    this.suffix = matches[4];
    if (this.suffix === '0x80000000') {
      this.index_type = 1;
      this.index_name = 'INX1';
    } else if (this.suffix === '0x00000004') {
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

  getSuffix() {
    return this.suffix;
  }

  getIndexType() {
    return this.index_type;
  }

  getIndexName() {
    return this.index_name;
  }
}
