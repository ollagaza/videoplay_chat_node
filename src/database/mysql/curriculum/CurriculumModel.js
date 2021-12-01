import MySQLModel from '../../mysql-model'

export default class CurriculumModel extends MySQLModel {
  constructor (database) {
    super(database)

    this.table_name = 'curriculum'
    this.selectable_fields = ['*']
    this.log_prefix = '[CurriculumModel]'
    this.join_fields = [
      'curriculum.*',
      'member.user_name', 'member.user_nickname', 'member.user_id', 'member.profile_image_path as member_profile_image',
      'group_info.group_name', 'group_info.profile_image_path as group_profile_image', 'group_info.channel_top_img_path as group_top_image', 'group_info.group_explain', 'group_info.search_keyword as group_search_keyword'
    ]
  }

  createCurriculum = async (question_data) => {
    return await this.create(question_data, 'seq')
  }

  updateCurriculum = async (filter, question_data) => {
    return await this.update(filter, question_data)
  }

  deleteCurriculum = async (curriculum_seq) => {
    return await this.delete({ seq: curriculum_seq })
  }

  updateCurriculumThumbnail = async (curriculum_seq, thumbnail_path) => {
    return await this.update({ seq: curriculum_seq }, { thumbnail: thumbnail_path })
  }

  getCurriculumQuery = () => {
    return this.database
      .select(this.join_fields)
      .from(this.table_name)
      .innerJoin('member', { 'member.seq': 'curriculum.member_seq' })
      .innerJoin('group_info', { 'group_info.seq': 'curriculum.group_seq' })
  }

  getCurriculum = async (curriculum_seq) => {
    return this.getCurriculumQuery()
      .where(`${this.table_name}.seq`, curriculum_seq)
      .first()
  }

  getCurriculumList = async (curriculum_status, group_seq, search_keyword, paging, order) => {
    const query = this.getCurriculumQuery()
    query.where(`${this.table_name}.status`, '>=', curriculum_status)
    if (group_seq) {
      query.where(`${this.table_name}.group_seq`, group_seq)
    }
    if (search_keyword) {
      query.where((builder) => {
        const search = `%${search_keyword}%`
        builder.where('curriculum.title', 'like', search)
        builder.orWhere(this.database.raw('JSON_SEARCH(`curriculum`.`hashtag_list`, \'all\', ?, null, \'$.*\') IS NOT NULL', [search]))
      })
    }
    if (order) {
      query.orderBy(`${this.table_name}.${order.name}`, order.direction)
    }

    return await this.queryPaginated(query, paging.list_count, paging.cur_page, paging.page_count, paging.no_paging)
  }

  getRecommendCurriculumList = async (curriculum_seq = null, group_seq = null) => {
    const query = this.getCurriculumQuery();
    query.where(`${this.table_name}.status`, 'in', ['2', '1']);
    if (curriculum_seq) {
      query.andWhere(`${this.table_name}.seq`, '!=', curriculum_seq);
    }
    if (group_seq) {
      query.andWhere(`${this.table_name}.group_seq`, group_seq);
    }
    query.orderBy(`${this.table_name}.seq`, 'desc');
    query.limit(2);

    return query;
  }

}
