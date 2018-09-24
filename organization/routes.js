var peoplechain = require('./controller3.js');

module.exports = function(app){

    app.get('/register_user/:user', function(req, res){
        peoplechain.register_user(req, res);
    });

    app.get('/generateKeyPair/:user', function(req, res){
        peoplechain.generateKeyPair(req, res);
    });

    app.get('/create_profile/:data', function(req, res){
        peoplechain.create_profile(req, res);
    });

    app.get('/get_org_data/:data', function(req, res){
        peoplechain.get_org_data(req, res);
    });

    app.get('/get_all_record/:user', function(req, res){
        peoplechain.get_all_record(req, res);
    });

    app.get('/sign_record/:data', function(req, res){
        peoplechain.sign_record(req, res);
    })

    app.get('/decline_record/:data', function(req, res){
        peoplechain.decline_record(req, res);
    })

    app.get('/request_access/:data', function(req, res){
        peoplechain.request_access(req, res);
    })

    app.get('/get_request_access/:data', function(req, res){
        peoplechain.get_request_access(req, res);
    })

    app.get('/get_all_users/:user', function(req, res) {
        peoplechain.get_all_users(req, res);
    })

    /* app.get('/get_all_record', function(req, res){
        peoplechain.get_all_record(req, res);
    });

    app.get('/decrypt_record/:data', function(req, res){
        peoplechain.decrypt_record(req, res);
    });

    app.get('/sign_record/:id', function(req, res){
        peoplechain.sign_record(req, res);
    });

    app.get('/decline_record/:id', function(req, res){
        peoplechain.decline_record(req, res);
    });

    app.get('/request_access/:request', function(req, res){
        peoplechain.request_access(req, res);
    });

    app.get('/decrypt_request_access/:data', function(req, res){
        peoplechain.decrypt_record_access(req, res);
    }); */
}
