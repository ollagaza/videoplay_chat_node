import ModelObject from '@/classes/ModelObject';

export default class OperationShareCommentModel extends ModelObject {
  constructor(...args) {
    super(...args);

    this.table_name = 'operation_share_comment';
    this.selectable_fields = ['*'];
  }

  checkCommentAuth = async (comment_seq, token_info, only_comment_owner) => {
    if (!token_info.isAdmin()) {
      const {comment_owner, operation_owner} = await this.getShareCommentOwner(comment_seq);
      if (token_info.getId() !== comment_owner) {
        if (only_comment_owner || token_info.getId() !== operation_owner) {
          return false;
        }
      }
    }
    return true;
  };

  getShareCommentOwner = async (comment_seq) => {
    const select = ['operation_share_user.member_seq as comment_owner', 'operation_share.owner_member_seq as operation_owner'];
    const oKnex = this.database
      .select(select)
      .from(this.table_name)
      .innerJoin("operation_share", "operation_share.seq", "operation_share_comment.share_seq")
      .where({ "operation_share_comment.seq": comment_seq })
      .first();
    const result = await oKnex;
    if (result && result.comment_owner && result.operation_owner) {
      return result;
    } else {
      return {};
    }
  };

  getCommentList = async (share_seq) => {
    const order_by = {name:'seq', direction: 'DESC'};
    return await this.find({"share_seq": share_seq}, null, order_by)
  };

  deleteShareComment = async (comment_seq) => {
    return await this.delete({ "seq": comment_seq });
  };

  createShareComment = async (share_seq, is_owner, member_seq, comment) => {
    const params = {
      "member_seq": member_seq,
      "share_seq": share_seq,
      "is_owner": is_owner,
      "comment": comment
    };

    return await this.create(params);
  };

  modifyShareComment = async (comment_seq, comment) => {
    const update_data = {
      "comment": comment,
      "modify_date": this.database.raw('NOW()')
    };

    return await this.update({ "seq": comment_seq }, update_data)
  };
}
