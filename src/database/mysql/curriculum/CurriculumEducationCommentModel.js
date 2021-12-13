import MySQLModel from '../../mysql-model'
import striptags from "striptags";

export default class CurriculumEducationCommentModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'curriculum_education_comment'
    this.selectable_fields = ['*']
    this.log_prefix = '[CurriculumEducationCommentModel]'
  }

  getCurriculumEducationComment = async (seq) => {
    const query = this.database.select(['curriculum_education_comment.*', 'member.profile_image_path'])
      .from(this.table_name)
      .leftJoin('member', 'member.seq', `${this.table_name}.member_seq`)
      .where(`${this.table_name}.seq`, seq)
      .limit(1);
    return query
  }

  createCurriculumEducationComment = async (data) => {
    return await this.create(data, 'seq');
  }

  updateCurriculumEducationCommentReplyCount = async (type, seq) => {
    if (type === 'add') {
      return await this.increment({ seq }, { reply_count: 1 })
    } else if (type === 'del') {
      return await this.decrement({ seq }, { reply_count: 1 })
    }
  }

  getCurriculumEducationCommentList = async (education_seq, paging, parent_seq = null) => {
    const query = this.database.select(['curriculum_education_comment.*', 'member.profile_image_path'])
      .from(this.table_name)
      .leftJoin('member', 'member.seq', `${this.table_name}.member_seq`)
      .where(`${this.table_name}.curriculum_education_seq`, education_seq);

    if (parent_seq) {
      query.andWhere('is_reply', '1')
        .andWhere('parent_seq', parent_seq);
    } else {
      query.andWhere('is_reply', '0');
    }
    query.orderBy(`${this.table_name}.seq`, 'desc');
    const query_result = await this.queryPaginated(query, paging.list_count, paging.cur_page, paging.page_count, paging.no_paging);
    return query_result;
  }

  getCurriculumEducationCommentTotalCount = async (education_seq, comment_seq = null) => {
    const filter = {
      curriculum_education_seq: education_seq
    }
    if (comment_seq) {
      filter.parent_seq = comment_seq;
    }
    return await this.getTotalCount(filter);
  }

  updateCurriculumEducationComment = async (comment_seq, request) => {
    const filter = {
      seq: comment_seq,
    };
    const params = {
      comment_html: request.comment_html,
      comment_text: striptags(request.comment_html),
      modify_date: this.database.raw('NOW()'),
    }
    return await this.update(filter, params);
  }

  deleteCurriculumEducationComment = async (comment_seq) => {
    return await this.delete({ seq: comment_seq });
  }
}
