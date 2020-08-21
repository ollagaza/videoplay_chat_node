export default {
  local: {
    client: 'mysql',
    connection: {
      database: 'surgbook',
      user: 'root',
      password: '_media_',
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
      database: 'surgbook',
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
      host: '10.41.177.71',
      database: 'surgbook',
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
