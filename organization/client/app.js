'use strict';

var app = angular.module('application', []);

app.service('KeyPair', function(){

	var that = this;

	this.keys = {
		privkey: "",
		pubkey: ""
	};

	this.set_keys = function(key) {
		console.log(key);
		that.keys.privkey = key.privkey;
		that.keys.pubkey = key.pubkey;
		console.log("new keys: " + JSON.stringify(that.keys))
		sessionStorage.setItem("orgKeys", JSON.stringify(this.keys))
		console.log("Setting key");
	}
})

app.controller('appController', function($scope, KeyPair, $window, appFactory){

    $scope.keys = {};

    $scope.$watchCollection('keys', function(newVal, oldVal) {
		if (newVal !== oldVal) {
			console.log("new value"+ JSON.stringify(newVal))
			KeyPair.set_keys(newVal);
		}
	});	

    $scope.registerUser = function() {
        console.log($scope.organization);
        appFactory.registerUser($scope.organization, function(data) {
            console.log(data);
            if (data == 'Success') {
                sessionStorage.setItem("organization", $scope.organization.url);
                appFactory.generateKeyPair($scope.organization, function(data) {
                    $scope.keys = {
						"privkey": data.privkey,
						"pubkey": data.pubkey
					}		
					$window.location.href = '/key_pair.html';
                })
            }
        })
    }

    
});

app.controller('keyController', function($scope, $window, appFactory){

    $scope.keys = sessionStorage.getItem("orgKeys");

	console.log("Session keys" + $scope.keys);

	$scope.publicKey = JSON.parse($scope.keys).pubkey;
	$scope.privateKey = JSON.parse($scope.keys).privkey;
    
    $scope.$watchCollection('keys', function(newVal, oldVal) {
		console.log('Watch running')
		if (newVal !== oldVal) {
			console.log("KEY CONTROLLER");
			$scope.keys = newVal;
		}
		console.log(newVal);
    });
    
    $scope.copyKeyPair = function() {
		console.log('Hello copy!');
		var el = document.createElement('textarea');
		// Set value (string to be copied)
		el.value = $scope.keys;
		// Set non-editable to avoid focus and move outside of view
		el.setAttribute('readonly', '');
		el.style = {position: 'absolute', left: '-9999px'};
		document.body.appendChild(el);
		// Select text inside element
		el.select();
		// Copy text to clipboard
		document.execCommand('copy');
		// Remove temporary element
		document.body.removeChild(el);
		alert('Key pair copied to clipboard, please paste and save it somewhere safe.')
    }
    
    $scope.continue = function() {
		$window.location.href = '/basic-info.html';
	}
});

app.controller('basicInfoController', function($scope, $window, appFactory) {
	console.log("Basic info");

	$scope.continue = function() {
		console.log('Next page');
		appFactory.createProfile($scope.org, function(data) {
			if (data == 'SUCCESS') {
				$window.location.href = '/organization-profile.html'
			}
		})
	}
});

app.controller('profileController', function($scope, $window, appFactory){  
    $scope.getProfile = function() {
        appFactory.getOrgsData(function(data){
			console.log(data);
			var profile = JSON.parse(data.profile);
			$scope.orgName = profile.companyName;
			$scope.orgType = profile.type;
			$scope.orgLocation = profile.location;
			$scope.orgDesc = profile.desc;
			$scope.orgPub = data.public_key;
			appFactory.queryAllRecord(function(data) {
				console.log(data);
				var array = [];
				for (var i = 0; i < data.length; i++) {
					if (data[i].Record.organization == $scope.orgPub && data[i].Record.Status == "PENDING") {
						var rec_data = JSON.parse(data[i].Record.data);
						if (rec_data.type == 1) {
							data[i].Record.title = rec_data.grade;
							data[i].Record.location = rec_data.location;
							data[i].Record.from = rec_data.join;
							if (!rec_data) {
								data[i].Record.to = "Present";
							}else {
								data[i].Record.to = rec_data.finish;
							}
							data[i].Record.private = rec_data.marks;
							array.push(data[i].Record);
							$scope.record_length = array.length;
						} else {
							data[i].Record.title = rec_data.title;
							data[i].Record.location = rec_data.location;
							data[i].Record.from = rec_data.from;
							if (!data[i].Record.to) {
								data[i].Record.to = "Present";
							}else {
								data[i].Record.to = rec_data.to;
							}
							data[i].Record.private = rec_data.salary;
							array.push(data[i].Record);
							$scope.record_length = array.length;
						}
					}
				}
				$scope.orgRecords = array;
				console.log("Connectted Records:" + array[0].data);
			})
        })
    }
});

