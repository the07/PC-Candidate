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

app.controller('userProfileController', function($scope, $location, appFactory) {

	$scope.requestRecord = function(index) {
		console.log("Index of the requested record: " + index);
		appFactory.requestAccess(index, function(data){
			console.log(data);
			alert(data);
		})
	}

	var	keys = sessionStorage.getItem("orgKeys");
	$scope.publicKey = JSON.parse(keys).pubkey;
	console.log('Hey there' + $scope.publicKey);
	$scope.getUser = function() {

		$scope.allOrgs = [];

		appFactory.getAllOrgs(function(data) {
			console.log("Something is cooking.");
			console.log(data);
			for (var i = 0; i < data.length; i++) {
				console.log(data[i])
				var organization = {};
				organization.key = data[i].Org;
				var profile = data[i].Details.profile;
				if (profile !== "NULL") {
					var profileJSON = JSON.parse(profile)
					var name = profileJSON.companyName;
					organization.fullName = name;
					$scope.allOrgs.push(organization);
				}
			}
			console.log($scope.allOrgs)
		})
		console.log($location.search().id);
		var id = $location.search().id;
		$scope.allUsers = [];
		$scope.currentUser = {};
		$scope.access_array = [];

		appFactory.getRecordAccess(function(data) {
			for (var i = 0; i < data.length; i++) {
				var keys = data[i].Key.split("-")
				var access_data = {};
				access_data.index = keys[1]
				if (data[i].Access.data !== "ENCRYPTED") {
					var unencrypted = JSON.parse(data[i].Access.data)
					if (unencrypted.type == 1) {
						access_data.data = unencrypted.marks
					} else {
						access_data.data = unencrypted.salary
					}
				} else {
					access_data.data = "XXXXXXXXXXXX"
				}
				$scope.access_array.push(access_data)
			}
			console.log("Access on user page " + $scope.access_array);
		})

		appFactory.getAllUsers(function(data) {
			console.log("Hello All Users");
			var userList = [];
			$scope.allUsers = data; 	
			for (var k = 0; k < data.length; k++) {
				if (data[k].Details.public_key == id) {
					$scope.current_user = data[k];
					$scope.current_user.profile = JSON.parse($scope.current_user.Details.profile);
					var array = [];
					var pro_array = [];
					appFactory.queryAllRecord(function(data) {
						console.log("Querying: " + JSON.stringify(data));
						for (var i=0; i < data.length; i++) {
							console.log("Looking for profile" + id)
							if (data[i].Record.user == id) {
								console.log("Reached here")
								var record = {};
								var record_data = JSON.parse(data[i].Record.data);
								record_data.index = data[i].Key;
								for (var j = 0; j < $scope.allOrgs.length; j++) {
									if ($scope.allOrgs[j].key == record_data.institute) {
										record.org = $scope.allOrgs[j].fullName;
									}
								}	
								console.log("official" + JSON.stringify(record_data));
								
								console.log(data[i].Record.organization + " " +  $scope.publicKey)
								if (data[i].Record.organization == $scope.publicKey) {
									if (record_data.type == 1) {
										record.hide = true;										
										record.index = record_data.index;
										record.grade = record_data.grade;
										record.status = data[i].Record.Status;
										record.private = record_data.marks;
										record.join = record_data.join;
										record.finish = record_data.finish;
										if (record.status == "PENDING") {
											record.statusClass = "inpregress";
										} else if (record.status == "DECLINED") {
											record.statusClass = "declined";
										} else if (record.status == "SIGNED") {
											record.statusClass = "signed";
										}
										array.push(record);
									}
		
									if (record_data.type == 2){
										record.hide = true;
										record.index = record_data.index;
										record.title = record_data.title;
										record.status = data[i].Record.Status;
										record.from = record_data.from;
										if (!record_data.to) {
											record.to = "Present";
										} else {
											record.to = record_data.to;
										}
										record.location = record_data.location;
										record.private = record_data.salary;
										if (record.status == "PENDING") {
											record.statusClass2 = "inpregress";
										} else if (record.status == "SIGNED") {
											console.log(record.status + record.title);
											record.statusClass2 = "signed";
										} else {
											console.log(record.status + record.title)
											record.statusClass2 = "declined";
										}
										pro_array.push(record);
									}

								} else {
									record.private = "XXXXXXXXXXXX";
									for (var m = 0; m < $scope.access_array.length; m++) {
										if (record_data.index == $scope.access_array[m].index) {
											record.private = $scope.access_array[m].data;
											record.hide = true;
										}
									}
									if (record_data.type == 1) {
										record.index = record_data.index;
										record.grade = record_data.grade;
										record.status = data[i].Record.Status;
										record.join = record_data.join;
										record.finish = record_data.finish;
										if (record.status == "PENDING") {
											record.statusClass = "inpregress";
										} else if (record.status == "DECLINED") {
											record.statusClass = "declined";
										} else if (record.status == "SIGNED") {
											record.statusClass = "signed";
										}
										array.push(record);
									}
		
									if (record_data.type == 2){
										record.index = record_data.index;
										record.title = record_data.title;
										record.status = data[i].Record.Status;
										record.from = record_data.from;
										if (!record_data.to) {
											record.to = "Present";
										} else {
											record.to = record_data.to;
										}
										record.location = record_data.location;
										if (record.status == "PENDING") {
											record.statusClass2 = "inpregress";
										} else if (record.status == "SIGNED") {
											
											record.statusClass2 = "signed";
										} else {
											
											record.statusClass2 = "declined";
										}
										pro_array.push(record);
									}

								}
							}
						}
					})
					
				}
			}

			$scope.education_details = array;
			$scope.professional_details = pro_array;

		})
	}
});

