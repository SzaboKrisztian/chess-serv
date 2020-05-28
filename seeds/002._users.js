exports.seed = function(knex) {
  return knex('roles').select().then(roles => {
    let admin_role = roles.find(role => role.role == "ADMIN");
    return knex('users').insert([
      { username: 'admin', email: 'admin@example.com', password: '$2b$12$qflsqspQ6S85EQ7CMbUgAOt3pePf7E8pAKUHYl0rC99mjuu2hyn5m', active: true, role_id: admin_role.id }
    ]);
  });
};
