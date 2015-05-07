Meteor.startup(function() {
	if(Meteor.isClient) {
		/**
		 *	Set up the client side Mongo collections
		 */
		App = {
			collections: {
				cf_entries: new Mongo.Collection('cf_entries'),
				cf_assets: new Mongo.Collection('cf_assets'),
				mf_images: new Mongo.Collection('mf_images'),
				gh_commits: new Mongo.Collection('gh_commits')
			}	
		};

		/**
		 *	Kick off the Depencencies for reactivity
		 */
		Dependencies.start();
	}
	if(Meteor.isServer) {
		
		Contentful.fetchAndPopulate().then(function(result) {
			/**
			 *	Once content is fetched and stored in the 
			 *	server side collections, we can publish it 
			 *	in here. We loop through each configured 
			 *	content type and publish a collection 
			 *	using its name
			 */
			_.each(CFConfig.contentTypes, function(contentType) {
				/**
				 *	Give the name of the collection the same name as 
				 *	the content type name and also use it as a filter
				 *	parameter.
				 */
				Meteor.publish(contentType.name, function() {
					console.log('Publishing:', contentType.name);
					return Contentful.collections.entries.find({'contentTypeName': contentType.name});
				});
			});

			/**
			 *	Publish the contentful assets collection, which we will need to
			 *	source the resized images later.
			 */
			Meteor.publish('cf_assets', function() {
				console.log('Publishing: assets');
				return Contentful.collections.assets.find({});
			});

			/**
			 *	When the app is booted, we need to process the images
			 *	from the Contentful source
			 */
			ImageProcessor.init();

			/**
			 *	Publish the image collection
			 */
			Meteor.publish(CFConfig.processedImageCollectionName, function() {
				console.log('Publishing: images');
				return ImageProcessor.imageCollection.find({});
			});

			/**
			 *	Then we listen for incoming changes from Contentful,
			 *	which will automatically update client side collections.
			 */
			Contentful.listenForContentChanges();

		}).fail(function(error) {
			console.log(error.message);
		});

		/**
		 *	Fetch public events data from Github
		 *	and then publish the collection for these.
		 */
		GitHub.fetchAndPopulate('events').then(function() {
			/**
			 *	Publish GitHub entries, filtering out only those that 
			 *	are less than six days old.
			 */
			Meteor.publish('gh_commits', function() {	
				console.log('Publishing: Github commits');	
				var from = moment().subtract(6, 'days').toDate().getTime();
				return GitHub.collections.commits.find({created_at_ts: {$gte: from}});
			});

			/**
			 *	Listen for incoming activity from Github
			 */
			GitHub.listenForContentChanges();

		}).fail(function() {
			console.log('Failed to fetch GitHub data');
		});

		Meteor.methods({
			'clearCommits': function() {
				console.log('Clear the commits');
				GitHub.collections.commits.remove({});
			}
		});
	}
});