app.controller('accessController', function($scope, $window, appFactory) {

	$scope.requestRecord = function() {
		appFactory.requestAccess($scope.recordID, function(data){
			console.log(data);
		})
	}

	$scope.getProfile = function() {
        appFactory.getOrgsData(function(data){
			console.log(data);
			var profile = JSON.parse(data.profile);
			$scope.orgName = profile.companyName;
			$scope.orgType = profile.type;
			$scope.orgLocation = profile.location;
			$scope.orgDesc = profile.desc;
			$scope.orgPub = data.public_key;
			appFactory.queryAllRecord(function(data) {
				console.log(data);
				var array = [];
				for (var i = 0; i < data.length; i++) {
					if (data[i].Record.organization !== $scope.orgPub) {
						var rec_data = JSON.parse(data[i].Record.data);
						var record = {};
						record.index = parseInt(data[i].Key)
						record.user = data[i].Record.user;
						record.data = data[i].Record.hash;
						record.organization = data[i].Record.organization;
						array.push(record);
						/* if (rec_data.type == 1) {
							data[i].Record.index = parseInt(data[i].Key)
							data[i].Record.title = rec_data.grade;
							data[i].Record.location = rec_data.location;
							data[i].Record.from = rec_data.join;
							if (!rec_data) {
								data[i].Record.to = "Present";
							}else {
								data[i].Record.to = rec_data.finish;
							}
							data[i].Record.private = rec_data.marks;
							array.push(data[i].Record);
							$scope.record_length = array.length;
						} else {
							data[i].Record.index = parseInt(data[i].Key)
							data[i].Record.title = rec_data.title;
							data[i].Record.location = rec_data.location;
							data[i].Record.from = rec_data.from;
							if (!data[i].Record.to) {
								data[i].Record.to = "Present";
							}else {
								data[i].Record.to = rec_data.to;
							}
							data[i].Record.private = rec_data.salary;
							array.push(data[i].Record);
							$scope.record_length = array.length;
						} */
					}
				}
				$scope.all = array;
				console.log("Connectted Records:" + array[0].data);
			})
		})

		appFactory.getRecordAccess(function(data){
			console.log("Access" + data);
			var array = [];
			for (var i  = 0; i < data.length; i++){
				var rec_data = data[i].Access
				var keys = data[i].Key.split("-")
				rec_data.index = keys[1]
				if (rec_data.data !== "ENCRYPTED") {
					var some_Data = {};
					var unencrypted = JSON.parse(rec_data.data)
					some_Data.title = unencrypted.title;
					some_Data.salary = unencrypted.salary;
					some_Data.location = unencrypted.location;
					some_Data.desc = unencrypted.desc;
					rec_data.data = some_Data
				}
				console.log("Unencrypted: " + unencrypted);
				array.push(rec_data);
			}
			$scope.validated = array;
		})
    }
});

app.controller('requestController', function($scope, $window, appFactory){

	console.log('Requesting for page');

	$scope.signRecord = function() {
		console.log('Signing');
		var id = $scope.recordID;
		appFactory.signRecord(id, function(data){
			console.log(data);
		})
	}
	

	$scope.declineRecord = function() {
		console.log('Declined');
		var id = $scope.recordID;
		appFactory.declineRecord(id, function(data){
			console.log(data);
		})
	}

	$scope.getProfile = function() {
        appFactory.getOrgsData(function(data){
			console.log(data);
			var profile = JSON.parse(data.profile);
			$scope.orgName = profile.companyName;
			$scope.orgType = profile.type;
			$scope.orgLocation = profile.location;
			$scope.orgDesc = profile.desc;
			$scope.orgPub = data.public_key;
			appFactory.queryAllRecord(function(data) {
				console.log(data);
				var pendingarray = [];
				var signedarray = [];
				var declinedarray = [];
				for (var i = 0; i < data.length; i++) {
					if (data[i].Record.organization == $scope.orgPub && data[i].Record.Status == "PENDING") {
						var rec_data = JSON.parse(data[i].Record.data);
						if (rec_data.type == 1) {
							data[i].Record.index = parseInt(data[i].Key)
							data[i].Record.title = rec_data.grade;
							data[i].Record.location = rec_data.location;
							data[i].Record.from = rec_data.join;
							if (!rec_data) {
								data[i].Record.to = "Present";
							}else {
								data[i].Record.to = rec_data.finish;
							}
							data[i].Record.private = rec_data.marks;
							pendingarray.push(data[i].Record);
							
						} else {
							data[i].Record.index = parseInt(data[i].Key)
							data[i].Record.title = rec_data.title;
							data[i].Record.location = rec_data.location;
							data[i].Record.from = rec_data.from;
							if (!data[i].Record.to) {
								data[i].Record.to = "Present";
							}else {
								data[i].Record.to = rec_data.to;
							}
							data[i].Record.private = rec_data.salary;
							pendingarray.push(data[i].Record);
						}
					}
					if (data[i].Record.organization == $scope.orgPub && data[i].Record.Status == "SIGNED") {
						var rec_data = JSON.parse(data[i].Record.data);
						if (rec_data.type == 1) {
							data[i].Record.index = parseInt(data[i].Key)
							data[i].Record.title = rec_data.grade;
							data[i].Record.location = rec_data.location;
							data[i].Record.from = rec_data.join;
							if (!rec_data) {
								data[i].Record.to = "Present";
							}else {
								data[i].Record.to = rec_data.finish;
							}
							data[i].Record.private = rec_data.marks;
							signedarray.push(data[i].Record);
							
						} else {
							data[i].Record.index = parseInt(data[i].Key)
							data[i].Record.title = rec_data.title;
							data[i].Record.location = rec_data.location;
							data[i].Record.from = rec_data.from;
							if (!data[i].Record.to) {
								data[i].Record.to = "Present";
							}else {
								data[i].Record.to = rec_data.to;
							}
							data[i].Record.private = rec_data.salary;
							signedarray.push(data[i].Record);
						}
					}
					if (data[i].Record.organization == $scope.orgPub && data[i].Record.Status == "DECLINED") {
						var rec_data = JSON.parse(data[i].Record.data);
						if (rec_data.type == 1) {
							data[i].Record.index = parseInt(data[i].Key)
							data[i].Record.title = rec_data.grade;
							data[i].Record.location = rec_data.location;
							data[i].Record.from = rec_data.join;
							if (!rec_data) {
								data[i].Record.to = "Present";
							}else {
								data[i].Record.to = rec_data.finish;
							}
							data[i].Record.private = rec_data.marks;
							declinedarray.push(data[i].Record);
							
						} else {
							data[i].Record.index = parseInt(data[i].Key)
							data[i].Record.title = rec_data.title;
							data[i].Record.location = rec_data.location;
							data[i].Record.from = rec_data.from;
							if (!data[i].Record.to) {
								data[i].Record.to = "Present";
							}else {
								data[i].Record.to = rec_data.to;
							}
							data[i].Record.private = rec_data.salary;
							declinedarray.push(data[i].Record);
						}
					}
				}
				$scope.queue = pendingarray;
				$scope.validated = signedarray;
				$scope.rejected = declinedarray;
				console.log("Connectted Records:" + pendingarray);
			})
        })
    }
});

