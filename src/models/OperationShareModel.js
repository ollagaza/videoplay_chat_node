import ModelObject from '@/classes/ModelObject';
import Util from '@/utils/baseutil';
import StdObject from "@/classes/StdObject";
import OperationShareInfo from '@/classes/surgbook/OperationShareInfo';
import OperationShareUserModel from "@/models/OperationShareUserModel";

export default class OperationShareModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'operation_share';
    this.selectable_fields = ['*'];
  }

  getShareInfoBySeq = async  (share_seq) => {
    const query_result = await this.findOne({"seq": share_seq, "status": "Y"});
    return new OperationShareInfo(query_result);
  };

  getShareInfoByShareKey = async  (share_key) => {
    let share_key_info = Util.decrypt(share_key);
    if (share_key_info == null) {
      throw new StdObject(-1, '잘못된 접근입니다.', 400);
    }
    share_key_info = JSON.parse(share_key_info);
    if (share_key_info.t !== 'operation') {
      throw new StdObject(-2, '잘못된 접근입니다.', 400);
    }
    return await this.getShareInfoByDecryptedInfo(share_key_info);
  };

  getShareInfoByDecryptedInfo = async (decrypted_Info) => {
    const query_result = await this.findOne({"operation_seq": decrypted_Info.s, "random_key": decrypted_Info.r, "status": "Y"});
    return new OperationShareInfo(query_result);
  }

  getShareInfo = async (operation_info) => {
    const query_result = await this.findOne({"operation_seq": operation_info.seq, "status": "Y"});
    let share_info;
    if (query_result && query_result.seq) {
      share_info = new OperationShareInfo(query_result);
    } else {
      share_info = await this.createShareInfo(operation_info);
    }
    return share_info;
  };

  createShareInfo = async (operation_info) => {
    const random_key = Util.getRandomString(5);
    const share_key_data = {
      r: random_key,
      t: 'operation',
      s: operation_info.seq
    };
    const share_key = Util.encrypt(share_key_data);
    const create_params = {
      "operation_seq": operation_info.seq,
      "random_key": random_key,
      "share_key": share_key,
      "owner_member_seq": operation_info.member_seq
    };
    const share_seq = await this.create(create_params, 'seq');
    if (share_seq <= 0) {
      throw new StdObject(-1, '공유정보 생성 실패', 400);
    }
    create_params.seq = share_seq;
    return new OperationShareInfo(create_params);
  };

  increaseSendCount = async (share_seq, send_count=1) => {
    const where = {
      "seq": share_seq
    };
    const update_data = {
      "view_count": this.database.raw(`send_count + ${send_count}`),
      "modify_date": this.database.raw('NOW()')
    };
    return await this.update(where, update_data);
  };

  increaseViewCount = async (share_seq) => {
    const where = {
      "seq": share_seq
    };
    const update_data = {
      "view_count": this.database.raw('view_count + 1'),
      "modify_date": this.database.raw('NOW()')
    };
    return await this.update(where, update_data);
  };

  increaseCommentCount = async (share_seq) => {
    const where = {
      "seq": share_seq
    }
    const update_data = {
      "view_count": this.database.raw('comment_count + 1'),
      "modify_date": this.database.raw('NOW()')
    };
    return await this.update(where, update_data);
  };

  deleteShareInfo = async (operation_seq) => {
    return await this.update({"operation_seq": operation_seq}, {"status": "D"});
  }
}
