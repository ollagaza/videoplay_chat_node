process.env.NODE_ENV = 'development'
process.env.SERVER_MODE = 'demon'
process.env.PRINT_DB_LOG = 'true'
process.env.LOCAL = 'true'

require('./index.js')
