// Chat adapted from: https://github.com/socketio/socket.io/tree/master/examples/chat
var chatRoom;
var numChatEvent = 0;
var curentlyfocused = 1;

var title = document.title;

function newUpdate() {
    update = setInterval(changeTitle, 2000);
}

// Set up event handler for the window focus event
window.addEventListener("focusin", function(event) 
{ 
    curentlyfocused = 1;
    numChatEvent = 0;
    document.title = title;
}, false);

// Set up event handler for the window blur event
window.addEventListener("focusout", function(event) 
{ 
    curentlyfocused = 0;
    numChatEvent = 0;
}, false);

var docBody = document.getElementById('site-body');
docBody.onload = newUpdate;

function changeTitle() {
    if((numChatEvent>0) && (!curentlyfocused)){
        var newTitle = '(' + numChatEvent + ') ' + title;
        document.title = newTitle;
    }
}

function setRoomForChat(room_input) {
  console.log("[Chat] Room will be", room_input);
  chatRoom=room_input;    
}

$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];  

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();
  

  function addParticipantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    log(message);
  }

  //validate username 
    $('.usernameInput').addClass("red");
    $('.usernameInput').css("border-color", "red");
    redFormInterval = setInterval(function(){ 
      if ($('.usernameInput').hasClass("red")) {
        $('.usernameInput').css("border-color", "transparent"); 
        $('.usernameInput').removeClass("red");
      } else {
        $('.usernameInput').css("border-color", "red"); 
        $('.usernameInput').addClass("red");
      }
    }, 800);
    $('#change-nickname').click(function () {
      setUsername();
      $('#change-nickname').prop("disabled", true);
      clearInterval(redFormInterval);
      $('.usernameInput').css("border-color", "transparent");  
    });
    $('#nickname-form').submit(function () {
      setUsername();
      $('#change-nickname').prop("disabled", true);
      clearInterval(redFormInterval);
      $('.usernameInput').css("border-color", "transparent");
    });


  // Sets the client's username
  function setUsername () {
    username = cleanInput($usernameInput.val().trim());
    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', username);
    }
  }

  // Sends a chat message
  function sendMessage () {
    var message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username.concat(': '),
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new message', ': '.concat(message));
      console.log('Chat message sent: ' + message)
    }
  }

  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addChatMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>&nbsp;')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    var $messageBodyDiv = $(' <span class="messageBody">')
      .text(data.message);

    if(!data.typing)
        numChatEvent++;

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
    $messageDiv.scrollTop = $messageDiv.scrollHeight;
  }

  // Adds the visual chat typing message
  function addChatTyping (data) {
    data.typing = true;
    data.message = ' is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  function removeChatTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
    $('.chatArea').scrollTop($('.chatArea')[0].scrollHeight);
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).html();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    /*if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }*/
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      }
    }
  });

  $inputMessage.on('input', function() {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(function () {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    var message = "Welcome to room #" + chatRoom + " chat " + username;
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });
  
  // Whenever the server emits 'auto-login', auto log with the username message
  socket.on('autoLogin', function (data) {
    console.log(data);
    username = data.username;
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput.val(username)
      $('#change-nickname').prop("disabled", true);
      clearInterval(redFormInterval);
      $('.usernameInput').css("border-color", "transparent");
      connected = true;
      // Display the welcome message
      var message = "Welcome to room #" + chatRoom + " chat " + username;
      log(message, {
        prepend: true
      });
      addParticipantsMessage(data);
    }
  });
  
  socket.on('user change name', function (data) {
    var message = data.oldName + " changed his nickname for " + data.newName;
    log(message)
  });
  
  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', function (data) {
    addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', function (data) {
    log(data.username + ' joined');
    numChatEvent++;
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', function (data) {
    log(data.username + ' left');
    numChatEvent++;
    console.log(data.username + ' left')
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', function (data) {
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', function (data) {
    removeChatTyping(data);
  });

  socket.on('disconnect', function () {
    log('you have been disconnected');
  });

  socket.on('reconnect', function () {
    log('you have been reconnected');
    if (username) {
      socket.emit('add user', username);
    }
  });

  socket.on('reconnect_error', function () {
    log('attempt to reconnect has failed');
  });

});
