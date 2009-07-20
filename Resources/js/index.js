// define global object
TiDev = {};

// list of load perspectives
TiDev.Perspectives = [];

// track what has been viewed - used to determine whether to call 'load' or 'focus'
TiDev.viewedModules = {};
TiDev.viewedPerspectives = {};

// number of modules and perspectives
TiDev.moduleCount = 0;
TiDev.perspectiveCount = 0;

// global db var
TiDev.db = Titanium.Database.open("TiDeveloper");

// track active perspective and subtab
TiDev.activePerspective = {};
TiDev.activeSubtab = {};

// generic message for non-authenticated cloud requests
TiDev.cloudRequestRejected = 'Cloud Authentication Failed.  Make sure you are on-line';

// global notification object
TiDev.notification = Titanium.Notification.createNotification(window)

// android SDK dir
TiDev.androidSDKDir = null;

// feedback service name
TiDev.feedbackURL = 'user-feedback';

// user permissions
TiDev.permissions = {};

// user attributes
TiDev.attributes = {};

//
// Helper function for loading module and perspective JS and CSS
//
TiDev.loadResourceFiles = function(array,rootDir)
{
	var head = document.getElementsByTagName("head")[0];         

	// load module JS files and CSS files
	for (var i=0;i<array.length;i++)
	{
		// JS
		var jsFile = Titanium.Filesystem.getFile(array[i],'js',  array[i].name() + '.js');
		if (jsFile.exists())
		{
			var jsEl = document.createElement('script');
			jsEl.type = 'text/javascript';
			jsEl.src =  rootDir + '/' + array[i].name() + '/js/' + array[i].name() + '.js';
			head.appendChild(jsEl);
		}
		
		// CSS
		var cssFile =  Titanium.Filesystem.getFile(array[i],'css',  array[i].name() + '.css');
		if (cssFile.exists())
		{
			var cssEl = document.createElement('link');
			cssEl.rel = "stylesheet";
			cssEl.href =  rootDir + '/' + array[i].name() + '/css/' + array[i].name() + '.css';
			cssEl.type = 'text/css';
			head.appendChild(cssEl);
		}
	}
};

//
// Register a persepective
//
TiDev.registerPerspective = function(options)
{
	// add to list, then sort based on index
	TiDev.Perspectives.push(options);
	TiDev.Perspectives.sort(TiDev.sortArray);
	
	//
	// Re-process all existing perspectives
	//
	var perspectiveTabs = [];
	var perspectiveActiveImgs = [];
	var activePerspective = -1;
	var imageTitles = [];

	// loop through configured perspectives
	for (var i=0;i<TiDev.Perspectives.length;i++)
	{
		// get image information
		perspectiveTabs.push(TiDev.Perspectives[i].image);
		perspectiveActiveImgs.push(TiDev.Perspectives[i].activeImage);
		imageTitles.push(TiDev.Perspectives[i].imageTitle);
		// if active, load subtabs and initial page
		if (TiDev.Perspectives[i].active == true)
		{
			// set active perspective
			activePerspective = i;

			// on fire change if all are loaded
			if (TiDev.perspectiveCount == TiDev.Perspectives.length)
			{
				TiDev.perspectiveChange(i);
			}
		}
	}

	// add perspective button bar
	TiDev.perspectiveTabs.configure({
		id:'tiui_perspective_bar',
		tabs: perspectiveTabs,
		imageTitles: imageTitles,
		active: activePerspective,
		activeImages:perspectiveActiveImgs,
		title:'Perspectives',
		tabOrButton:'tab'
	});
	
	// setup perspective listener
	TiDev.perspectiveTabs.addListener(function(idx)
	{
		// fire perspective change
		TiDev.perspectiveChange(idx);
	});
};

