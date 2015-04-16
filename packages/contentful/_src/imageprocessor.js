/**
 *	Class for fetching an image stored on Contentful servers, resizing them
 *	and storing them on the local running server.
 *
 *	@class ImageProcessor
 *	@static
 */
ImageProcessor = {

	/**
	 *	Meteor Fiber needed for making async calls
	 */
	Fiber: Npm.require('fibers'),

	/**
	 *	Server side collection to store information about
	 *	processed image assets
	 */
	imageCollection: new Mongo.Collection(CFConfig.processedImageCollectionName),

	/**
	 *	Incoming cursor for existing Contentful assets
	 */
	contentfulAssets: false,

	/**
	 *	Function to iterate through each contentful asset
	 *
	 *	@method 	init
	 */
	init: function() {

		var self = this;

		this.Fiber(function() {
			this.contentfulAssets = Contentful.collections.assets.find({}).fetch();
			_.each(this.contentfulAssets, function(asset) {

				self.saveImagesFromAsset(asset, function(result) {
					console.log(result);
				});

			});
		}).run();
	},

	/**
	 *	Function to process an image, creating resized copies and saving them to disk
	 *
	 *	@method 	saveImageFromAsset
	 *	@param  	{Object} asset - the Conteontful assset 
	 *	@param 		{Object} callback - the callback function on save
	 */
	saveImagesFromAsset: function(asset, callback) {

		var self 		= this,
			assetId 	= asset.sys.id,
			sourceUrl 	= asset.fields.file.url;

		this.readRemoteFileFromUrl(sourceUrl)
		.then(function(result) {

			self.writeFile(result.data, '/var/www/mattfinucane.com', Date.now() + '.jpg');			

		}).fail(function(error) {

			console.log(error);

		});
	},

	/**
	 *	Function to read the contents of a remote resource
	 *
	 *	@method 	readRemoteFileFromUrl
	 *	@param 		{String} url - the url for the resource
	 *	@return  	{Object} - a resolved or rejected promise
	 */
	readRemoteFileFromUrl: function(url) {
		var deferred 	= Q.defer(),
			http 		= Npm.require('http'),
			url 		= 'http:' + url;
		/**
		 *	We need to use the nodejs http module,
		 *	since Meteor HTTP can only deal with 
		 *	String and Json data.
		 */
		var req = http.get(url, function(response) {

			/**
			 *	Buffer to store incoming stream of data
			 */ 
			var buffer = new Buffer('', 'binary');

			/**
			 *	When data comes in, ammend the buffer
			 */
			response.on('data', function(chunk) {	
				buffer = Buffer.concat([buffer, chunk]);
			});

			/**
			 *	If there was an error
			 */
			response.on('error', function(error) {
				deferred.reject({
					status: 'error',
					data: error
				});
			});

			/**
			 *	Download complete
			 */
			response.on('end', function() {
				deferred.resolve({
					status: 'ok',
					data: buffer
				});
			});
		});

		return deferred.promise;
	},

	/**
	 *	Function to write out data to the filesystem
	 *
	 *	@method 	writeFile
	 *	@param   	{Object} data - the data to be written
	 *	@param 		{String} path - the filesystem path
	 *	@param 		{String} name - the filename
	 *	@return 	{Object} a promise resolved or rejected
	 */
	writeFile: function(data, path, name) {

		var deferred 	= Q.defer(),
			fs 			= Npm.require('fs'),
			start 		= Date.now(),
			end; 

		fs.writeFile(path + '/' + name, data, function(error) {
			if(error) {
				deferred.reject({
					status: 'error',
					data: error
				});
			}
			else {
				end = Date.now();
				deferred.resolve({
					status: 'ok',
					data: {
						time: (end - start) + ' milliseconds'
					}
				});
			}
		});

		return deferred.promise;
	}

};
