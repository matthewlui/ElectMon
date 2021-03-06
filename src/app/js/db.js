/**
 * @module db
 * 
 * @description Angular controller, db data management interface
 * 
 * @todo add each count on collections list.
 * @todo add loading indicator when loading data.
 * @todo add dragging target to eval.
 * @todo add collection
 * @todo insert doc to collection
 */

'use strict';
const electron = require('electron').remote;
const {ipcRenderer} = require('electron');
const Mongoose = require('mongoose');

var ngApp = angular.module('electmongo', ['ngRoute', "ngMaterial", "ngAnimate"]);
ngApp.config(function ($mdThemingProvider) {
    $mdThemingProvider.theme('default')
        .primaryPalette('light-green');
    //  .primaryPalette('pink')
    //  .accentPalette('orange');
    $mdThemingProvider.theme('alt-dark')
        .primaryPalette('blue');
});

ngApp.controller('dbCtrl', function ($scope) {

    $scope.db_name = "Connecting";
    $scope.docLoader = new DocLoader();
    $scope.collections = [];
    $scope.logs = [];
    $scope.commandBox = "";
    $scope.selectedRow = 0;
    $scope.selectedCol = 0;
    ipcRenderer.on('db-connect', function (event, data) {
        if (!data) return;
        var mongoUrl = "mongodb://";
        mongoUrl = data.username ? `${mongoUrl}${data.username}` : mongoUrl;
        mongoUrl = data.password ? `${mongoUrl}:${data.password}` : mongoUrl;
        if (mongoUrl === "mongodb://") {
            mongoUrl = data.ip ? mongoUrl + data.ip : mongoUrl;
        } else {
            mongoUrl = data.ip ? `${mongoUrl}@${data.ip}` : mongoUrl;
        }
        mongoUrl = data.port ? `${mongoUrl}:${data.port}` : mongoUrl;
        mongoUrl = data.name ? `${mongoUrl}/${data.name}` : mongoUrl;
        $scope.db = data;
        try {
            $scope.db.connection = Mongoose.createConnection(mongoUrl, function () {
                $scope.config();
            });
        } catch (err) {
            console.log(err);
        }
    });

    $scope.config = function () {
        var db = $scope.db;
        var mgdb = Mongoose.connection.db;
        $scope.collections = []; // cleanup existing collections' name;
        db.connection.db.listCollections().toArray(function (err, names) {
            if (err) {
                return electron.dialog(err);
            }
            var collections = [];
            names.forEach(function (name) {
                collections.push(name);
            });
            $scope.$apply(function () {
                $scope.collections = collections;
                $scope.db_name = db.name;
            });
        });
    };

    $scope.useCollection = function (index) {
        var collection = $scope.collections[index];
        $scope.collection = $scope.db.connection.db.collection(collection.name);
        $scope.collection.find({}, function (err, docs) {
            docs.toArray().then(function (d) {
                $scope.$apply(function () {
                    $scope.keys = keysLister(d);
                    $scope.docLoader = new DocLoader(d);
                });
            });
        });
    };

    $scope.execCommand = function () {
        var cmd = $scope.commandBox;
        var db = $scope.db;
        var mg = Mongoose;
        var re = eval(cmd);
        $scope.logs.push(re);
    };
    $scope.use = function(index,key){
        $scope.edited();
        var doc = $scope.docLoader.getItemAtIndex(index);
        $scope.edit = {doc:doc,key:key,index:index};
    };
    $scope.edited = function(){
        if (!$scope.edit) return;
        var collection = $scope.collection;
        var doc = $scope.edit.doc;
        collection.updateOne({_id:doc._id},doc,function(err,doc){
            console.log("updated",err,doc);
        });
        /** @todo save update of edited model */
    };

});

/** 
 *  @constructor DocLoader
 *  
 *  @description Object that conform to md-virtual-repeat requirement.
 *  @param collection {Array.Object}
 *   
 */
var DocLoader = function (collection) {
    this.collection = collection;
};


/**
 * @param  {Number} index 
 * @return {Object} object of collection
 */
DocLoader.prototype.getItemAtIndex = function (index) {
    return this.collection[index];
};
/**
 * @return {number} length of collection.
 */
DocLoader.prototype.getLength = function () {
    if (!this.collection) {
        return 0;
    }
    return this.collection.length;
};

/** @todo */
DocLoader.prototype.orderBy = function(key){

};

/** 
 * @param {Array.Object} docs Array of mongoDb document
 * @returns {Array.String} Individual keys that all object contains 
 */
function keysLister(docs){
    var keysSet = new Set();
    for ( var index in docs){
        Object.keys(docs[index]).forEach(key=>keysSet.add(key));
    }
    return [...keysSet];
}