//
//  Register a module
//
TiDev.registerModule = function(options)
{
	TiDev.moduleCount++;
	
	var perspectives = options.perspectives;

	// find matching perspective for module
	for (var i=0;i<TiDev.Perspectives.length;i++)
	{
		// loop through modules perspectives
		for (var j=0;j<perspectives.length;j++)
		{
			// if match then add to perspective
			if (TiDev.Perspectives[i].name == perspectives[j])
			{
				// add
				TiDev.Perspectives[i].views.push(options);

				// sort current views by idx
				TiDev.Perspectives[i].views.sort(TiDev.sortArray);

				// if perspective is active and module is active then show
				if (TiDev.Perspectives[i].name == TiDev.activePerspective.name)
				{
					// reconfigure subtabs since visible
					var subtabs = [];
					var activeIdx = -1;

					for (var j=0;j<TiDev.Perspectives[i].views.length;j++)
					{
						subtabs.push(TiDev.Perspectives[i].views[j].displayName);
						if (TiDev.Perspectives[i].views[j].active==true)
						{
							activeIdx = j;
						}
					}

					// set tabs
					if (activeIdx != -1)
					{
						TiDev.subtabs.configure({
							tabs:subtabs,
							active:activeIdx
						});
						TiDev.subtabChange(activeIdx);
					}
					else
					{
						TiDev.subtabs.configure({
							tabs:subtabs
						});
					}

					// setup subtab listener
					TiDev.subtabs.addListener(function(idx)
					{
						TiDev.subtabChange(idx);
					});	
				}
			}			
		}
	}
};

//
//  Execute Perspective Change
//
TiDev.perspectiveChange = function(idx)
{
	if (TiDev.activePerspective.callback)
	{
		TiDev.activePerspective.callback('blur');

		if (TiDev.activeSubtab.callback)
		{
			TiDev.activeSubtab.callback('blur')
		}
	}
	TiDev.activePerspective = TiDev.Perspectives[idx];

	var subtabs = [];
	var fireLoad = false;

	if (TiDev.viewedPerspectives[TiDev.activePerspective.name] != true)
	{
		fireLoad = true;
	}
	
	var activeIdx = -1;

	// see if perspective has sub tabs
	if (TiDev.activePerspective.views)
	{
		for (var j=0;j< TiDev.activePerspective.views.length;j++)
		{
			subtabs.push(TiDev.activePerspective.views[j].displayName);
			
			// look for active tab
			if (TiDev.activePerspective.views[j].active == true)
			{
				activeIdx = j;
				TiDev.subtabChange(j);
			}
		}

		// add subtabs tabs
		if (activeIdx != -1)
		{
			TiDev.subtabs.configure({
				active:activeIdx,
				tabs:subtabs
			});
		}
		else
		{
			TiDev.subtabs.configure({
				tabs:subtabs
			});
		}

		// setup subtab listener
		TiDev.subtabs.addListener(function(idx)
		{
			TiDev.subtabChange(idx);
		});	

		// show subtabs	
		TiDev.subtabs.show();

	}
	// otherwise hide subtabs
	else
	{
		TiDev.subtabs.hide();
	}

	// show start page if exists
	if (TiDev.activePerspective.html && activeIdx == -1)
	{
		var file = Titanium.Filesystem.getFile(Titanium.App.appURLToPath('perspectives/' + TiDev.activePerspective.name + '/'+ TiDev.activePerspective.html));
		$('#tiui_content_right').get(0).innerHTML = file.read();	
	}

	if (TiDev.activePerspective.callback)
	{
		if (fireLoad==true && TiDev.viewedPerspectives[TiDev.activePerspective.name] != true)
		{
			TiDev.activePerspective.callback('load');
			TiDev.viewedPerspectives[TiDev.activePerspective.name] = true;
		}
		else
		{
			TiDev.activePerspective.callback('focus');
		}
	}
};

