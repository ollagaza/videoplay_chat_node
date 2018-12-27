import php from 'phpjs';
import StdObject from '@/classes/StdObject';
import ModelObject from '@/classes/ModelObject';
import FileInfo from "@/classes/surgbook/FileInfo";
import Util from '@/utils/baseutil';

export default class ReferFileModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'refer_file';
    this.selectable_fields = ['*'];
  }

  createReferFile = async (upload_file_info, operation_seq, member_seq) => {
    const file_info = new FileInfo().getByUploadFileInfo(upload_file_info).toJSON();
    file_info.operation_seq = operation_seq;
    file_info.member_seq = member_seq;

    return await this.create(file_info, 'seq');
  }
}
