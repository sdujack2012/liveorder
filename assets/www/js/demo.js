// 
// Here is how to define your module 
// has dependent on mobile-angular-ui
// 
var app = angular.module('LiveOrder', [
  'ngRoute',
  'mobile-angular-ui',
  
  // touch/drag feature: this is from 'mobile-angular-ui.gestures.js'
  // it is at a very beginning stage, so please be careful if you like to use
  // in production. This is intended to provide a flexible, integrated and and 
  // easy to use alternative to other 3rd party libs like hammer.js, with the
  // final pourpose to integrate gestures into default ui interactions like 
  // opening sidebars, turning switches on/off ..
  'mobile-angular-ui.gestures'
]);
app.factory('mySharedService', function($rootScope) {
    var sharedService = {};
    
    sharedService.message = '';
	sharedService.target = '';
	sharedService.description = '';
	sharedService.broadcastItem = function() {
        $rootScope.$broadcast('handleBroadcast');
		
    };
    sharedService.prepForBroadcast = function(msg,target,description) {
        sharedService.message = msg;
		sharedService.target = target;
		sharedService.description = description;
		
        sharedService.broadcastItem();
    };
    return sharedService;
});
app.factory('myHttpResponseInterceptor',function ($q,$rootScope,$log,$location,SharedState) {
    return {
      // On request success
      request: function (config) {
        // console.log(config); // Contains the data about the request before it is sent.
		$rootScope.loading = true;
		$log.log(config);
		if(config.method=="POST"){
			if(config.data!=null&&config.data!=undefined&&config.data.indexOf("username=") == -1){
				var username =   SharedState.get("temp_username");
				var password =   SharedState.get("temp_password");
				if(username!=null && username!=undefined &&password!=null && password!=undefined){
					config.data += "&username="+username+"&"+"password="+password;
				}	
			}	
		}
        // Return the config or wrap it in a promise if blank.
        return config || $q.when(config);
      },
 
      // On request failure
      requestError: function (rejection) {
        // console.log(rejection); // Contains the data about the error on the request.
		$rootScope.loading = false;
		$log.log(rejection);
        window.plugins.toast.showShortCenter("Unknown Error!"); 
        // Return the promise rejection.
        return $q.reject(rejection);
      },
 
      // On response success
      response: function (response) {
        // console.log(response); // Contains the data from the response.
        $rootScope.loading = false;
		if(response.data.error=="Invalid user name or password" || response.data.error=="Plese Login First" ){
			window.localStorage.clear();
			$location.path("/");
		}
		$log.log(response);
        // Return the response or promise.
        return response || $q.when(response);
      },
 
      // On response failture
      responseError: function (rejection) {
        // console.log(rejection); // Contains the data about the error.
		$rootScope.loading = false;
		$log.log(rejection);
        window.plugins.toast.showShortCenter("Unknown Error!"); 
        // Return the promise rejection.
        return $q.reject(rejection);
      }
    };
  });
