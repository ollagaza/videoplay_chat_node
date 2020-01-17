export default {
  local: {
    client: 'mysql',
    connection: {
      database: 'naver_storage',
      user: 'root',
      password: '_media_'
    },
    pool: {
      min: 10,
      max: 20
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  development: {
    client: 'mysql',
    connection: {
      host: '10.41.170.177',
      database: 'naver_storage',
      user: 'root',
      password: '_media_'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  },

  production: {
    client: 'mysql',
    connection: {
      database: 'naver_storage',
      user: 'root',
      password: '_media_'
    },
    pool: {
      min: 10,
      max: 20
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

}