//
//  Execute Subtab Change
//
TiDev.subtabChange = function(idx)
{
	// call blur on 
	if (TiDev.activeSubtab.callback)
	{
		TiDev.activeSubtab.callback('blur')
	}
	TiDev.activeSubtab = TiDev.activePerspective.views[idx];
	
	// reset active flag to false for all views
	for (var i=0;i<TiDev.activePerspective.views.length;i++)
	{
		TiDev.activePerspective.views[i].active = false;
	}
	// set active flag on tab view
	TiDev.activePerspective.views[idx].active = true;
	
	var fireLoad =false;
	if (TiDev.viewedModules[TiDev.activeSubtab.name]!=true)
	{
		fireLoad =true;
	}

	var file = Titanium.Filesystem.getFile(Titanium.App.appURLToPath('modules/' + TiDev.activeSubtab.name + '/' +TiDev.activeSubtab.html));
	$('#tiui_content_right').get(0).innerHTML = file.read();
	
	if (fireLoad==true && TiDev.viewedModules[TiDev.activeSubtab.name]!=true)
	{
		if (TiDev.activeSubtab.callback)
		{
			TiDev.viewedModules[TiDev.activeSubtab.name]=true;
			TiDev.activeSubtab.callback('load');
		}
	}
	else
	{
		if (TiDev.activeSubtab.callback)
		{
			TiDev.activeSubtab.callback('focus');
		}
	}
	
	// ensure tab ui state is active
	TiDev.subtabs.activate(idx);
};

//
// Used by non-perspective or subtab views to go back to last view state
//
TiDev.goBack = function()
{
	TiDev.perspectiveChange(TiDev.activePerspective.idx);
}

//
// Initialize UI
//
TiDev.init = function()
{
	// initialize main UI areas
	TiDev.contentLeft = new TiUI.ContentLeft();
	TiDev.perspectiveTabs = new TiUI.GreyButtonBar();
	TiDev.subtabs = new TiUI.MainTab();
	TiDev.subtabs.hide();

	TiDev.contentLeftHideButton = new TiUI.GreyButtonBar();
	TiDev.contentLeftShowButton = new TiUI.GreyButtonBar();
	TiDev.messageArea = new TiUI.MessageArea();
		
	//
	// setup left content hide/show buttons
	//
	
	// add button for hiding tree
	TiDev.contentLeftHideButton.configure({
		id:'tiui_drawer_button_hide',
		tabs:['images/hide_drawer.png'],
		imageTitles:['Hide Left Content'],
		tabOrButton:'button',
		imageOffset:'5px'
	});

	// hide button listener
	TiDev.contentLeftHideButton.addListener(function()
	{
		$('#tiui_drawer_button_show').css('display','block');
		$('#tiui_drawer_button_hide').css('display','none');		
		TiDev.contentLeft.hide(true);
		$MQ('l:tidev_content_left',{action:'hide'});
	});

	// add button for showing tree
	TiDev.contentLeftShowButton.configure({
		id:'tiui_drawer_button_show',
		tabs:['images/open_drawer.png'],
		imageTitles:['Show Left Content'],		
		tabOrButton:'button',
		imageOffset:'5px'
	});

	// show button listener
	TiDev.contentLeftShowButton.addListener(function()
	{
		$('#tiui_drawer_button_show').css('display','none');
		$('#tiui_drawer_button_hide').css('display','block');		
		TiDev.contentLeft.show(true);
		$MQ('l:tidev_content_left',{action:'show'});
		
	});
	
	// hide by default
	TiDev.contentLeftShowButton.hide();
	TiDev.contentLeftHideButton.hide();
	
	// setup default message area
	TiDev.showDefaultSystemMessage();

	// load perspectives 
	var perspectivesDir  = Titanium.Filesystem.getFile(Titanium.App.appURLToPath('app://perspectives'));
	var perspectives = perspectivesDir.getDirectoryListing();
	for (var i=0;i<perspectives.length;i++)
	{
		if (perspectives[i].isDirectory() == true)
		{
			TiDev.perspectiveCount++;
		}
	}

	TiDev.loadResourceFiles(perspectives, 'perspectives');
	
	// load modules
	var modulesDir  = Titanium.Filesystem.getFile(Titanium.App.appURLToPath('app://modules'));
	var modules = modulesDir.getDirectoryListing();
	var moduleCount = 0;
	for (var i=0;i<modules.length;i++)
	{
		if (modules[i].isDirectory() == true)
		{
			moduleCount++;
		}
	}
	
	// don't load modules until perspectives are loaded
	var interval = setInterval(function()
	{
		if (TiDev.perspectiveCount == TiDev.Perspectives.length)
		{
			$MQ('l:tidev.perspectives.loaded');
			TiDev.loadResourceFiles(modules, 'modules');
			clearInterval(interval);
		}		
	},50);
	
	var moduleInterval = setInterval(function()
	{
		if (moduleCount == TiDev.moduleCount)
		{
			$MQ('l:tidev.modules.loaded');
			clearInterval(moduleInterval);
		}		
	},50);
};

