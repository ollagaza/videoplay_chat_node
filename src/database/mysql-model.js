import _ from 'lodash'
import Promise from 'promise'
import PageHandler from '../libs/page-handler'
import log from '../libs/logger'

const LOG_PREFIX = '[ModelObject]'

const queryGenerator = (database, table_name, selectable_fields, filters = null, columns = null, order = null, group = null, limit) => {
  let oKnex = null
  if (!columns) {
    oKnex = database.select(selectable_fields)
  } else {
    oKnex = database.select(arrayToSafeQuery(database, columns))
  }
  oKnex.from(table_name)

  if (filters) {
    queryWhere(oKnex, filters)
  }

  if (group != null) {
    oKnex.groupBy(group)
  }

  if (order != null) {
    if (_.isArray(order)) {
      oKnex.orderBy(order)
    } else {
      oKnex.orderBy(order.name, order.direction)
    }
  }
  if (limit !== null) {
    if (limit === 1) {
      oKnex.first()
    } else {
      oKnex.limit(limit)
    }
  }
  return oKnex
}

const queryWhere = (oKnex, filters) => {
  log.debug(LOG_PREFIX, 'queryWhere', filters)
  if (filters.is_new !== true) {
    oKnex.where(filters)
  } else {
    jsonWhere(oKnex, filters.query, false, false, 'queryWhere')
  }
}

const jsonWhere = (oKnex, filters, is_or = false, is_or_key = false, caller = '') => {
  log.debug(LOG_PREFIX, 'jsonWhere', filters, is_or, is_or_key, caller)
  const callback = function () {
    const filter_length = filters.length
    for (let i = 0; i < filter_length; i++) {
      setQueryValues(this, filters[i], is_or_key)
    }
  }
  if (is_or) {
    oKnex.orWhere(callback)
  } else {
    oKnex.andWhere(callback)
  }
}

const setQueryValues = (oKnex, filter_map, is_or = false) => {
  log.debug(LOG_PREFIX, 'setQueryValues', filter_map, is_or)
  Object.keys(filter_map).forEach((key) => {
    const filters = filter_map[key]
    log.debug(LOG_PREFIX, 'setQueryValues', key, filters, is_or)
    if (key === '$or') {
      jsonWhere(oKnex, filters, is_or, true, 'setQueryValues')
    } else if (key === '$and') {
      jsonWhere(oKnex, filters, is_or, false, 'setQueryValues')
    } else {
      setQueryValue(oKnex, key, filters, is_or)
    }
  })
}

const setQueryValue = (oKnex, key, values, is_or = false) => {
  let function_name = null
  const is_value_array = _.isArray(values)
  const operator = is_value_array ? values[0] : null
  const is_not = operator === 'not'
  let args = []
  if (values === null) {
    args.push(key)
    function_name = is_or ? 'orWhereNull' : 'whereNull'
  } else if (is_value_array) {
    args.push(key)
    if (is_not) {
      if (values[1] === null) {
        function_name = is_or ? 'orWhereNotNull' : 'whereNotNull'
      } else {
        args.push(values[1])
        function_name = is_or ? 'orWhereNot' : 'whereNot'
      }
    } else if (operator === 'like') {
      args.push('like')
      args.push(`%${values[1]}%`)
      function_name = is_or ? 'orWhere' : 'andWhere'
    } else if (operator === 'between') {
      function_name = is_or ? 'orWhereBetween' : 'whereBetween'
      args.push(values.slice(1))
    } else if (operator === 'in') {
      function_name = is_or ? 'orWhereIn' : 'whereIn'
      args.push(values.slice(1))
    } else if (operator === 'notin') {
      function_name = is_or ? 'orWhereNotIn' : 'whereNotIn'
      args.push(values.slice(1))
    } else {
      args.push(operator)
      function_name = is_or ? 'orWhere' : 'where'
      args.push(values[1])
    }
  } else {
    args.push(key)
    args.push(values)
    function_name = is_or ? 'orWhere' : 'andWhere'
  }
  log.debug(LOG_PREFIX, 'setQueryValue', key, values, is_or, function_name, args)
  oKnex[function_name].apply(oKnex, args)
}