app.controller('profileController', function($scope, $window, appFactory){  

	/* new code on 24-09 */

	$scope.allUsers = [];
	$scope.userList = [];

	appFactory.getAllUsers(function(data) {
		console.log("Hello All Users");
		var userList = [];
		$scope.allUsers = data; 	
		for (var k = 0; k < data.length; k++) {
			var user = {};
			user.profile = JSON.parse(data[k].Details.profile);
			user.name = user.profile.firstName + " " + user.profile.lastName;
			user.pubkey = data[k].Details.public_key;
			$scope.userList.push(user);
		}
		// console.log('All users: ' + $scope.userList);
		// console.log(JSON.parse(data[0].Details.profile));
		// console.log(data[0].Details.public_key);
	})

	$scope.viewProfile = function(e) {
		if (e.which === 13) {
			var url = $scope.selectedProfile;
			appFactory.viewProfile(url, function(data){
				console.log(data)
			})
		}
	}

	/* until here */

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
						for (var j = 0; j < $scope.allUsers.length; j++) {
							if (data[i].Record.user == $scope.allUsers[j].Details.public_key) {
								var profile_json = JSON.parse($scope.allUsers[j].Details.profile)
								data[i].Record.name = profile_json.firstName + " " + profile_json.lastName
							}
						}
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
				console.log("Connectted Records:" + array);
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
					var unencrypted = JSON.parse(rec_data.data)
					if (unencrypted.type == 1) {
						rec_data.data = {
							"institute": unencrypted.institute,
							"join": unencrypted.join,
							"finish": unencrypted.finish,
							"marks": unencrypted.marks,
							"grade": unencrypted.grade,
						}
					}
					else {
						rec_data.data = {
							"institute": unencrypted.institute,
							"title": unencrypted.title,
							"salary": unencrypted.salary,
							"from": unencrypted.from,
							"desc": unencrypted.desc,
						}
					}
				}
				array.push(rec_data);
			}
			$scope.validated = array;
		})
    }
});

app.controller('requestController', function($scope, $window, appFactory){

	console.log('Requesting for page');

	$scope.allUsers = [];

	appFactory.getAllUsers(function(data) {
		console.log("Hello All Users");
		console.log(JSON.parse(data[0].Details.profile));
		console.log(data[0].Details.public_key);
		$scope.allUsers = data;
	})

	$scope.signRecord = function(id) {
		console.log('Signing');
		appFactory.signRecord(id, function(data){
			console.log(data);
			if (data) {
				alert("Record Signed with transaction id: " + data);
				$window.location.reload();
			}
		})
	}
	

	$scope.declineRecord = function(id) {
		console.log('Declined');
		appFactory.declineRecord(id, function(data){
			console.log(data);
			if (data) {
				alert("Record Declined with transaction id: " + data);
				$window.location.reload();
			}
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
						for (var j = 0; j < $scope.allUsers.length; j++) {
							if (data[i].Record.user == $scope.allUsers[j].Details.public_key) {
								var profile_json = JSON.parse($scope.allUsers[j].Details.profile)
								data[i].Record.name = profile_json.firstName + " " + profile_json.lastName
							}
						}
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
						for (var j = 0; j < $scope.allUsers.length; j++) {
							if (data[i].Record.user == $scope.allUsers[j].Details.public_key) {
								var profile_json = JSON.parse($scope.allUsers[j].Details.profile)
								data[i].Record.name = profile_json.firstName + " " + profile_json.lastName
							}
						}
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
						for (var j = 0; j < $scope.allUsers.length; j++) {
							if (data[i].Record.user == $scope.allUsers[j].Details.public_key) {
								var profile_json = JSON.parse($scope.allUsers[j].Details.profile)
								data[i].Record.name = profile_json.firstName + " " + profile_json.lastName
							}
						}
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

app.factory('appFactory', function($http, $window){
    
	var factory = {};
	var current_user = 0;

	factory.getAllOrgs = function(callback){
		var org = sessionStorage.getItem("organization");
		$http.get('/get_all_orgs/'+org).success(function(output) {
			callback(output)
		});
	}

	factory.viewProfile = function(id, callback){
		current_user = id;
		$window.location.href = "./profile-list.html#?id=" + id;
		callback(current_user);
	}
	
	factory.getAllUsers = function(callback){
		var org = sessionStorage.getItem("organization");
		$http.get('/get_all_users/'+org).success(function(output) {
			callback(output)
		});
	} 

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