//
// Register for Titanium Developer Updates
//
Titanium.UpdateManager.onupdate = function(details)
{
	TiDev.messageArea.setCollapsedWidth('390px');
	TiDev.messageArea.setDefaultMessage('New Titanium Developer available (version ' + details.version + '). <span id="sdk_download_link" style="text-decoration:underline">Click to download</span>',
	function()
	{
		$('#sdk_download_link').click(function()
		{
			TiDev.messageArea.setMessage('Installing new Titanium Developer...');

			// call this method to cause the app to restart and install
			Titanium.UpdateManager.installAppUpdate(details, function()
			{
				TiDev.showDefaultSystemMessage();
			});
		});
	});
	TiDev.messageArea.showDefaultMessage();
};

//
// Register SDK Update listeners
//
Titanium.UpdateManager.startMonitor(['sdk','mobilesdk'],function(details)
{
	switch(details.guid)
	{
		// mobile
		case "05645B49-C629-4D8F-93AF-F1CF83200E34":
		{
			TiDev.showSDKAvailableMessage(Titanium.API.MOBILESDK,'Mobile',details);
			break;
		}
		// desktop
		case "FF71038E-3CD6-40EA-A1C2-CFEE1D284CEA":
		{
			TiDev.showSDKAvailableMessage(Titanium.API.SDK,'Desktop',details);
			break;
		}
	}
});

//
// show SDK available message
//
TiDev.showSDKAvailableMessage = function(type,msg, details)
{
	TiDev.messageArea.setCollapsedWidth('390px');
	TiDev.messageArea.setDefaultMessage('New ' + msg + ' SDK available (version ' + details.version + '). <span id="sdk_download_link" style="text-decoration:underline">Click to download</span>',
	function()
	{
		$('#sdk_download_link').click(function()
		{
			if (type == Titanium.API.SDK)
			{
				var children = details.children;
				if (children)
				{
					var ar = [Titanium.API.createDependency(type,details.name,details.version)];
					for (var i=0;i<children.length;i++)
					{
						var t = Titanium.API.componentGUIDToComponentType(children[i].guid);
						ar.push(Titanium.API.createDependency(t,children[i].name,children[i].version));
					}
					Titanium.UpdateManager.install(ar,function()
					{
						TiDev.showDefaultSystemMessage();
					});
				}
			}
			else
			{	
				Titanium.UpdateManager.install([Titanium.API.createDependency(type,details.name,details.version)], function()
				{
					TiDev.showDefaultSystemMessage();
				});
			}
			TiDev.messageArea.setMessage('Installing new '+msg+' SDK...');
		});
			
	});
	TiDev.messageArea.showDefaultMessage();
	
};

//
// show default system message
//
TiDev.showDefaultSystemMessage = function()
{
	TiDev.messageArea.setCollapsedWidth('60px');
	TiDev.messageArea.setDefaultMessage('<img style="position:relative;top:5px" src="images/message_logo.png"/>');
	TiDev.messageArea.showDefaultMessage();
};

