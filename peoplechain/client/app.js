// SPDX-License-Identifier: Apache-2.0

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
		sessionStorage.setItem("keypair", JSON.stringify(this.keys))
		console.log("Setting key");
	}
})


// Angular Controller
app.controller('appController', function($scope, KeyPair,  $window, appFactory){

	$scope.keys = {};
	$scope.is_sign_up = false;

	$scope.$watchCollection('keys', function(newVal, oldVal) {
		if (newVal !== oldVal) {
			console.log("new value"+ JSON.stringify(newVal))
			KeyPair.set_keys(newVal);
		}
	});	

	console.log('KEYPAIR: ' + JSON.stringify(KeyPair.keys))

	$scope.registerUser = function() {

		this.is_sign_up = true;
		console.log($scope.is_sign_up);
		appFactory.registerUser($scope.register, function(data) {
			if (data == 'Success') {
				sessionStorage.setItem("user", $scope.register.url);
				appFactory.generateKeyPair($scope.register, function(data) {
					$scope.keys = {
						"privkey": data.privkey,
						"pubkey": data.pubkey
					}		
					$window.location.href = '/key_pair.html';	
				})	
			}
		})
	}

	$scope.loginUser = function() {
		appFactory.loginUser($scope.user, function(data){
			//Check if success
			//login - start a user session
			//check if is_sign_up is true
			//redirect to basic_info page or profile page based on above result
		})
	}

/* 	$scope.queryAllRecord = function(){

		appFactory.queryAllRecord(function(data){
			var array = [];
			for (var i = 0; i < data.length; i++){
				parseInt(data[i].Key);
				data[i].Record.Key = parseInt(data[i].Key);
				array.push(data[i].Record);
			}
			array.sort(function(a, b) {
			    return parseFloat(a.Key) - parseFloat(b.Key);
			});
			$scope.all_record = array;
		});
	} */

/* 	$scope.generateUserKey = function() {

		appFactory.generateUserKey($scope.user, function(data){
			$scope.key = data;
			$("#generate_form").hide();
		});
	}

	$scope.createRecord = function() {


		var array = $scope.private;
		var array_record = $scope.record;

		var private_data = {};

		// Split the private and public data

		for (var i = 0; i < Object.keys(array).length; i++){
			// Object.keys(array)[i]
			private_data[Object.keys(array)[i]] = array_record[Object.keys(array)[i]];
			delete array_record[Object.keys(array)[i]];
		}		

		// Add private and public data items as string
		var record = array_record.id + "-" + array_record.pubkey + "-" + array_record.privkey + "-" + array_record.orgkey;
		var record_data = {};
		for (var j=4; j < Object.keys(array_record).length; j++) {
			record_data[Object.keys(array_record)[j]] = array_record[Object.keys(array_record)[j]];
		}

		record = record + "-" + JSON.stringify(private_data);
		record = record + "-" + JSON.stringify(record_data);

		console.log(record);

		// Send the string to factory
		appFactory.createRecord(record, function(data){
			$scope.create_record = data;
			$("#success_create").show();
		});
	}
	
	$scope.queryRecord = function() {

		var id = $scope.record_id;

		appFactory.queryRecord(id, function(data){
			$scope.query_record = data;

			if ($scope.query_record == "Could not locate record") {
				console.log();
				$("#error_query").show();
			} else {
				$("#error_query").hide();
			}
		});
	}

	$scope.allowAccess = function() {
		// need 4 arguments from $scope.access

		appFactory.allowAccess($scope.access, function(data){
			$scope.access_sign_id = data;
			$("#access_sign").show();
		});
	}

	$scope.declineAccess = function() {
		// need 2 arguments from $scope.access
		appFactory.declineAccess($scope.access, function(data){
			$scope.access_sign_id = data;
			$("#access_sign").show();
		});
	} */

});

