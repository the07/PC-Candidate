var peoplechain = require('./controller2.js');

module.exports = function(app) {

  app.get('/register_user/:data', function(req, res){
    peoplechain.register_user(req, res);
  })

  app.get('/generateKeyPair/:data', function(req, res){
    peoplechain.generateKeyPair(req, res);
  })

  app.get('/login_user/:data', function(req, res){
    peoplechain.login_user(req, res);
  })

  app.get('/create_profile/:data', function(req, res){
    peoplechain.create_profile(req, res);
  })

  app.get('/add_record/:data', function(req, res){
    peoplechain.add_record(req, res);
  })

  app.get('/get_user_data/:user', function(req, res) {
    peoplechain.get_user_data(req, res);
  })

  app.get('/request_record_access/:user', function(req, res) {
    peoplechain.request_record_access(req, res);
  })

  app.get('/allow_access/:data', function(req, res){
    peoplechain.allow_access(req, res);
  })

  app.get('/decline_access/:data', function(req, res){
    peoplechain.decline_access(req, res);
  })

  app.get('/get_all_record/:user', function(req, res) {
    peoplechain.get_all_record(req, res);
  })

  app.get('/get_all_orgs/:user', function(req, res){
    peoplechain.get_all_orgs(req, res);
  })

/*   app.get('/get_all_record', function(req, res){
    peoplechain.get_all_record(req, res);
  });

  app.get('/generate_key/:user', function(req, res){
    peoplechain.generate_key(req, res);
  });

  app.get('/create_record/:record', function(req, res){
    peoplechain.create_record(req, res);
  });

  app.get('/get_record/:id', function(req, res){
    peoplechain.get_record(req, res);
  });

  app.get('/grant_access/:details', function(req, res){
    peoplechain.grant_access(req, res);
  });

  app.get('/decline_access/:details', function(req, res){
    peoplechain.decline_access(req, res);
  }); */

}
