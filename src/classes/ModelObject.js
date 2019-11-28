import Promise from 'promise';
import PageHandler from '@/classes/PageHandler';
import log from '@/classes/Logger';
import _ from 'lodash';

const LOG_PREFIX = '[ModelObject]';

const queryGenerator = (database, table_name, selectable_fields, filters=null, columns=null, order=null, group=null) => {
  let oKnex = null;
  if (!columns) {
    oKnex = database.select(selectable_fields);
  }
  else {
    oKnex = database.select(arrayToSafeQuery(database, columns));
  }
  oKnex.from(table_name);

  if (filters) {
    queryWhere(oKnex, filters);
  }

  if (group != null){
    oKnex.groupBy(group);
  }

  if (order != null){
    oKnex.orderBy(order.name, order.direction);
  }
  return oKnex;
};

const queryWhere = (oKnex, filters) => {
  log.d(null, LOG_PREFIX, 'queryWhere', filters);
  if(filters.is_new !== true) {
    setQueryValues(oKnex, filters, false);
  } else {
    jsonWhere(oKnex, filters, false, false, 'queryWhere');
  }
};

const jsonWhere = (oKnex, filters, is_or=false, is_or_key=false, caller='') => {
  log.d(null, LOG_PREFIX, 'jsonWhere', filters, is_or, caller);
  const callback = function() {
    Object.keys(filters).forEach((key) => {
      if (key === 'is_new') {
        return;
      }
      const replaced_key = key.replace("@", "").toLowerCase();
      if(replaced_key === "or") {
        jsonWhere(this, filters[key], is_or, true, 'jsonWhere');
      } else if(replaced_key === "and") {
        jsonWhere(this, filters[key], is_or, false, 'jsonWhere');
      } else {
        setQueryValues(this, key, filters[key], is_or_key);
      }
    });
  };
  if (is_or) {
    oKnex.orWhere(callback);
  } else {
    oKnex.andWhere(callback);
  }
};

const setQueryValues = (oKnex, key, values, is_or=false) => {
  log.d(null, LOG_PREFIX, 'setQueryValues', values, is_or);
  if (_.isArray(values)) {
    setQueryValue(oKnex, key, values, is_or);
  } else if (_.isObject(values)) {
    Object.keys(values).forEach((key) => {
      if (key === 'is_new') {
        return;
      }
      const replaced_key = key.replace("@", "").toLowerCase();
      if(replaced_key === "or") {
        jsonWhere(oKnex, values[key], is_or, true, 'setQueryValues');
      } else if(replaced_key === "and") {
        jsonWhere(oKnex, values[key], is_or, false, 'setQueryValues');
      } else {
        setQueryValue(oKnex, key, values[key], is_or);
      }
    });
  } else {
    setQueryValue(oKnex, key, values, is_or);
  }
};

const setQueryValue = (oKnex, key, value, is_or=false) => {
  let function_name = null;
  const prefix = key.charAt(0);
  const args = [];
  if (prefix === '!') {
    args.push(key.replace("!", ""));
    args.push(value);
    function_name = is_or ? 'orWhereNot' : 'whereNot';
  } else if (prefix === '%') {
    args.push(key.replace("%", ""));
    args.push('like');
    args.push(`%${value}%`);
    function_name = is_or ? 'orWhere' : 'andWhere';
  } else if (Array.isArray(value)) {
    const value_type = value[0];
    args.push(key);
    if (value_type === "between") {
      function_name = is_or ? 'orWhereBetween' : 'whereBetween';
    } else if (value_type === "in") {
      function_name = is_or ? 'orWhereIn' : 'whereIn';
    } else if (value_type === "notin") {
      function_name = is_or ? 'orWhereNotIn' : 'whereNotIn';
    } else {
      args.push(value_type);
      function_name = is_or ? 'orWhere' : 'where';
    }
    args.push(value.slice(1));
  } else {
    args.push(key);
    args.push(value);
    function_name = is_or ? 'orWhere' : 'andWhere';
  }
  log.d(null, LOG_PREFIX, 'setQueryValue', key, value, is_or, function_name, args);
  oKnex[function_name].apply(oKnex, args);
};

const arrayToSafeQuery = (database, columns) => {
  if (!columns) {
    return ["*"];
  }

  const select = [];
  const function_column = /\(.+\)/i;
  Object.keys(columns).forEach((key) => {
    const column = columns[key];
    if (function_column.test(column)) {
      select.push(database.raw(columns[key]));
    } else {
      select.push(columns[key]);
    }
  });

  return select;
};

export default class ModelObject {
  constructor({ database }) {
    this.database = database;
    this.table_name = '';
    this.selectable_fields = [];
  }

  create = async (params, returning=null) => {
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
  };

  update = async (filters, params) => {
    return await this.database
      .update(params)
      .from(this.table_name)
      .where(filters);
  };

  updateIn = async (key, in_array, params, filters=null) => {
    const oKnex = this.database
      .update(params)
      .from(this.table_name)
      .whereIn(key, in_array);
    if (filters) {
      oKnex.andWhere(filters);
    }
    return await oKnex;
  };

  delete = async (filters) => {
    return this.database
      .from(this.table_name)
      .where(filters)
      .del();
  };

  queryBuilder = (filters=null, columns=null, order=null, group=null) => {
    return queryGenerator(this.database, this.table_name, this.selectable_fields, filters, columns, order, group);
  };

  findPaginated = async ({ list_count = 20, page = 1, page_count = 10, no_paging = 'n', ...filters }, columns=null, order=null) => {
    const oKnex = this.queryBuilder(filters, columns, order);
    return await this.queryPaginated(oKnex, list_count, page, page_count, no_paging);
  };

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
    return await this.queryBuilder(filters, columns, order, group);
  }

  async findOne(filters=null, columns=null, order=null, group=null) {
    const oKnex = this.queryBuilder(filters, columns, order, group);
    oKnex.first();

    return await oKnex;
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
    arrayToSafeQuery(this.database, columns);
  };
}
