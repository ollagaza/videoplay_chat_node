// Update with your config settings.

export default {

  development: {
    client: 'mysql',
    connection: {
      host : '192.168.1.52',
      database: 'surgbook',
      user:     'root',
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
      database: 'surgbook',
      user:     'root',
      password: '_media_'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'knex_migrations'
    }
  }

};
