import _ from 'lodash';
import PageHandler from '@/classes/PageHandler';

export default class ModelObject {
  constructor({ database }) {
    this.database = database;
    this.table_name = '';
    this.selectable_fields = [];
  }

  async create(params) {

    const result = await this.database
      .insert(_.omit(params, 'seq'))
      .into(this.table_name);

    return result.shift();
  }

  async update(seq, params) {

    const result = await this.database
      .update(_.omit(params, 'seq'))
      .from(this.selectable_fields)
      .where({ seq });

    return result;
  }

  async findPaginated({ list_count = 20, page = 1, page_count = 10, ...filters }) {
    const oKnex = this.database
      .select(this.selectable_fields)
      .from(this.table_name)
      .where(filters);

    const result = await this.queryPaginated(oKnex, list_count, page, page_count);

    return result;
  }

  async queryPaginated(oKnex, list_count = 20, cur_page = 1, page_count = 10) {
    // 강제 형변환
    list_count = list_count * 1;
    cur_page = cur_page * 1;
    page_count = page_count * 1;

    const oCountKnex = this.database.from(oKnex.clone().as('list'))

    // 갯수와 데이터를 동시에 얻기
    const [{ total_count }, data] = await Promise.all([
      oCountKnex.count('* as total_count').first(),
      oKnex
        .clone()
        .limit(list_count)
        .offset(list_count * (cur_page - 1))
    ])

    // 번호 매기기
    let virtual_no = total_count - (cur_page - 1) * list_count;
    for(let i = 0; i < data.length; i++) {
      await new Promise(resolve => process.nextTick(resolve));
      data[i] = { ...data[i], _no: virtual_no-- };
    }

    const total_page = Math.ceil(total_count / list_count) || 1;

    return { total_count, data, total_page, page_navigation: new PageHandler(total_count, total_page, cur_page, page_count) }
  }

  async find(filters) {
    const result = await this.database
      .select(this.selectable_fields)
      .from(this.table_name)
      .where(filters);

    return result;
  }

  async findOne(filters) {
    const result = await this.database
      .select(this.selectable_fields)
      .from(this.table_name)
      .where(filters)
      .first();

    return result;
  }

  async findBySeq(seq) {
    const result = await this.findOne({ seq });

    return result;
  }
}
