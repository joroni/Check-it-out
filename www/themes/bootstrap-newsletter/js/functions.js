define( [ 'jquery', 'core/theme-app', 'core/theme-tpl-tags', 'core/modules/storage', 
		  'theme/js/bootstrap.min', 'theme/js/auth/auth-pages', 'theme/js/auth/simple-login', 
		  'theme/js/auth/premium-posts', 'theme/js/comments' , 'theme/js/velocity.min'
		], 
		function( $, App, TemplateTags, Storage, Velocity) {

	var $refresh_button = $( '#refresh-button' );

	/**
	 * Launch app contents refresh when clicking the refresh button :
	 */
	$refresh_button.click( function( e ) {
		e.preventDefault();
		closeMenu();
		App.refresh();
	} );



    /*
     * Actions
     */
    
    // @desc Detect transition types (aka directions) and launch corresponding animations
    App.action( 'screen-transition', function( $wrapper, $current, $next, current_screen, next_screen, $deferred ) {

        // Get the direction keyword from current screen and  previous screen
        var direction = App.getTransitionDirection( current_screen, next_screen );
        
        switch ( direction ) {
            case 'next-screen': // Archive to single
                transition_slide_next_screen( $wrapper, $current, $next, current_screen, next_screen, $deferred );
                break;
            case 'previous-screen': // Single to archive
                transition_slide_previous_screen( $wrapper, $current, $next, current_screen, next_screen, $deferred );
                break;
            case 'default': // Default direction
                transition_default( $wrapper, $current, $next, current_screen, next_screen, $deferred );
                break;
            default: // Unknown direction
                transition_default( $wrapper, $current, $next, current_screen, next_screen, $deferred );
                break;
        }

    });

    
    
    /*
     * Transition animations
     */
    
    // @desc Archive to single animation
	transition_slide_next_screen = function ( $wrapper, $current, $next, current_screen, next_screen, $deferred ) {

        $wrapper.append($next); // Add the next screen to the DOM / Mandatory first action (notably to get scrollTop() working)

        // When transitioning from a list, memorize the scroll position in local storage to be able to find it when we return to the list
        if (current_screen.screen_type == "list") {
            Storage.set( "scroll-pos", current_screen.fragment, $current.scrollTop() ); // Memorize the current scroll position in local storage
        }

        // 1. Prepare next screen (the destination screen is not visible. We are before the animation)
        
        // Hide the single screen on the right
        $next.css({
			left: '100%'
		});

        // 2. Animate to display next screen
        
		// Slide screens wrapper from right to left
        $wrapper.velocity({
            left: '-100%'
        },{
            duration: 300,
            easing: 'ease-out',
            complete: function () {
                
                // remove the screen that has been transitioned out
				$current.remove();

				// remove CSS added specically for the transition
				$wrapper.attr( 'style', '' );

				$next.css({
				    left: '',
				});
                
				$deferred.resolve(); // Transition has ended, we can pursue the normal screen display steps (screen:showed)
            }
        });
	}

    // @desc Single to archive animation
	transition_slide_previous_screen = function ( $wrapper, $current, $next, current_screen, next_screen, $deferred ) {

        $wrapper.prepend($next); // Add the next screen to the DOM / Mandatory first action (notably to get scrollTop() working)
        
        // 1. Prepare next screen (the destination screen is not visible. We are before the animation)

        // Hide the archive screen on the left
		$next.css( {
			left: '-100%'
		} );

        // If a scroll position has been memorized in local storage, retrieve it and scroll to it to let user find its former position when he/she left
        if (next_screen.screen_type == "list") {
            var pos = Storage.get( "scroll-pos", next_screen.fragment );
            if (pos !== null) {
                $next.scrollTop(pos);
            } else {
                $next.scrollTop(0);
            }
        }

        // 2. Animate to display next screen

		// Slide screens wrapper from left to right
		$wrapper.velocity({
            left: '100%'
        },{
            duration: 300,
            easing: 'ease-out',
			complete: function () {

                // remove the screen that has been transitioned out
                $current.remove();

				// remove CSS added specically for the transition
                $wrapper.attr( 'style', '' );

                $next.css( {
                    left: '',
                } );
                
                $deferred.resolve(); // Transition has ended, we can pursue the normal screen display steps (screen:showed)
            }
        });
	}

    // @desc Default animation
    // Also used when the direction is unknown
	transition_default = function ( $wrapper, $current, $next, current_screen, next_screen, $deferred ) {
		
		// Simply replace current screen with the new one
        $current.remove();
		$wrapper.empty().append( $next );
		$deferred.resolve();
        
	};


	iaEvent = "click";
	if (typeof navigator !== "undefined" && navigator.app) {
	   iaEvent = "tap";
	}
	$('.ext-link').each.bind(iaEvent, function() {
		if (typeof navigator !== "undefined" && navigator.app) {
			// Mobile device.
			var linktarget = this.attr("href");
			navigator.app.loadUrl(linktarget, {openExternal: true});
		} else {
			// Possible web browser
			window.open(linktarget, "_blank");
		}
	});






	/**
	 * Animate refresh button when the app starts refreshing
	 */
	App.on( 'refresh:start', function() {
		$refresh_button.addClass( 'refreshing' );
	} );

	/**
	 * When the app stops refreshing :
	 * - scroll to top
	 * - stop refresh button animation
	 * - display success or error message
	 *
	 * Callback param : result : object {
	 *		ok: boolean : true if refresh is successful,
	 *		message: string : empty if success, error message if refresh fails,
	 *		data: object : empty if success, error object if refresh fails :
	 *					   use result.data to get more info about the error
	 *					   if needed.
	 * }
	 */
	App.on( 'refresh:end', function( result ) {
		scrollTop();
		Storage.clear( 'scroll-pos' );
		$refresh_button.removeClass( 'refreshing' );
		if ( result.ok ) {
			$( '#feedback' ).removeClass( 'error' ).html( 'Updated successfully!' ).slideDown();
		} else {
			$( '#feedback' ).addClass( 'error' ).html( result.message ).slideDown();
		}
	} );

	/**
	 * When an error occurs, display it in the feedback box
	 */
	App.on( 'error', function( error ) {
		$( '#feedback' ).addClass( 'error' ).html( error.message ).slideDown();
	} );

	/**
	 * Hide the feedback box when clicking anywhere in the body
	 */
	$( 'body' ).click( function( e ) {
		$( '#feedback' ).slideUp();
	} );

	/**
	 * Back button 
	 */
	var $back_button = $( '#go-back' );
	
	//Show/Hide back button (in place of refresh button) according to current screen:
	App.on( 'screen:showed', function () {
		var display = App.getBackButtonDisplay();
		if ( display === 'show' ) {
			$refresh_button.hide();
			$back_button.show();
		} else if ( display === 'hide' ) {
			$back_button.hide();
			$refresh_button.show();
		}
	} );

	//Go to previous screen when clicking back button:
	$back_button.click( function ( e ) {
		e.preventDefault();
		App.navigateToPreviousScreen();
	} );

	/**
	 * Allow to click anywhere on post list <li> to go to post detail :
	 */
	$( '#container' ).on( 'click', 'li.media', function( e ) {
		e.preventDefault();
		var navigate_to = $( 'a', this ).attr( 'href' );
		App.navigate( navigate_to );
	} );

	/**
	 * Close menu when we click a link inside it.
	 * The menu can be dynamically refreshed, so we use "on" on parent div (which is always here):
	 */
	$( '#navbar-collapse' ).on( 'click', 'a', function( e ) {
		closeMenu();
	} );

	/**
	 * Open all links inside single content with the inAppBrowser
	 */
	$( "#container" ).on( "click", ".single-content a, .page-content a", function( e ) {
		e.preventDefault();
		openWithInAppBrowser( e.target.href );
	} );

	$( "#container" ).on( "click", ".comments", function( e ) {
		e.preventDefault();
		
		$('#waiting').show();
		
		App.displayPostComments( 
			$(this).attr( 'data-post-id' ),
			function( comments, post, item_global ) {
				//Do something when comments display is ok
				//We hide the waiting panel in 'screen:showed'
			},
			function( error ){
				//Do something when comments display fail (note that an app error is triggered automatically)
				$('#waiting').hide();
			}
		);
	} );

	/**
	 * "Get more" button in post lists
	 */
	$( '#container' ).on( 'click', '.get-more', function( e ) {
		e.preventDefault();
		
		var $this = $( this );
		
		var text_memory = $this.text();
		$this.attr( 'disabled', 'disabled' ).text( 'Loading...' );

		App.getMoreComponentItems( 
			function() {
				//If something is needed once items are retrieved, do it here.
				//Note : if the "get more" link is included in the archive.html template (which is recommended),
				//it will be automatically refreshed.
				$this.removeAttr( 'disabled' );
			},
			function( error, get_more_link_data ) {
				$this.removeAttr( 'disabled' ).text( text_memory );
			}
		);
	} );

	/**
	 * Do something before leaving a screen.
	 * Here, if we're leaving a post list, we memorize the current scroll position, to
	 * get back to it when coming back to this list.
	 */
	App.on( 'screen:leave', function( current_screen, queried_screen, view ) {
		//current_screen.screen_type can be 'list','single','page','comments'
		if ( current_screen.screen_type == 'list' ) {
			Storage.set( 'scroll-pos', current_screen.fragment, $( 'body' ).scrollTop() );
		}
	} );

	/**
	 * Do something when a new screen is showed.
	 * Here, if we arrive on a post list, we resore the scroll position
	 */
	App.on( 'screen:showed', function( current_screen, view ) {
		//current_screen.screen_type can be 'list','single','page','comments'
		if ( current_screen.screen_type == 'list' ) {
			var pos = Storage.get( 'scroll-pos', current_screen.fragment );
			if ( pos !== null ) {
				$( 'body' ).scrollTop( pos );
			} else {
				scrollTop();
			}
		} else {
			scrollTop();
		}
		
		if ( current_screen.screen_type == 'comments' ) {
			$('#waiting').hide();
		}
		
	} );

	/**
	 * Example of how to react to network state changes :
	 */
	
	 App.on( 'network:online', function(event) {
	 $( '#feedback' ).removeClass( 'error' ).html( "Internet connexion ok :)" ).slideDown();
	 } );
	 
	 App.on( 'network:offline', function(event) {
	 $( '#feedback' ).addClass( 'error' ).html( "Internet connexion lost :(" ).slideDown();
	 } );
	

	/**
	 * Manually close the bootstrap navbar
	 */
	function closeMenu() {
		var navbar_toggle_button = $( ".navbar-toggle" ).eq( 0 );
		if ( !navbar_toggle_button.hasClass( 'collapsed' ) ) {
			navbar_toggle_button.click();
		}
	}

	/**
	 * Get back to the top of the screen
	 */
	function scrollTop() {
		window.scrollTo( 0, 0 );
	}

	/**
	 * Opens the given url using the inAppBrowser
	 */
	function openWithInAppBrowser( url ) {
		window.open( url, "_blank", "location=yes" );
	}

} );