/*
 *  stick-it - v1.0.0
 *  A jquery plugin for sticky elements.
 *  
 *
 *  Made by Bruno Fenzl
 *  Under MIT License
 */
;(function ( $, window, document, undefined ) {

	'use strict';

		//Polyfill for requestAnimationFrame
		//https://gist.github.com/paulirish/1579671
		// (function() {
		//     var lastTime = 0;
		//     var vendors = ['ms', 'moz', 'webkit', 'o'];
		//     for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
		//         window.requestAnimationFrame 	= window[vendors[x]+'RequestAnimationFrame'];
		//         window.cancelAnimationFrame 	= window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
		//     }
		 
		//     if (!window.requestAnimationFrame)
		//         window.requestAnimationFrame = function(callback, element) {
		//             var currTime = new Date().getTime();
		//             var timeToCall = Math.max(0, 16 - (currTime - lastTime));
		//             var id = window.setTimeout(function() { 
		//             	callback(currTime + timeToCall); 
		//             }, timeToCall);
		//             lastTime = currTime + timeToCall;
		//             return id;
		//         };
		 
		//     if (!window.cancelAnimationFrame)
		//         window.cancelAnimationFrame = function(id) {
		//             clearTimeout(id);
		//         };
		// }());

		// Create the private defaults once
		var pluginName 	= 'JStick',
			defaults 	= {
				context		: window,
				dockBottom	: true,
				offsetTop	: 0,
				offsetBottom: 0
			};


		function bind(context, name){
			return function(){
				return context[name].apply(context, arguments);
			};
		}

		// The actual plugin constructor
		function JStick ( element, options ) {
			this.element = element;
			// jQuery has an extend method which merges the contents of two or
			// more objects, storing the result in the first object. The first object
			// is generally empty as we don't want to alter the default options for
			// future instances of the plugin
			this.settings 		= $.extend( {}, defaults, options );
			this._defaults 		= defaults;
			this._name 			= pluginName;
			this.settings.parent= this.element.parentElement;
			this.settings.vendorTransform = buildTransformStr();

			this.ticking 		= false;
			this.elGeom 		= this.getGeomInDocument(this.element);
			this.parentGeom		= this.getGeomInDocument(this.settings.parent);
			this.dockedTop  	= false;
			this.dockedBottom	= false;
			this.timer 			= 0;
			this.transY 		= 0;
			this.init();
			//console.log(this.elGeom, this.parentGeom);
		}

		function buildTransformStr(){
			var d 		= document.createElement('div');
			var test 	= (d.style.transform != undefined)?'transform':
							(d.style.webkitTransform != undefined)?'webkitTransform':
								(d.style.mozTransform != undefined)?'mozTransform':
									(d.style.msTransform != undefined)?'msTransform':false
			d.remove()
			return test;
		}

		//http://stackoverflow.com/questions/5916900/how-can-you-detect-the-version-of-a-browser
		function getBrowserInfo(){
		    var ua 	= navigator.userAgent,
		    	M 	= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [],
		    	tem; 
		    
		    if(/trident/i.test(M[1])){
		        tem=/\brv[ :]+(\d+)/g.exec(ua) || []; 
		        return {name:'IE',version:(tem[1]||'')};
		    }   
		    
		    if(M[1]==='Chrome'){
		        tem=ua.match(/\bOPR\/(\d+)/);
		        if(tem!=null) {return {name:'Opera', version:tem[1]};}
		    }   
		    
		    M=M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
		    if((tem=ua.match(/version\/(\d+)/i))!=null){
		    	M.splice(1,1,tem[1]);
		    }
		    return {
		      	name: M[0],
		      	version: M[1]
		    };
		}

		function render(t){
			//console.log('distance to top: ',t.getScrollOffsets().y, 'elGeom + offset:', t.elGeom.y - t.settings.offsetTop);
			t.transY = t.getScrollOffsets().y - t.elGeom.y + t.settings.offsetTop;

			//check if element passed its designated offset from top
			if(t.getScrollOffsets().y >= t.elGeom.y - t.settings.offsetTop){
				//t.transY = t.elGeom.y - t.settings.offsetTop;

				if(!t.dockedTop){
					t.dockTop();
					//console.log('new dock');
					//assure the element dock precisely
					//t.element.style[t.settings.vendorTransform] = 'translateY(' + t.elGeom.y - t.settings.offsetTop + 'px)';
				}
			}else{
				t.transY = 0; //t.elGeom.y - t.settings.offsetTop;
				if(t.dockedTop) t.undockTop();
			}
			
			//check if element reached the bottom of its container
			if(t.elGeom.y + t.elGeom.h + t.transY >= t.parentGeom.y + t.parentGeom.h){
				t.transY = (t.parentGeom.y + t.parentGeom.h) - (t.elGeom.y + t.elGeom.h);
				if(!t.dockedBottom){
					t.dockBottom();
					console.log('new dockbottom');
					//assure the element dock precisely
					//t.element.style[t.settings.vendorTransform] = 'translateY(' + (t.parentGeom.y + t.parentGeom.h) - (t.elGeom.y + t.elGeom.h) + 'px)';
				}
			}else{
				if(t.dockedBottom) t.undockBottom();
			}	

			//if(t.dockedTop && !t.dockedBottom) 
			t.element.style[t.settings.vendorTransform] = 'translateY(' + t.transY + 'px)';

			if(t.ticking){
				requestAnimationFrame(function(){
					render(t);
				});
			}
		}

		// Avoid JStick.prototype conflicts
		$.extend(JStick.prototype, {
			init: function () {
				console.log('init', this.settings);
				//this.element.style[this.settings.vendorTransform] = 'translate3d(0, 0, 0)';
				$(this.settings.context).on('scroll', bind(this, 'onScroll'));
				//console.log(getBrowserInfo().name, getBrowserInfo().version);
			},
			getPosInViewport: function(el){
				return (el || this.element).getBoundingClientRect();
			},
			getGeomInDocument: function(el){
				var box 	= this.getPosInViewport(el);
				var offsets = this.getScrollOffsets();

				return  {
							x: box.left + offsets.x, 
							y: box.top + offsets.y,
							w: box.width || (box.right - box.left),
							h: box.height || (box.bottom - box.top)
						};
			},
			getScrollOffsets: function(w){
				//Use the specified container or the current window if no argument
				w = this.settings.context;

				//All Browser and IE9+
				//if(w.pageXOffset != null) 

				return {x: w.pageXOffset, y: w.pageYOffset};

				// var d = w.document;
				// //Any Browser including IE in STandards mode
				// if(document.compatMode === 'CSS1Compat') {
				// 	return {x: d.documentElement.scrollLeft, y:d.documentElement.scrollTop};
				// }

				// //For browsers in QuirksMode
				// return {x: d.body.scrollLeft, y: d.body.scrollTop};

			},
			getViewportSize: function(w){
				//Use the specified container or the current window if no argument
				w = this.settings.context;

				//All Browser and IE9+
				//if(w.innerWidth != null) 
				return {w: w.innerWidth, h: w.innerHeight};

				// var d = w.document;
				// //Any Browser including IE in STandards mode
				// if(document.compatMode === 'CSS1Compat'){
				// 	return {w: d.documentElement.clientWidth, h: d.documentElement.clientHeight};
				// }

				// //For browsers in QuirksMode
				// return {w: d.body.clientWidth, h: d.body.clientHeight};
			},
			dockTop: function(){
				//console.log('dockTop');
				this.dockedTop = true;
				$(this.element).trigger(pluginName + ':dockTop');
			},
			undockTop: function(){
				//console.log('undockTop');
				//this.element.removeAttribute('style');
				this.dockedTop = false;
				$(this.element).trigger(pluginName + ':undockTop');
			},
			dockBottom: function(){
				//console.log('dockBottom');
				this.dockedBottom = true;
				$(this.element).trigger(pluginName + ':dockBottom');
			},
			undockBottom: function(){
				//console.log('undockBottom');
				this.dockedBottom = false;
				$(this.element).trigger(pluginName + ':undockBottom');
			},
			onScroll: function(){
				
				if(!this.ticking){
					var t 		= this;
					t.ticking 	= true;
					console.log('scroll tick');
					//requestAnimationFrame(bind(this, 'loop'));
					requestAnimationFrame(function(){
						//console.log('render this', t);
						render(t);
					});
				}

				clearTimeout(this.timer);
				this.timer = setTimeout(function(){
					this.ticking = false;
					console.log('timeout');
				}, 300);

			},
			loop: function(){
				//console.log('distance to top: ',this.getScrollOffsets().y, 'elGeom + offset:', this.elGeom.y - this.settings.offsetTop);
				this.transY = this.getScrollOffsets().y - this.elGeom.y + this.settings.offsetTop;

				//check if element passed its designated offset from top
				if(this.getScrollOffsets().y >= this.elGeom.y - this.settings.offsetTop){
					//this.transY = this.elGeom.y - this.settings.offsetTop;

					if(!this.dockedTop){
						this.dockTop();
						//console.log('new dock');
						//assure the element dock precisely
						//this.element.style[this.settings.vendorTransform] = 'translateY(' + this.elGeom.y - this.settings.offsetTop + 'px)';
					}
				}else{
					this.transY = 0; //this.elGeom.y - this.settings.offsetTop;
					if(this.dockedTop) this.undockTop();
				}
				
				//check if element reached the bottom of its container
				if(this.elGeom.y + this.elGeom.h + this.transY >= this.parentGeom.y + this.parentGeom.h){
					this.transY = (this.parentGeom.y + this.parentGeom.h) - (this.elGeom.y + this.elGeom.h);
					if(!this.dockedBottom){
						this.dockBottom();
						console.log('new dockbottom');
						//assure the element dock precisely
						//this.element.style[this.settings.vendorTransform] = 'translateY(' + (this.parentGeom.y + this.parentGeom.h) - (this.elGeom.y + this.elGeom.h) + 'px)';
					}
				}else{
					if(this.dockedBottom) this.undockBottom();
				}	

				//if(this.dockedTop && !this.dockedBottom) 
				this.element.style[this.settings.vendorTransform] = 'translateY(' + this.transY + 'px)';
			},
			destroy: function(){

			}
		});

		// A really lightweight plugin wrapper around the constructor,
		// preventing against multiple instantiations
		$.fn[ pluginName ] = function ( options ) {
			return this.each(function() {
				if ( !$.data( this, 'plugin_' + pluginName ) ) {
						$.data( this, 'plugin_' + pluginName, new JStick( this, options ) );
				}
			});
		};

})( jQuery, window, document );
