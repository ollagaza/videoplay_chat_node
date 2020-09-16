import { Router } from 'express'
import Config from '../config/config'
import log from '../libs/logger'

require('babel-plugin-require-context-hook/register')()

const routes = Router()

const files = require.context('.', true, /\/[^.]+\.js$/)
const demon_regex = /.+\/demon\//i

files.keys().forEach((key) => {
  if (key === './index.js') return

  if (files(key).default) {
    if (demon_regex.test(key)) {
      if (!Config.isDemon()) {
        return
      }
    }
    let route_path = key.replace(/(\.)|(js)|(\/index\.js)/g, '')
    log.d(null, 'add api', key, route_path)
    routes.use(route_path, files(key).default)
  }
})

export default routes