app.controller('keyController', function($scope, KeyPair, $window, appFactory) {

	$scope.keys = sessionStorage.getItem("keypair");
	console.log("Private + " + $scope.keys.pubkey);
	$scope.publicKey = JSON.parse($scope.keys).pubkey;
	$scope.privateKey = JSON.parse($scope.keys).privkey;
	
	console.log('Hello');

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
		console.log($scope.user);
		var dob = $scope.user.dob.toDateString();
		$scope.user.dob = dob;
		appFactory.createProfile($scope.user, function(data) {
			if (data == 'SUCCESS') {
				$window.location.href = '/educational-details.html'
			}
		})
	}
});

app.controller('educationController', function($scope, $window, appFactory) {

	$scope.keys = sessionStorage.getItem("keypair");

	$scope.$watchCollection('keys', function(newVal, oldVal) {
		console.log('Watch running')
		if (newVal !== oldVal) {
			console.log("KEY CONTROLLER");
			$scope.keys = newVal;
		}
		console.log(newVal);
	});
	$scope.publicKey = JSON.parse($scope.keys).pubkey;
	$scope.privateKey = JSON.parse($scope.keys).privkey;

	$scope.addRecord = function() {
		console.log($scope.education);
		$scope.education.privateKey = $scope.privateKey;
		$scope.education.publicKey = $scope.publicKey;	
		$scope.education.type = 1;
		var join = $scope.education.join.toDateString();
		$scope.education.join = join;

		if ($scope.education.finish) {
			var finish = $scope.education.finish.toDateString();
			$scope.education.finish = finish;
 		}
		appFactory.addRecord($scope.education, function(data) {
			console.log(data);
			if (data == 'SUCCESS') {
				$window.location.href = './professional-details.html'
			}
		})
	}
})

app.controller('professionalController', function($scope, $window, appFactory) {

	$scope.keys = sessionStorage.getItem("keypair");

	$scope.$watchCollection('keys', function(newVal, oldVal) {
		console.log('Watch running')
		if (newVal !== oldVal) {
			console.log("KEY CONTROLLER");
			$scope.keys = newVal;
		}
		console.log(newVal);
	});
	$scope.publicKey = JSON.parse($scope.keys).pubkey;
	$scope.privateKey = JSON.parse($scope.keys).privkey;

	$scope.addRecord = function() {
		console.log($scope.professional);
		$scope.professional.privateKey = $scope.privateKey;
		$scope.professional.publicKey = $scope.publicKey;
		$scope.professional.type = 2;	
		var from = $scope.professional.from.toDateString();
		$scope.professional.from = from;

		if ($scope.professional.to) {
			var to = $scope.professional.to.toDateString();
			$scope.professional.to = to;
		}
		appFactory.addRecord($scope.professional, function(data) {
			console.log(data);
			if (data == 'SUCCESS') {
				$window.location.href = './profile-list.html'
			}
		});
	}
})

app.controller('profileController', function($scope, $window, appFactory){
	
	$scope.getProfile = function() {
		console.log("Fetching profile");
		appFactory.getUserData(function(data) {
			console.log(data);
			var profile = JSON.parse(data.profile);
			$scope.fullName = profile.firstName + " " + profile.lastName;
			$scope.location = profile.address;
			$scope.dob = profile.dob;
			$scope.publicKey = data.public_key;

			var array = [];
			var pro_array = [];
			for (var i = 0; i < data.record.length; i++) {
				var record = {};
				var record_data = JSON.parse(data.record[i].data);
				console.log("official" + record_data);
				if (record_data.type == 1) {
					record.org = record_data.institute;
					record.grade = record_data.grade;
					record.status = data.record[i].Status;
					record.marks = record_data.marks;
					record.join = record_data.join;
					record.finish = record_data.finish;
					array.push(record);
				}

				if (record_data.type == 2){
					record.title = record_data.title;
					record.organization = record_data.institute;
					record.status = data.record[i].Status;
					record.from = record_data.from;
					if (!record_data.to) {
						record.to = "Present";
					} else {
						record.to = record_data.to;
					}
					record.location = record_data.location;
					record.salary = record_data.salary;
					pro_array.push(record);
				}
			}
			$scope.education_details = array;
			$scope.professional_details = pro_array;
			console.log($scope.education_details);
		})
	}
})