//
// Create UI
// 
$(document).ready(function()
{
	// initialize UI
	TiDev.init();
	
	// hide/show top-level controls based on window size
	Titanium.UI.currentWindow.addEventListener(function(event)
	{
		if(event == 'resized')
		{
			var size = Titanium.UI.currentWindow.getWidth();
			var messageWidth = $('#tiui_message_area').width();
			if ((size - messageWidth) < 390)
			{
				$('#tiui_message_area').css('display','none');
			}
			else
			{
				$('#tiui_message_area').css('display','block');
			}
			if (size < 360)
			{
				$('#tiui_action_button_bar').css('display','none');
			}
			else
			{
				$('#tiui_action_button_bar').css('display','block');
			}
		}
	});
	
	//
	// Logout Link Handler
	//
	$('#tiui_shield_on').click(function()
	{
		var answer = confirm("Are you sure you want to logout?");
		if (answer)
		{
			TiDev.db.execute('DELETE FROM USERS');
			Titanium.App.exit();
		}
	});
	
	//
	// check initial network status
	//
	if (Titanium.Network.online == true)
	{
		$('#tiui_signal_on').css('display','inline');
		$('#tiui_signal_off').css('display','none');
	}
	else
	{
		$('#tiui_signal_off').css('display','inline');
		$('#tiui_signal_on').css('display','none');
	}
	
	//
	// feedback handler
	// 
	$('#feedback_button').click(function()
	{
		var win = Titanium.UI.createWindow('app://feedback.html');
		win.setHeight(300);
		win.setWidth(430);
		win.setResizable(false);
		win.open();
		setTimeout(function()
		{
		    win.window.init(TiDev);

		},300);
		
	});
	
	// set title
	document.title = "Titanium Developer (" + Titanium.App.getVersion() + ")";
});


////////////////////////////////////////////////////////////////////////
//
//
// COMMON FUNCTIONS 
//
//
///////////////////////////////////////////////////////////////////////

//
// Show notification window
//
TiDev.showNotification = function(title, msg, success)
{
	var img = (success==true)?'app://images/information.png':'app://images/error.png';
	
	TiDev.notification.setTitle(title);
	TiDev.notification.setMessage(msg);
	TiDev.notification.setIcon(img);
	TiDev.notification.show();
};

//
// Helper function for sorting perspectives and modules based on their index
//
TiDev.sortArray = function(a,b)
{
	if (a.idx > b.idx)return 1;
	return -1;
};

//
// check for Authentication
//
TiDev.isAuthenticated = function()
{
	//FIXME - you can't use these
	
	if ((Projects.userSID != null) &&
		(Projects.userToken != null) &&
		(Projects.userUID != null) &&
		(Projects.userUIDT != null))
	{
		return true;
	}
	else
	{
		return false;
	}
};

// track when first online called
TiDev.onlineListenerFired = false;
//
// add network connnectivity listener
//
Titanium.Network.addConnectivityListener(function(online)
{
	TiDev.onlineListenerFired  = true;
	$MQ('l:tidev.netchange',{online:online});
	if (online == false)
	{
		$('#tiui_signal_off').css('display','inline');
		$('#tiui_signal_on').css('display','none');
		
	}
	else
	{
		$('#tiui_signal_on').css('display','inline');
		$('#tiui_signal_off').css('display','none');
	}
});