// 
// You can configure ngRoute as always, but to take advantage of SharedState location
// feature (i.e. close sidebar on backbutton) you should setup 'reloadOnSearch: false' 
// in order to avoid unwanted routing.
// 
app.config(function($routeProvider,$httpProvider) {
  $httpProvider.interceptors.push('myHttpResponseInterceptor');
  $routeProvider.when('/',              {templateUrl: 'home.html',controller:'LoginController', reloadOnSearch: false});
  $routeProvider.when('/orderlist',        {templateUrl: 'orderlist.html',controller:'ShowOrderListController', reloadOnSearch: false}); 
  $routeProvider.when('/orderdetail/:orderNo',        {templateUrl: 'orderdetail.html', controller:'ShowOrderDetailController',reloadOnSearch: false}); 
  $routeProvider.when('/itemdetail/:itemNo',          {templateUrl: 'itemdetail.html',controller:'ShowItemDetailController', reloadOnSearch: false}); 
  
});
app.run(function ($rootScope, $location) {

    var history = [];

    $rootScope.$on('$routeChangeSuccess', function() {
        history.push($location.path());
		$rootScope.loading = false;
    });

    $rootScope.back = function () {
        var prevUrl = history.length > 1 ? history.splice(-2)[0] : "/";
        $location.path(prevUrl);
    };
  $rootScope.$on('$routeChangeStart', function(){
    $rootScope.loading = true;
  });
  
  $rootScope.logout = function(){
	window.localStorage.clear();
	$location.path("/");
  }

});
//
// For this trivial demo we have just a unique MainController 
// for everything
//
app.controller('MainController', function($rootScope, $scope,$location,$routeParams,SharedState,$http){
  // User agent displayed in home page
  $scope.userAgent = navigator.userAgent;
  $rootScope.isFirstLogin = true;
  $rootScope.showError = function(error){
 	window.plugins.toast.showShortCenter(error);
  }
  $rootScope.UrlEncodingObject = function(dataObject){
        var str = [];
        for(var p in dataObject)
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(dataObject[p]));
        return str.join("&");
  }
  SharedState.initialize($scope,"temp_username");
  SharedState.initialize($scope,"temp_password");
  SharedState.initialize($scope,"temp_rememberMe");
  // Needed for the loading screen
});
app.controller('LoginController', function($rootScope, $scope,$location,$routeParams,SharedState,$http){
  

  $scope.orderList = [];
  
  
  $scope.ini = function(){
	this.rememberMe = true;
	var username = window.localStorage.getItem("username");
	var password = window.localStorage.getItem("password");
	if(username!=null && username!=undefined &&
	password!=null && password!=undefined &&$rootScope.isFirstLogin){
		this.username =   username;
		this.password =   password;
		$rootScope.isFirstLogin = false;
	    $scope.login();
	}
  }
  $scope.isRememberMe = function(){
	return this.rememberMe;
  }
  $scope.login = function() {
		SharedState.set("temp_username", this.username);
		SharedState.set("temp_password", this.password);
		SharedState.set("temp_rememberMe", this.rememberMe);
		$location.path("/orderlist");
  };
  $scope.ini();
});
app.controller('ShowOrderListController', function($rootScope, $scope,$location,$routeParams,SharedState,$http){

  // User agent displayed in home page
  $scope.userAgent = navigator.userAgent;
  $scope.showOrderDetail = function(orderNo){
		$location.path("/orderdetail/"+orderNo);  
  }	
  $scope.$on('orderListReady', function(){
		$scope.orderList=$scope.orderList;	
  });
  $scope.ini = function(){
	  $scope.orderList = $rootScope.orderList;
	  $scope.getOrderList();
  }		
  $scope.getOrderList = function() {
	   
		
		var data = {
          
        };
		
		$http({
			method: 'POST',
			url: 'http://ws.livingstone.com.au/service.asmx/Login',
			headers: {
			'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
			},
			data:$rootScope.UrlEncodingObject(data)
		}).success(function(data, status, headers, config) {
			if(data["error"]==""){
					var rememberMe = window.localStorage.getItem("temp_rememberMe");
					if(rememberMe){
						var username =  SharedState.get("temp_username");
						var password =  SharedState.get("temp_password");
						window.localStorage.setItem("username", username);
						window.localStorage.setItem("password", password);
					}
					else{
						window.localStorage.clear();
					}
    				$scope.orderList = data["orders"];
					$scope.$emit('orderListReady');
					
    		}
    		else {
					$rootScope.showError(data["error"]);
    		}
		});
       
  };  
  $scope.ini();

});
app.controller('ShowOrderDetailController', function($rootScope, $scope,$location,$routeParams,SharedState,$http){

  // User agent displayed in home page
  $scope.userAgent = navigator.userAgent;
  $scope.ini = function(){
	  $scope.orderNo = $routeParams.orderNo;
	  $scope.getOrderDetail($scope.orderNo);
	  $scope.orderLines = $scope.orderLines;
  }	
  $scope.showItemDetail = function(itemNo){
		$location.path("/itemdetail/"+itemNo);  
  }
  $scope.orderLines = [];
  $scope.$on('orderDetailReady', function(){
    $scope.orderLines=$scope.orderLines;
  });
  
  $scope.getOrderDetail = function(orderNo){
	var data = {
          orderNo: orderNo
        };
		$http({
			method: 'POST',
			url: 'http://ws.livingstone.com.au/service.asmx/getOrderDetail',
			headers: {
			'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
			},
			data:$rootScope.UrlEncodingObject(data)
		}).success(function(response){
			if(response["error"]==""){
    				 $scope.orderLines = response["orderlines"];
					 $scope.$emit('orderDetailReady');
    			}
    		else {
    			$rootScope.showError(response["error"]);

    		}
		});
		
       
        
	};
	
	$scope.ini();
  
  
});
app.controller('ShowItemDetailController', function($rootScope, $scope,$location,$routeParams,SharedState,$http){

  // User agent displayed in home page
  $scope.userAgent = navigator.userAgent;

  $scope.ini = function(){
	  $scope.itemNo = $routeParams.itemNo;
	  $scope.getItemDetail($scope.itemNo);
  }	
  $scope.ItemDetail = [];
  $scope.$on('itemDetailReady', function(){
    $scope.ItemDetail=$scope.ItemDetail;
  });
  $scope.getItemDetail = function getItemDetail(ItemNo){
 
	var data = {
          ItemNo: ItemNo
        };
		$http({
			method: 'POST',
			url: 'http://ws.livingstone.com.au/service.asmx/getItemDetail',
			headers: {
			'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
			},
			data:$rootScope.UrlEncodingObject(data)
		}).success(function(response){
			if(response["error"]==""){
    				$scope.ItemDetail = response["ItemDetail"];
					$scope.$emit('itemDetailReady');
    			}
    			else {
    				$rootScope.showError(response["error"]);
    			}
		});
       
  }
		
		
  
  $scope.ini();
});