const arrayToSafeQuery = (database, columns) => {
  if (!columns) {
    return ['*']
  }

  const select = []
  const function_column = /\(.+\)/i
  Object.keys(columns).forEach((key) => {
    const column = columns[key]
    if (function_column.test(column)) {
      select.push(database.raw(columns[key]))
    } else {
      select.push(columns[key])
    }
  })

  return select
}

export default class MysqlModel {
  constructor (database) {
    this.database = database
    this.table_name = ''
    this.selectable_fields = []
  }

  create = async (params, returning = null) => {
    let oKnex = null
    if (returning) {
      oKnex = this.database
        .returning(returning)
        .insert(params)
    } else {
      oKnex = this.database
        .insert(params)
    }
    oKnex.into(this.table_name)

    const result = await oKnex

    return result.shift()
  }

  update = async (filters, params) => {
    const oKnex = this.database
      .update(params)
      .from(this.table_name)

    if (filters) {
      queryWhere(oKnex, filters)
    }

    return oKnex
  }

  updateIn = async (key, in_array, params, filters = null) => {
    const oKnex = this.database
      .update(params)
      .from(this.table_name)
      .whereIn(key, in_array)
    if (filters) {
      oKnex.andWhere(filters)
    }
    return oKnex
  }

  delete = async (filters) => {
    return this.database
      .from(this.table_name)
      .where(filters)
      .del()
  }

  queryBuilder = (filters = null, columns = null, order = null, group = null, limit) => {
    return queryGenerator(this.database, this.table_name, this.selectable_fields, filters, columns, order, group, limit)
  }

  findPaginated = async (filters = null, columns = null, order = null, group = null, pages = null) => {
    const oKnex = this.queryBuilder(filters, columns, order, group)
    return await this.queryPaginated(oKnex, pages.list_count, pages.cur_page, pages.page_count, pages.no_paging)
  }

  async queryPaginated (oKnex, list_count = 20, cur_page = 1, page_count = 10, no_paging = 'n', start_count = 0) {
    // 강제 형변환
    list_count = parseInt(list_count)
    cur_page = parseInt(cur_page)
    page_count = parseInt(page_count)
    start_count = parseInt(start_count)
    const offset_start = parseInt(start_count != 0 ? start_count : list_count)

    const use_paging = (no_paging && no_paging.toLowerCase() !== 'y')

    const oCountKnex = this.database.from(oKnex.clone().as('list'))
    const oDataListKnex = oKnex.clone()
    if (use_paging) {
      oDataListKnex
        .limit(list_count)
        .offset(offset_start * (cur_page - 1))
    }

    // 갯수와 데이터를 동시에 얻기
    const [{ total_count }, data] = await Promise.all([
      oCountKnex.count('* as total_count').first(),
      oDataListKnex
    ])

    if (!use_paging) {
      cur_page = 1
    }

    const calc_total_count = total_count + (start_count !== 0 ? list_count - start_count : 0)

    // 번호 매기기
    let virtual_no = calc_total_count - (cur_page - 1) * list_count
    for (let i = 0; i < data.length; i++) {
      data[i]['_no'] = virtual_no
      virtual_no--
    }

    const total_page = Math.ceil(calc_total_count / list_count) || 1

    return {
      calc_total_count,
      data,
      total_page,
      page_navigation: new PageHandler(calc_total_count, total_page, cur_page, page_count, list_count)
    }
  }

  async find (filters = null, columns = null, order = null, group = null, limit = null) {
    return this.queryBuilder(filters, columns, order, group, limit)
  }