app.factory('appFactory', function($http){
    
    var factory = {};

    factory.registerUser = function(data, callback) {
        var user_data = data.url + "-" + data.password;
        $http.get('/register_user/'+user_data).success(function(output){
            callback(output);
        });
    }

    factory.generateKeyPair = function(data, callback) {
        var user_data = data.url + "-" + data.password;
        $http.get('/generateKeyPair/'+user_data).success(function(output){
            callback(output);
        });
    }

    factory.createProfile = function(data, callback) {
		var	keys = sessionStorage.getItem("orgKeys");
		var publicKey = JSON.parse(keys).pubkey;
		console.log('Hey there' + publicKey);
        var profile_data = publicKey + "-" + sessionStorage.getItem("organization") + "-" + JSON.stringify(data);
		console.log(profile_data);
		$http.get('create_profile/'+profile_data).success(function(output) {
			callback(output);
		});
    }

    factory.getOrgsData = function(callback) {
        var	keys = sessionStorage.getItem("orgKeys");
		var publicKey = JSON.parse(keys).pubkey;
		var org = sessionStorage.getItem("organization");
		var data = org + "-" + publicKey;
		console.log('Hey there' + publicKey);
        console.log('Hello ' + org);
        $http.get('/get_org_data/'+data).success(function(output){
            callback(output);
        });
	}
	
	factory.queryAllRecord = function(callback){
		var org = sessionStorage.getItem("organization");
		$http.get('/get_all_record/'+org).success(function(output){
		  callback(output)
	  });
	}

	factory.signRecord = function(id, callback){
		var org = sessionStorage.getItem("organization");
		var data = org + "-" + id;
        $http.get('/sign_record/'+data).success(function(output){
            callback(output);
        });
	}
	
	factory.declineRecord = function(id, callback){
		var org = sessionStorage.getItem("organization");
		var data = org + "-" + id;
        $http.get('/decline_record/'+data).success(function(output){
            callback(output);
        });
	}
	
	factory.requestAccess = function(data, callback){
		var	keys = sessionStorage.getItem("orgKeys");
		var publicKey = JSON.parse(keys).pubkey;
		var org = sessionStorage.getItem("organization");
        var request = org + "-" + data + "-" + publicKey;
        $http.get('/request_access/'+request).success(function(output){
            callback(output);
        });
	}
	
	factory.getRecordAccess = function(callback){
		var	keys = sessionStorage.getItem("orgKeys");
		var publicKey = JSON.parse(keys).pubkey;
		var org = sessionStorage.getItem("organization");
        var request = org + "-" + publicKey;
		$http.get('/get_request_access/'+request).success(function(output){
			callback(output);
		})
	}

    return factory;

});