//
// Generic Cloud Service Handler
// if you are authenticated, then call
// otherwise, we try to authenticate you 
//
TiDev.invokeCloudService = function(name,data,type,sCallback,fCallback)
{	
	// if offline, don't attempt
	if (Titanium.Network.online == false)
	{
		$('#tiui_cloud_on').css('display','none');
		$('#tiui_cloud_off').css('display','inline');
		if (typeof(fCallback) == 'function')
		{
			fCallback({offline:true});
		}
		return;
	}

	var url = Titanium.App.getStreamURL(name);
	var type = (type)?type:'POST';

	if (typeof(data)=='undefined')
	{
		data = {};
	}
	
	// always pass MID
	data.mid = Titanium.Platform.id;
	
	// set timeout low if the online event hasn't fired and we are logging (should only happen once)
	var timeout = (name == 'sso-login' && !Titanium.Network.online && TiDev.onlineListenerFired==false)?800:10000;
	
	// xhr auth (for packaging services)
	function xhrAuth(data)
	{
		var url = Titanium.App.getStreamURL("sso-login");	
		var qs = '';
		for (var p in data)
		{
			var v = typeof(data[p])=='undefined' ? '' : String(data[p]);
			qs+=p+'='+encodeURIComponent(v)+'&';
		}
		// this is asynchronous
		var xhr = Titanium.Network.createHTTPClient();
		xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');
		xhr.open("POST",url);
		xhr.send(qs);	
	};

	// function to run service request once authenticated
	function runIt()
	{
		data.sid = Projects.userSID;
		data.token = Projects.userToken;
		data.uid = String(Projects.userUID);
		data.uidt = Projects.userUIDT;
		$.ajax({
			url:url,
			type:type,
			dataType:'json',
			timeout:timeout,
			data:data,
			success:function(resp)
			{
				// toggle cloud status
				$('#tiui_cloud_on').css('display','inline');
				$('#tiui_cloud_off').css('display','none');
				// execute callback
				if (typeof(sCallback) == 'function')
				{
					sCallback(resp);
				}
				
				// do xhr auth for packaging service
				if (name == 'sso-login')
				{
					xhrAuth(data);
				}
			},
			error:function(resp,ex)
			{
				// toggle cloud state
				$('#tiui_cloud_on').css('display','none');
				$('#tiui_cloud_off').css('display','inline');

				// execute callback
				if (typeof(fCallback) == 'function')
				{
					fCallback({resp:resp,offline:true});
				}
			}
		});	
	};

	// we are good, run the request
	if (TiDev.isAuthenticated() == true || name == 'sso-login' || name == 'sso-register')
	{
		runIt();
	}
	else
	{
		// try to login
		var u = Titanium.App.getStreamURL('sso-login');
		var d = {mid:Titanium.Platform.id};
		
		// do we already have the email/password
		if (UserProfile.email && UserProfile.password)
		{
			d.un = UserProfile.email;
			d.pw = UserProfile.password;
		}
		// try to look it up
		else
		{
			var dbrow = TiDev.db.execute('SELECT email, password from USERS');
			while (dbrow.isValidRow())
			{
				d.un  = dbrow.fieldByName('email');
				d.pw  = dbrow.fieldByName('password');
				break;
			}			
		}

		// try to login
		$.ajax({
			url:u,
			type:'POST',
			dataType:'json',
			timeout:10000,
			data:d,
			success:function(resp)
			{
				// we are logged in, so run request
				if (resp.success == true)
				{		
					// record tokens
					
					//FIXME - these are only good for 12 hours and during the login -JGH
					Projects.userSID = resp.sid;
					Projects.userToken = resp.token;
					Projects.userUID = resp.uid;
					Projects.userUIDT = resp.uidt;
					
					TiDev.permissions  = resp.permissions;
					TiDev.attributes = resp.attributes;	
					
					UserProfile.updateUser(d.un,TiDev.attributes);				
					
					// toggle login status
					$('#tiui_shield_off').css('display','none');
					$('#tiui_shield_on').css('display','inline');
					
					// auth for xhr
					xhrAuth(d);
		
					runIt();
					return;
				}
				else
				{
					$('#tiui_shield_on').css('display','none');
					$('#tiui_shield_off').css('display','inline');
					TiDev.setConsoleMessage(TiDev.cloudRequestRejected,5000);
				}
			},
			error:function(resp)
			{
				// toggle login status
				$('#tiui_shield_on').css('display','none');
				$('#tiui_shield_off').css('display','inline');
				TiDev.setConsoleMessage(TiDev.cloudRequestRejected,5000);
			}
		});
	}
};

//
// Helper function to format a url
//
TiDev.makeURL = function(base,params)
{
	var url = base;
	if (params)
	{
		url = url + '?';
		for (var p in params)
		{
			url+=encodeURIComponent(p)+'='+encodeURIComponent(String(params[p])) + "&";
		}
	}
	return url.substring(0,(url.length-1));
};

//
// Analytics wrapper
//
TiDev.track = function(name,data)
{
	data = (typeof(data)!='undefined') ? swiss.toJSON(data) : null;
	Titanium.Analytics.addEvent(name,data);
};

//
// Convert date
//
TiDev.convertDate = function(str)
{
	var parts = str.split(':');
	var hour = parseInt(parts[0]);
	var minutes = parts[1];
	var ampm = 'am';
	if (hour > 12)
	{
		hour = hour - 12;
		ampm = 'pm';
	}
	else if (hour == 0)
	{
		hour = 12;
	}
	return hour + ":" + minutes + ampm;
};