  async findOne (filters = null, columns = null, order = null, group = null, limit = 1) {
    // const oKnex = this.queryBuilder(filters, columns, order, group, limit)
    // oKnex.first()

    return this.queryBuilder(filters, columns, order, group, limit)
  }

  getTotalCount = async (filters) => {
    const result = await this.database.count('* as total_count').from(this.table_name).where(filters).first()
    if (!result || !result.total_count) {
      return 0
    } else {
      return result.total_count
    }
  }

  arrayToSafeQuery = (columns) => {
    arrayToSafeQuery(this.database, columns)
  }

  queryWhere = (oKnex, filter) => {
    queryWhere(oKnex, filter)
  }

  isNumber = (str) => {
    try {
      return !isNaN(parseFloat(str)) && isFinite(str)
    } catch (e) {
      return false
    }
  }

  isArray = (value) => {
    if (!value) {
      return false
    }
    return _.isArray(value)
  }

  isObject = (value) => {
    if (!value) {
      return false
    }
    return _.isObject(value)
  }

  isString = (value) => {
    if (value === '') {
      return true
    }
    if (!value) {
      return false
    }
    return _.isString(value)
  }

  getInt = (str, on_error_result = 0) => {
    if (this.isNumber(str)) {
      try {
        return parseInt(str, 10)
      } catch (e) {
        return on_error_result
      }
    } else {
      return on_error_result
    }
  }

  getAddCountQueryParams = (update_field, field_name_map = null) => {
    const update_params = {}
    let has_params = false
    if (this.isArray(update_field)) {
      update_field.forEach((field_name) => {
        if (field_name_map && !field_name_map[field_name]) return
        update_params[field_name] = this.database.raw(`\`${field_name}\` + 1`)
        has_params = true
      })
    } else if (this.isString(update_field)) {
      if (!field_name_map || field_name_map[update_field]) {
        update_params[update_field] = this.database.raw(`\`${update_field}\` + 1`)
        has_params = true
      }
    } else if (this.isObject(update_field)) {
      Object.keys(update_field).forEach((field_name) => {
        if (field_name_map && !field_name_map[field_name]) return
        const add_count = this.getInt(update_field[field_name], 0)
        if (add_count <= 0) return
        update_params[field_name] = this.database.raw(`\`${field_name}\` + ${add_count}`)
        has_params = true
      })
    }
    if (!has_params) {
      return null
    }
    return update_params
  }

  getMinusCountQueryParams = (update_field, field_name_map = null) => {
    const update_params = {}
    let has_params = false
    if (this.isArray(update_field)) {
      update_field.forEach((field_name) => {
        if (field_name_map && !field_name_map[field_name]) return
        update_params[field_name] = this.database.raw(`IF(\`${field_name}\` > 0, \`${field_name}\` - 1, 0)`)
        has_params = true
      })
    } else if (this.isString(update_field)) {
      if (!field_name_map || field_name_map[update_field]) {
        update_params[update_field] = this.database.raw(`IF(\`${update_field}\` > 0, \`${update_field}\` - 1, 0)`)
        has_params = true
      }
    } else if (this.isObject(update_field)) {
      Object.keys(update_field).forEach((field_name) => {
        if (field_name_map && !field_name_map[field_name]) return
        const minus_count = this.parseInt(update_field[field_name], 0)
        if (minus_count <= 0) return
        update_params[field_name] = this.database.raw(`case when \`${field_name}\` - ${minus_count} > 0 then \`${field_name}\` - ${minus_count} else 0 end`)
        has_params = true
      })
    }
    if (!has_params) {
      return null
    }
    return update_params
  }

  increment = async (filters, params) => {
    const oKnex = this.database
      .increment(params)
      .from(this.table_name)

    if (filters) {
      queryWhere(oKnex, filters)
    }
    return oKnex
  }

  decrement = async (filters, params) => {
    const oKnex = this.database
      .decrement(params)
      .from(this.table_name)

    if (filters) {
      queryWhere(oKnex, filters)
    }
    return oKnex
  }
}
