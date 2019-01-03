import ModelObject from '@/classes/ModelObject';

export default class OperationShareUserModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'operation_share_user';
    this.selectable_fields = ['*'];
  }

  getUserAuthType = async (share_seq, email_address) => {
    const where = {
      "share_seq": share_seq,
      "email_address": email_address
    };
    const result = await this.findOne(where, ['auth_type']);
    if (result && result.auth_type) {
      return result.auth_type;
    }
    else {
      return 0;
    }
  };

  deleteShareUser = async (share_seq, email_list) => {
    if (email_list == null || email_list.length <= 0) {
      return 0;
    }

    const oKnex = this.database
      .from(this.table_name)
      .where({ "share_seq": share_seq })
      .whereIn('email_address', email_list)
      .del();

    return await oKnex;
  };

  createShareUser = async (share_seq, email_list, auth_type) => {
    if (email_list == null || email_list.length <= 0) {
      return 0;
    }

    let sql = "";
    sql += "INSERT INTO " + this.table_name + " (share_seq, email_address, auth_type) \n";
    sql += "VALUES \n";
    for (let i = 0; i < email_list.length; i++) {
      const email_address = email_list[i];
      if (i != 0) {
        sql += "  , ";
      }
      else {
        sql += "  ";
      }
      sql += `(${share_seq}, '${email_address}', '${auth_type}') \n`;
    }
    sql += "ON DUPLICATE KEY UPDATE \n";
    sql += "   auth_type = VALUES(auth_type) \n";
    sql += "   , modify_date = NOW() \n";

    return await this.database.raw(sql);
  };

  increaseViewCount = async (share_seq, email_address) => {
    const where = {
      "share_seq": share_seq,
      "email_address": email_address
    };

    const update_data = {
      "view_count": this.database.raw('view_count + 1'),
      "modify_date": this.database.raw('NOW()')
    };
    return await this.update(where, update_data);
  };

  increaseCommentCount = async (share_seq, email_address) => {
    const where = {
      "share_seq": share_seq,
      "email_address": email_address
    }
    const update_data = {
      "view_count": this.database.raw('comment_count + 1'),
      "modify_date": this.database.raw('NOW()')
    };
    return await this.update(where, update_data);
  };

  getViewUserCount = async (share_seq) => {
    const oKnex = this.database
      .count('* as total_count')
      .from(this.table_name)
      .where({"share_seq": share_seq})
      .andWhere('view_count', '>', 0)
      .first();
    const result = await oKnex;
    if (!result || !result.total_count) {
      return 0;
    } else {
      return result.total_count;
    }
  }
}
