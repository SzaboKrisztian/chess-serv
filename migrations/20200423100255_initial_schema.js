exports.up = function(knex) {
  return knex.schema

    .createTable('roles', (table) => {
      table.increments('id');
      table.string('role').unique().notNullable();
    })

    .createTable('users', (table) => {
      table.increments('id');
      table.string('username').unique().notNullable();
      table.string('email').unique().notNullable();
      table.string('password').notNullable();
      table.boolean('active').defaultTo(false);
      table.integer('role_id').unsigned().notNullable();
      table.foreign('role_id').references('id').inTable('roles');
      table.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
      table.dateTime('updated_at').defaultTo(knex.raw('NULL ON UPDATE CURRENT_TIMESTAMP'));
    })

    .createTable('tokens', (table) => {
      table.increments('id');
      table.integer('user_id').unsigned().notNullable();
      table.foreign('user_id').references('id').inTable('users');
      table.string('token').unique().notNullable();
      table.boolean('used').defaultTo(false);
      table.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
      table.dateTime('updated_at').defaultTo(knex.raw('NULL ON UPDATE CURRENT_TIMESTAMP'));
    })

    .createTable('games', (table) => {
      table.increments('id');
      table.string('white_user').notNullable();
      table.string('white_email').notNullable();
      table.string('black_user').notNullable();
      table.string('black_email').notNullable();
      table.json('data').notNullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
      table.dateTime('updated_at').defaultTo(knex.raw('NULL ON UPDATE CURRENT_TIMESTAMP'));
    })

    .createTable('invitations', (table) => {
      table.increments('id');
      table.integer('inviter_id').unsigned().notNullable();
      table.foreign('inviter_id').references('id').inTable('users');
      table.string('invitee_email').notNullable();
      table.boolean('accepted').notNullable().defaultTo(false);
      table.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
      table.dateTime('updated_at').defaultTo(knex.raw('NULL ON UPDATE CURRENT_TIMESTAMP'));
    })

    .createTable('messages', (table) => {
      table.increments('id');
      table.integer('author_id').unsigned().notNullable();
      table.foreign('author_id').references('id').inTable('users');
      table.integer('game_id').unsigned().notNullable();
      table.foreign('game_id').references('id').inTable('games');
      table.text('message').notNullable();
      table.dateTime('created_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP'));
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('messages')
    .dropTableIfExists('invitations')
    .dropTableIfExists('games')
    .dropTableIfExists('tokens')
    .dropTableIfExists('users')
    .dropTableIfExists('roles');
};