//
// Format date for packaging
//
TiDev.formatPackagingDate = function(str)
{
	var parts = str.split(' ');
	var time = TiDev.convertDate(parts[1]);
	var date = parts[0].split('-');
	return date[1] + '/' + date[2] + '/' + date[0] + ' ' + time;
};

//
// Set top-level message
//
TiDev.setConsoleMessage = function(message,delay)
{
	TiDev.messageArea.expand();
	TiDev.messageArea.setMessage(message);
	if (delay)
	{
		setTimeout(function()
		{
			TiDev.messageArea.collapse();
			TiDev.messageArea.showDefaultMessage();
		},delay);
	}
};

//
// return console to default state
//
TiDev.resetConsole = function()
{
	TiDev.messageArea.collapse();
	TiDev.messageArea.showDefaultMessage();
};

//
// Get current time
//
TiDev.getCurrentTime = function()
{
	var curDateTime = new Date();
  	var curHour = curDateTime.getHours();
  	var curMin = curDateTime.getMinutes();
  	var curAMPM = "am";
  	var curTime = "";
  	if (curHour >= 12)
	{
    	curHour -= 12;
    	curAMPM = "pm";
    }
  	if (curHour == 0) curHour = 12;
  	curTime = curHour + ":" + ((curMin < 10) ? "0" : "") + curMin + curAMPM;
  	return curTime;
};

//
// Generic GSUB routing
//
$.extend(
{
	gsub:function(source,pattern,replacement)
	{
		if (typeof(replacement)=='string')
		{
			var r = String(replacement);
			replacement = function()
			{
				return r;
			}
		}
	 	var result = '', match;
	    while (source.length > 0) 
		{
	      	if (match = source.match(pattern)) 
		  	{
				result += source.slice(0, match.index);
	        	result += String(replacement(match));
	        	source  = source.slice(match.index + match[0].length);
	      	} 
			else 
			{
	        	result += source, source = '';
	      	}
	    }
		return result;
	}
});

// these are not all the TLDs but most of the popular ones
TiDev.TLD = /\.(com|com\.uk|gov|org|net|mil|name|co\.uk|biz|info|edu|tv|mobi)/i;
TiDev.URI_REGEX = /((([hH][tT][tT][pP][sS]?|[fF][tT][pP])\:\/\/)?([\w\.\-]+(\:[\w\.\&%\$\-]+)*@)?((([^\s\(\)\<\>\\\"\.\[\]\,@;:]+)(\.[^\s\(\)\<\>\\\"\.\[\]\,@;:]+)*(\.[a-zA-Z]{2,4}))|((([01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}([01]?\d{1,2}|2[0-4]\d|25[0-5])))(\b\:(6553[0-5]|655[0-2]\d|65[0-4]\d{2}|6[0-4]\d{3}|[1-5]\d{4}|[1-9]\d{0,3}|0)\b)?((\/[^\/][\w\.\,\?\'\\\/\+&%\$#\=~_\-@]*)*[^\.\,\?\"\'\(\)\[\]!;<>{}\s\x7F-\xFF])?)/;

String.prototype.trim = function()
{
	return this.replace(/^\s*/,"").replace(/\s*$/,"");
};

//
// Format urls to include ti:systembrowser target in order to launch external browser
//
TiDev.formatURIs = function(str)
{	
	return $.gsub(str,TiDev.URI_REGEX,function(m)
	{
		var x = m[0];
		
		if (!TiDev.TLD.test(x) || x.indexOf('@') != -1)
		{
			return x;
		}
				
		if (x.indexOf('http://') == -1)
		{
			x = "http://" + x;
		}
		return '<a target="ti:systembrowser" href="' + x + '">' +x + '</a>';
	})
	
};

TiDev.launchPython = function(args)
{
	var process = null;
	console.log(args);
	
	if (Titanium.platform == "win32") {
		args.unshift("python.exe");
		/*scriptArgs.push('"'+script+'"');
		for (var i = 0; i < args.length; i++) {
			var arg = args[i];
			if (args[i].substring(0,1) != '"') {
				arg = '"' + arg + '"';
			}
			scriptArgs.push(arg);
		}*/
	}
	return Titanium.Process.createProcess(args);
};
