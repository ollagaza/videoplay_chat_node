import Promise from 'promise';
import PageHandler from '@/classes/PageHandler';

export default class ModelObject {
  constructor({ database }) {
    this.database = database;
    this.table_name = '';
    this.selectable_fields = [];
  }

  async create(params, returning=null) {
    let oKnex = null;
    if (returning) {
      oKnex = this.database
        .returning(returning)
        .insert(params);
    } else {
      oKnex = this.database
        .insert(params);
    }
    oKnex.into(this.table_name);

    const result = await oKnex;

    return result.shift();
  }

  async update(filters, params) {
    return await this.database
      .update(params)
      .from(this.table_name)
      .where(filters);
  }

  async updateIn(key, in_array, params, filters=null) {
    const oKnex = this.database
      .update(params)
      .from(this.table_name)
      .whereIn(key, in_array);
    if (filters) {
      oKnex.andWhere(filters);
    }
    return oKnex;
  }

  async delete(filters) {
    return await this.database
      .from(this.table_name)
      .where(filters)
      .del();
  }

  async findPaginated({ list_count = 20, page = 1, page_count = 10, no_paging = 'n', ...filters }, columns=null, order=null) {
    const oKnex = this.queryBuilder(filters, columns, order);
    return await this.queryPaginated(oKnex, list_count, page, page_count, no_paging);
  }

  async queryPaginated(oKnex, list_count = 20, cur_page = 1, page_count = 10, no_paging = 'n') {
    // 강제 형변환
    list_count = parseInt(list_count);
    cur_page = parseInt(cur_page);
    page_count = parseInt(page_count);

    const use_paging = (!no_paging || no_paging.toLowerCase() !== 'y');

    const oCountKnex = this.database.from(oKnex.clone().as('list'));
    const oDataListKnex = oKnex.clone();
    if (use_paging) {
      oDataListKnex
        .limit(list_count)
        .offset(list_count * (cur_page - 1));
    }

    // 갯수와 데이터를 동시에 얻기
    const [{ total_count }, data] = await Promise.all([
      oCountKnex.count('* as total_count').first(),
      oDataListKnex
    ]);


    if (use_paging) {
      list_count = total_count;
      cur_page = 1;
    }

    // 번호 매기기
    let virtual_no = total_count - (cur_page - 1) * list_count;
    for(let i = 0; i < data.length; i++) {
      await new Promise(resolve => process.nextTick(resolve));
      data[i] = { ...data[i], _no: virtual_no-- };
    }

    const total_page = Math.ceil(total_count / list_count) || 1;

    return { total_count, data, total_page, page_navigation: new PageHandler(total_count, total_page, cur_page, page_count) }
  }

  async find(filters=null, columns=null, order=null, group=null) {
    const oKnex = this.queryBuilder(filters, columns, order, group);

    return await oKnex;
  }

  async findOne(filters=null, columns=null, order=null, group=null) {
    const oKnex = this.queryBuilder(filters, columns, order, group);
    oKnex.first();

    return await oKnex;
  }

  queryBuilder = (filters=null, columns=null, order=null, group=null) => {
    let oKnex = null;
    if (!columns) {
      oKnex = this.database.select(this.selectable_fields);
    }
    else {
     oKnex = this.database.select(this.arrayToSafeQuery(columns));
    }
    oKnex.from(this.table_name);

    if (filters) {
      this.queryWhere(oKnex, filters);
    }

    if (group != null){
      oKnex.groupBy(group);
    }

    if (order != null){
      oKnex.orderBy(order.name, order.direction);
    }
    return oKnex;
  };

  queryWhere = (oKnex, filters) => {
    if(!filters.is_new || filters.is_new === undefined) {
      Object.keys(filters).forEach((key) => {
        this.publicWhere(oKnex, key, filters);
      });
    } else {
      Object.keys(filters).forEach((key) => {
        if(key.indexOf("@") !== -1) {
          if(key.replace("@", "").toLowerCase() === "or") {
            this.queryOrWhere(oKnex, key, filters);
          } else if(key.replace("@", "").toLowerCase() === "and") {
            this.queryAndWhere(oKnex, key, filters);
          }
        } else {
          this.publicWhere(oKnex, key, filters);
        }
      });
    }
  };

  publicWhere = (oKnex, key, filters) => {
    if(key !== "is_new") {
      if (key.indexOf("!") !== -1) {
        oKnex.whereNot(key.replace("!", ""), filters[key]);
      } else if (key.indexOf("%") !== -1) {
        oKnex.where(key.replace("%", ""), 'like', `%${filters[key]}%`);
      } else if (Array.isArray(filters[key])) {
        this.queryArrayData(oKnex, key, filters[key]);
      } else {
        oKnex.where(key, filters[key]);
      }
    }
  }

  queryArrayData(oKnex, key, filters) {
    if (filters[0] === "between") {
      oKnex.whereBetween(key, filters.slice(1));
    } else if (filters[0] === "in") {
      oKnex.whereIn(key, filters.slice(1));
    } else if (filters[0] === "notin") {
      oKnex.whereNotIn(key, filters.slice(1));
    }
  }

  queryOrWhere = (oKnex, key, filters) => {
    if(key !== "is_new") {
      const orFilter = filters[key];
      Object.keys(orFilter).forEach((orKey) => {
        if (orKey.indexOf("!") !== -1) {
          oKnex.orWhereNot(orKey.replace("!", ""), orFilter[orKey]);
        } else if (orKey.indexOf("%") !== -1) {
          oKnex.orWhere(orKey.replace("%", ""), "like", "%" + orFilter[orKey] + "%");
        } else if (Array.isArray(orFilter[orKey])) {
          this.queryArrayData(oKnex, orKey, orFilter[orKey]);
        } else {
          oKnex.orWhere(filters[orKey]);
        }
      });
    }
  }

  queryAndWhere = (oKnex, key, filters) => {
    if(key !== "is_new") {
      const andFilter = filters[key];
      Object.keys(andFilter).forEach((andKey) => {
        if (andKey.indexOf("!") !== -1) {
          oKnex.andWhereNot(andKey.replace("!", ""), andFilter[andKey]);
        } else if (andKey.indexOf("%") !== -1) {
          oKnex.andWhere(andKey.replace("%", ""), "like", "%" + andFilter[andKey] + "%");
        } else if (Array.isArray(andFilter[andKey])) {
          this.queryArrayData(oKnex, andKey, andFilter[andKey]);
        } else {
          oKnex.andWhere(andFilter[andKey]);
        }
      });
    }
  }

  getTotalCount = async (filters) => {
    const result = await this.database.count('* as total_count').from(this.table_name).where(filters).first();
    if (!result || !result.total_count) {
      return 0;
    } else {
      return result.total_count;
    }
  };

  arrayToSafeQuery = (columns) => {
    if (!columns) {
      return ["*"];
    }

    const select = [];
    const function_column = /\(.+\)/i;
    Object.keys(columns).forEach((key) => {
      const column = columns[key];
      if (function_column.test(column)) {
        select.push(this.database.raw(columns[key]));
      } else {
        select.push(columns[key]);
      }
    });

    return select;
  };
}