app.controller('accessController', function($scope, $window, appFactory) {

	$scope.getAccess = function() {
		appFactory.getAccess(function(data){
			console.log(data);
			var array = [];
			for (var i  = 0; i < data.length; i++){
				var rec_data = data[i].Access
				var keys = data[i].Key.split("-")
				rec_data.index = keys[1]
				rec_data.organization = keys[0]
				if (rec_data.status == "PENDING") {
					array.push(rec_data);
				}
				
			}
			$scope.queue = array;
		})
	}

	$scope.allowAccess = function() {
		console.log("Allowing access")
		appFactory.allowAccess($scope.allow, function(data) {
			console.log(data);
		})
	}

	$scope.declineAccess = function() {
		appFactory.declineAccess($scope.allow, function(data) {
			console.log(data);
		})
	}
})

// Angular Factory
app.factory('appFactory', function($http){

	var factory = {};

	factory.allowAccess = function(data, callback) {
		console.log("Allowing access2")
		var user = sessionStorage.getItem("user");
		var request = user + "-" + data.organizationKey + "-" + data.recordID
		$http.get('/allow_access/'+request).success(function(output){
			callback(output);
		})
	}

	factory.declineAccess = function(data, callback) {
		var user = sessionStorage.getItem("user");
		var request = user + "-" + data.organizationKey + "-" + data.recordID
		$http.get('/decline_access/'+request).success(function(output){
			callback(output);
		})
	}

	factory.getAccess = function(callback) {
		var user = sessionStorage.getItem("user");
		$http.get('/request_record_access/'+user).success(function(output){
			callback(output)
		})
	}

	factory.registerUser = function(data, callback){
		var user_data = data.url + "-" + data.password;
		console.log(user_data);
		$http.get('/register_user/'+user_data).success(function(output){
			console.log(output + "hello");
			callback(output);
		});
	}

	factory.generateKeyPair = function(data, callback) {
		var user_data = data.url + "-" + data.password;
		$http.get('/generateKeyPair/'+user_data).success(function(output) {
			callback(output);
		});
	}

	factory.loginUser = function(data, callback) {
		var user_data = data.profileUrl + "-" + data.password;
		$http.get('/login_user/'+user_data).success(function(output){
			callback(output);
		});
	}

	factory.createProfile = function(data, callback) {
		var profile_data = sessionStorage.getItem("user") + "-" + JSON.stringify(data);
		console.log(profile_data);
		$http.get('create_profile/'+profile_data).success(function(output) {
			callback(output);
		})
	}

	factory.addRecord = function(data, callback) {
		var record_data = sessionStorage.getItem("user") + "-" +  data.index + "-" + data.publicKey + "-" + data.privateKey + "-" + data.institute + "-" + JSON.stringify(data);
		$http.get('/add_record/'+record_data).success(function(output) {
			callback(output);
		})
	}

	factory.getUserData = function(callback) {
		var user = sessionStorage.getItem("user");
		$http.get('/get_user_data/'+user).success(function(output) {
			callback(output);
		})
	}

  /* 	factory.queryAllRecord = function(callback){
  		$http.get('/get_all_record').success(function(output){
			callback(output)
		});
	}

	factory.generateUserKey = function(data, callback){
		var user = data.first + "-" + data.last;
		$http.get('/generate_key/'+user).success(function(output){
			callback(output)
		});
	}

	factory.createRecord = function(data, callback){

		$http.get('/create_record/'+data).success(function(output){
			callback(output)
		});
	}

	factory.queryRecord = function(id, callback) {
		$http.get('/get_record/'+id).success(function(output){
			callback(output)
		});
	}

	factory.allowAccess = function(data, callback) {

		var details = data.id + "-" + data.org + "-" + data.priv;
		$http.get('/grant_access/'+details).success(function(output){
			callback(output)
		});
	}

	factory.declineAccess = function(data, callback) {
		var details = data.id + "-" + data.org;
		$http.get('/decline_access/'+details).success(function(output){
			callback(output)
		});
	}
 */
	return factory;
});
