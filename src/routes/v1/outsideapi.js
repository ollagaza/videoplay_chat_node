import _ from 'lodash'
import { Router } from 'express'
import ServiceConfig from '../../service/service-config'
import Wrap from '../../utils/express-async'
import Util from '../../utils/Util'
import StdObject from '../../wrapper/std-object'

const routes = Router()

routes.post('/searchHosp', Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()

  const searchText = req.body.searchText
  const pageNo = req.body.pageNo === undefined || req.body.pageNo === null ? 1 : req.body.pageNo
  const pageRows = req.body.pageRows === undefined || req.body.pageRows === null ? 10 : req.body.pageRows
  const url = ServiceConfig.get('search_hosp_url')
  const path = ServiceConfig.get('search_hosp_path')
  const apiKey = ServiceConfig.get('search_hosp_key')

  try {
    const params = '?ServiceKey=' + apiKey
      + '&pageNo=' + pageNo
      + '&numOfRows=' + pageRows
      + '&QN=' + encodeURIComponent(searchText)

    const api_options = {
      hostname: url,
      path: path + params,
      method: 'GET'
    }

    const resultList = await Util.httpRequest(api_options, null, false)
    const resultjson = await Util.getXmlToJson(resultList)
    output.add('searchText', searchText)
    output.add('resultList', resultjson)

    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

routes.post('/searchUniv', Wrap(async (req, res) => {
  req.accepts('application/json')
  const output = new StdObject()

  const searchText = req.body.searchText
  const pageNo = req.body.pageNo === undefined || req.body.pageNo === null ? 1 : req.body.pageNo
  const pageRows = req.body.pageRows === undefined || req.body.pageRows === null ? 10 : req.body.pageRows
  const url = ServiceConfig.get('search_univ_url')
  const path = ServiceConfig.get('search_univ_path')
  const apiKey = ServiceConfig.get('search_univ_key')

  try {
    const params = '?apiKey=' + apiKey
      + '&svcType=api&svcCode=SCHOOL&contentType=json&gubun=univ_list'
      + '&thisPage=' + pageNo
      + '&perPage=' + pageRows
      + '&searchSchulNm=' + encodeURIComponent(searchText)

    const api_options = {
      hostname: url,
      path: path + params,
      method: 'GET'
    }

    const resultList = await Util.httpRequest(api_options, null, true)

    const univ_list = JSON.parse(resultList).dataSearch.content;

    for (let univ_cnt = 0; univ_cnt < univ_list.length; univ_cnt++) {
      if (univ_list[univ_cnt].campusName === 'null') {
        univ_list[univ_cnt].campusName = ''
      }
    }

    output.add('searchText', searchText)
    output.add('resultList', univ_list)
    res.json(output)
  } catch (e) {
    throw new StdObject(-1, e, 400)
  }
}))

export default routes
